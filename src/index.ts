import { loadConfig } from "./config.js";
import { loadWatermarks, saveWatermarks } from "./watermark.js";
import { createClient } from "./graphql/client.js";
import { pollJuiceSwap } from "./pollers/juiceswap.js";
import { pollJuiceDollar } from "./pollers/juicedollar.js";
import { sendAlerts, sendTelegramMessage } from "./telegram.js";
import { createHealthStats, logHealthIfDue } from "./health.js";
import type { Alert } from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = loadConfig();

  console.log("[monitor] Starting Juice Protocol Monitor");
  console.log(`[monitor] JuiceSwap:    ${config.juiceswapGraphqlUrl}`);
  console.log(`[monitor] JuiceDollar:  ${config.juicedollarGraphqlUrl}`);
  console.log(`[monitor] Poll interval: ${config.pollIntervalMs}ms`);
  console.log(`[monitor] Init mode:     ${config.initMode}`);

  const juiceswapClient = createClient(config.juiceswapGraphqlUrl);
  const juicedollarClient = createClient(config.juicedollarGraphqlUrl);

  let watermarks = await loadWatermarks(config.watermarkPath, config.initMode);
  console.log("[monitor] Watermarks loaded");

  const health = createHealthStats();

  // Send startup message to Telegram
  const startupMsg =
    `<b>Juice Monitor Started</b>\n\n` +
    `JuiceSwap: ${config.juiceswapGraphqlUrl}\n` +
    `JuiceDollar: ${config.juicedollarGraphqlUrl}\n` +
    `Poll interval: ${config.pollIntervalMs / 1000}s\n` +
    `Init mode: ${config.initMode}`;
  await sendTelegramMessage(config.telegramBotToken, config.telegramChatId, startupMsg);

  // Graceful shutdown
  let running = true;
  const shutdown = () => {
    console.log("\n[monitor] Shutting down...");
    running = false;
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

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

    // Collect alerts and watermark updates
    if (swapResult) {
      allAlerts.push(...swapResult.alerts);
      Object.assign(watermarks, swapResult.watermarkUpdates);
    }
    if (dollarResult) {
      allAlerts.push(...dollarResult.alerts);
      Object.assign(watermarks, dollarResult.watermarkUpdates);
    }

    // Sort: URGENT first, then IMPORTANT
    const tierOrder: Record<string, number> = { URGENT: 0, IMPORTANT: 1 };
    allAlerts.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);

    if (allAlerts.length > 0) {
      console.log(`[monitor] Sending ${allAlerts.length} alerts (${allAlerts.filter((a) => a.tier === "URGENT").length} urgent)`);
      const failures = await sendAlerts(config.telegramBotToken, config.telegramChatId, allAlerts);
      health.alertsSent += allAlerts.length;
      health.errors.telegram += failures;

      // Save watermarks after successful send
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
