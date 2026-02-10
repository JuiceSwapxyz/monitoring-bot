import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock dotenv/config to prevent it from loading .env files during tests
vi.mock("dotenv/config", () => ({}));

import { loadConfig } from "./config.js";

describe("loadConfig", () => {
  let savedEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    savedEnv = { ...process.env };
    // Set required vars to dummy values by default
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "test-chat-id";
    process.env.JUICESWAP_GRAPHQL_URL = "https://test.juiceswap.com/graphql";
    process.env.JUICEDOLLAR_GRAPHQL_URL = "https://test.juicedollar.com/graphql";
    // Clear optional vars so they use defaults
    delete process.env.POLL_INTERVAL_MS;
    delete process.env.CITREA_EXPLORER_URL;
    delete process.env.WATERMARK_PATH;
  });

  afterEach(() => {
    process.env = savedEnv;
  });

  // ---- validatePollInterval ----

  describe("validatePollInterval", () => {
    it("accepts valid poll interval", () => {
      process.env.POLL_INTERVAL_MS = "30000";
      const config = loadConfig();
      expect(config.pollIntervalMs).toBe(30000);
    });

    it("accepts boundary value of 1000", () => {
      process.env.POLL_INTERVAL_MS = "1000";
      const config = loadConfig();
      expect(config.pollIntervalMs).toBe(1000);
    });

    it("throws for value below minimum (999)", () => {
      process.env.POLL_INTERVAL_MS = "999";
      expect(() => loadConfig()).toThrow("Invalid POLL_INTERVAL_MS");
    });

    it("throws for non-numeric value", () => {
      process.env.POLL_INTERVAL_MS = "abc";
      expect(() => loadConfig()).toThrow("Invalid POLL_INTERVAL_MS");
    });

    it("defaults to 30000 when not set", () => {
      const config = loadConfig();
      expect(config.pollIntervalMs).toBe(30000);
    });
  });

  // ---- Required vars ----

  describe("required environment variables", () => {
    it("throws when TELEGRAM_BOT_TOKEN is missing", () => {
      delete process.env.TELEGRAM_BOT_TOKEN;
      expect(() => loadConfig()).toThrow("TELEGRAM_BOT_TOKEN");
    });

    it("throws when TELEGRAM_CHAT_ID is missing", () => {
      delete process.env.TELEGRAM_CHAT_ID;
      expect(() => loadConfig()).toThrow("TELEGRAM_CHAT_ID");
    });

    it("throws when JUICESWAP_GRAPHQL_URL is missing", () => {
      delete process.env.JUICESWAP_GRAPHQL_URL;
      expect(() => loadConfig()).toThrow("JUICESWAP_GRAPHQL_URL");
    });

    it("throws when JUICEDOLLAR_GRAPHQL_URL is missing", () => {
      delete process.env.JUICEDOLLAR_GRAPHQL_URL;
      expect(() => loadConfig()).toThrow("JUICEDOLLAR_GRAPHQL_URL");
    });
  });
});
