import "dotenv/config";
import type { Config } from "./types.js";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export function loadConfig(): Config {
  return {
    telegramBotToken: requireEnv("TELEGRAM_BOT_TOKEN"),
    telegramChatId: requireEnv("TELEGRAM_CHAT_ID"),
    juiceswapGraphqlUrl: optionalEnv(
      "JUICESWAP_GRAPHQL_URL",
      "https://dev.ponder.juiceswap.com/graphql"
    ),
    juicedollarGraphqlUrl: optionalEnv(
      "JUICEDOLLAR_GRAPHQL_URL",
      "https://dev.ponder.juicedollar.com/graphql"
    ),
    pollIntervalMs: validatePollInterval(optionalEnv("POLL_INTERVAL_MS", "30000")),
    citreaExplorerUrl: optionalEnv(
      "CITREA_EXPLORER_URL",
      "https://citreascan.com"
    ),
    watermarkPath: optionalEnv("WATERMARK_PATH", ".watermarks.json"),
    initMode: validateInitMode(optionalEnv("INIT_MODE", "now")),
  };
}

function validatePollInterval(value: string): number {
  const ms = parseInt(value, 10);
  if (isNaN(ms) || ms < 1000) {
    throw new Error(`Invalid POLL_INTERVAL_MS: "${value}". Must be a number >= 1000.`);
  }
  return ms;
}

function validateInitMode(value: string): "now" | "genesis" {
  if (value !== "now" && value !== "genesis") {
    throw new Error(`Invalid INIT_MODE: "${value}". Must be "now" or "genesis".`);
  }
  return value;
}
