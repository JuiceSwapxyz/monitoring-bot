import type { Alert } from "./types.js";
import { sleep } from "./utils.js";

const TELEGRAM_API = "https://api.telegram.org";
const MAX_RETRIES = 3;
const RETRY_BASE_MS = 1000;
const FETCH_TIMEOUT_MS = 30_000;
const MAX_RATE_LIMIT_WAIT_MS = 60_000;
const MAX_MESSAGE_LENGTH = 4096;
// Telegram rate limit: ~30 messages per second to a group
const SEND_DELAY_MS = 100;

export function truncateMessage(text: string): string {
  if (text.length <= MAX_MESSAGE_LENGTH) return text;
  return text.slice(0, MAX_MESSAGE_LENGTH - 15) + "\n\n[truncated]";
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  silent: boolean = false
): Promise<boolean> {
  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;

  let attempt = 0;
  let rateLimitWaitMs = 0;
  while (attempt < MAX_RETRIES) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: truncateMessage(text),
          parse_mode: "HTML",
          disable_web_page_preview: true,
          disable_notification: silent,
        }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (res.ok) return true;

      // Rate limited — retry without consuming attempt budget
      if (res.status === 429) {
        const body = (await res.json().catch(() => ({}))) as { parameters?: { retry_after?: number } };
        const retryAfter = body.parameters?.retry_after ?? 5;
        const waitMs = retryAfter * 1000;
        rateLimitWaitMs += waitMs;
        if (rateLimitWaitMs > MAX_RATE_LIMIT_WAIT_MS) {
          console.error(`[telegram] Rate limit wait exceeded ${MAX_RATE_LIMIT_WAIT_MS}ms, giving up`);
          return false;
        }
        console.warn(`[telegram] Rate limited, retrying after ${retryAfter}s`);
        await sleep(waitMs);
        continue;
      }

      const errText = await res.text();
      console.error(`[telegram] Send failed (${res.status}): ${errText}`);
    } catch (err) {
      console.error(`[telegram] Send error (attempt ${attempt + 1}):`, err);
    }

    attempt++;
    if (attempt < MAX_RETRIES) {
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    }
  }

  return false;
}

export async function sendAlerts(
  botToken: string,
  chatId: string,
  alerts: Alert[]
): Promise<number> {
  let failures = 0;
  for (const alert of alerts) {
    const success = await sendTelegramMessage(botToken, chatId, alert.message, alert.silent);
    if (!success) {
      console.error(`[telegram] Failed to send alert for ${alert.eventType}`);
      failures++;
    }
    // Small delay between messages to avoid rate limiting
    if (alerts.length > 1) {
      await sleep(SEND_DELAY_MS);
    }
  }
  return failures;
}
