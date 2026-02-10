import { loadConfig } from "./config.js";
import { loadWatermarks, saveWatermarks } from "./watermark.js";
import { createClient } from "./graphql/client.js";
import { pollJuiceSwap } from "./pollers/juiceswap.js";
import { pollJuiceDollar } from "./pollers/juicedollar.js";
import { sendAlerts, sendTelegramMessage } from "./telegram.js";
import { createHealthStats, logHealthIfDue } from "./health.js";
import { sleep } from "./utils.js";
import type { Alert, EventType } from "./types.js";

async function main() {
  const config = loadConfig();

  console.log("[monitor] Starting Juice Protocol Monitor");
  console.log(`[monitor] JuiceSwap:    ${config.juiceswapGraphqlUrl}`);
  console.log(`[monitor] JuiceDollar:  ${config.juicedollarGraphqlUrl}`);
  console.log(`[monitor] Poll interval: ${config.pollIntervalMs}ms`);

  const juiceswapClient = createClient(config.juiceswapGraphqlUrl);
  const juicedollarClient = createClient(config.juicedollarGraphqlUrl);

  // Graceful shutdown — registered before catch-up so Ctrl+C works during catch-up
  let running = true;
  const shutdown = () => {
    console.log("\n[monitor] Shutting down...");
    running = false;
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  const { watermarks, isFirstRun } = await loadWatermarks(config.watermarkPath);
  console.log("[monitor] Watermarks loaded");

  // Catch-up phase: on first run, poll all history and log to console only
  if (isFirstRun) {
    console.log("[catchup] First run detected — catching up on historical events...");
    let cycleNum = 0;
    let totalEvents = 0;
    const totalByType: Partial<Record<EventType, number>> = {};

    while (running) {
      cycleNum++;
      const allAlerts: Alert[] = [];

      const [swapResult, dollarResult] = await Promise.all([
        pollJuiceSwap(juiceswapClient, watermarks, config.citreaExplorerUrl).catch(
          (err) => {
            console.error("[catchup] JuiceSwap poll failed:", err instanceof Error ? err.message : err);
            return null;
          }
        ),
        pollJuiceDollar(juicedollarClient, watermarks, config.citreaExplorerUrl).catch(
          (err) => {
            console.error("[catchup] JuiceDollar poll failed:", err instanceof Error ? err.message : err);
            return null;
          }
        ),
      ]);

      if (swapResult) {
        allAlerts.push(...swapResult.alerts);
        Object.assign(watermarks, swapResult.watermarkUpdates);
      }
      if (dollarResult) {
        allAlerts.push(...dollarResult.alerts);
        Object.assign(watermarks, dollarResult.watermarkUpdates);
      }

      if (allAlerts.length === 0) break;

      // Tally counts per event type
      for (const alert of allAlerts) {
        totalByType[alert.eventType] = (totalByType[alert.eventType] || 0) + 1;
      }
      totalEvents += allAlerts.length;

      console.log(`[catchup] Cycle ${cycleNum}: ${allAlerts.length} events processed`);

      // Save watermarks after each cycle for crash resilience
      try {
        await saveWatermarks(config.watermarkPath, watermarks);
      } catch (err) {
        console.error("[catchup] Failed to save watermarks:", err instanceof Error ? err.message : err);
      }

      // Throttle between catch-up cycles to avoid hammering GraphQL endpoints
      await sleep(2000);
    }

    if (totalEvents > 0) {
      console.log(`[catchup] Complete: ${totalEvents} historical events across ${cycleNum - 1} cycles`);
      console.log("[catchup] Breakdown:");
      for (const [eventType, count] of Object.entries(totalByType)) {
        console.log(`  ${eventType}: ${count}`);
      }
    } else {
      console.log("[catchup] Complete: no historical events found");
    }
  }

  // If shut down during catch-up, save and exit early
  if (!running) {
    await saveWatermarks(config.watermarkPath, watermarks);
    console.log("[monitor] Goodbye.");
    return;
  }

  const health = createHealthStats();

  // Send startup message to Telegram
  const startupMsg =
    `<b>Juice Monitor Started</b>\n\n` +
    `JuiceSwap: ${config.juiceswapGraphqlUrl}\n` +
    `JuiceDollar: ${config.juicedollarGraphqlUrl}\n` +
    `Poll interval: ${config.pollIntervalMs / 1000}s`;
  await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, startupMsg, true);

  while (running) {
    const cycleStart = Date.now();
    const allAlerts: Alert[] = [];

    // Poll both endpoints in parallel
    const [swapResult, dollarResult] = await Promise.all([
      pollJuiceSwap(juiceswapClient, watermarks, config.citreaExplorerUrl).catch(
        (err) => {
          console.error("[monitor] JuiceSwap poll failed:", err instanceof Error ? err.message : err);
          health.errors.juiceswap++;
          return null;
        }
      ),
      pollJuiceDollar(juicedollarClient, watermarks, config.citreaExplorerUrl).catch(
        (err) => {
          console.error("[monitor] JuiceDollar poll failed:", err instanceof Error ? err.message : err);
          health.errors.juicedollar++;
          return null;
        }
      ),
    ]);

    // Track successful polls
    if (swapResult || dollarResult) {
      health.lastSuccessfulPoll = Date.now();
    }

    // Collect alerts and pending watermark updates (don't mutate watermarks yet)
    const pendingWatermarkUpdates: Partial<Record<EventType, string>> = {};
    if (swapResult) {
      allAlerts.push(...swapResult.alerts);
      Object.assign(pendingWatermarkUpdates, swapResult.watermarkUpdates);
      health.errors.juiceswap += swapResult.queryFailures;
    }
    if (dollarResult) {
      allAlerts.push(...dollarResult.alerts);
      Object.assign(pendingWatermarkUpdates, dollarResult.watermarkUpdates);
      health.errors.juicedollar += dollarResult.queryFailures;
    }

    // Send alerts and only advance watermarks for event types with zero failures
    let failedEventTypes = new Set<string>();
    if (allAlerts.length > 0) {
      console.log(`[monitor] Sending ${allAlerts.length} alerts`);
      const result = await sendAlerts(config.telegramBotToken, config.telegramChatId, allAlerts);
      failedEventTypes = result.failedEventTypes;
      health.alertsSent += allAlerts.length - result.failures;
      health.errors.telegram += result.failures;
    }

    // Apply only watermark updates for event types that had no delivery failures
    for (const [eventType, value] of Object.entries(pendingWatermarkUpdates)) {
      if (!failedEventTypes.has(eventType)) {
        watermarks[eventType as EventType] = value;
      }
    }

    // Save watermarks every cycle, not just when alerts exist
    if (swapResult || dollarResult) {
      try {
        await saveWatermarks(config.watermarkPath, watermarks);
      } catch (err) {
        console.error("[monitor] Failed to save watermarks:", err instanceof Error ? err.message : err);
      }
    }

    // Health logging
    logHealthIfDue(health);

    const elapsed = Date.now() - cycleStart;
    const waitTime = Math.max(0, config.pollIntervalMs - elapsed);
    if (waitTime > 0 && running) {
      await sleep(waitTime);
    }
  }

  // Final save on shutdown
  await saveWatermarks(config.watermarkPath, watermarks);
  console.log("[monitor] Goodbye.");
}

main().catch((err) => {
  console.error("[monitor] Fatal error:", err);
  process.exit(1);
});
