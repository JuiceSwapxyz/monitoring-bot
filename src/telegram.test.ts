import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { truncateMessage, sendTelegramMessage, sendAlerts } from "./telegram.js";
import type { Alert } from "./types.js";

// ---- truncateMessage boundary precision ----

describe("truncateMessage", () => {
  it("returns text unchanged when below 4096", () => {
    const text = "a".repeat(4095);
    expect(truncateMessage(text)).toBe(text);
    expect(truncateMessage(text).length).toBe(4095);
  });

  it("returns text unchanged when exactly 4096", () => {
    const text = "a".repeat(4096);
    expect(truncateMessage(text)).toBe(text);
    expect(truncateMessage(text).length).toBe(4096);
  });

  it("truncates text above 4096 with suffix", () => {
    const text = "a".repeat(4097);
    const result = truncateMessage(text);
    expect(result.length).toBeLessThanOrEqual(4096);
    expect(result).toContain("[truncated]");
  });
});

// ---- sendTelegramMessage ----

describe("sendTelegramMessage", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function okResponse() {
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }

  function rateLimitResponse(retryAfter?: number) {
    const body = retryAfter !== undefined
      ? { parameters: { retry_after: retryAfter } }
      : {};
    return Promise.resolve(new Response(JSON.stringify(body), { status: 429 }));
  }

  function errorResponse(status: number) {
    return Promise.resolve(new Response("Internal Server Error", { status }));
  }

  // Test 2: 429 rate limits do NOT consume retry budget
  it("retries through 429s without exhausting retry budget", async () => {
    mockFetch
      .mockReturnValueOnce(rateLimitResponse(0))
      .mockReturnValueOnce(rateLimitResponse(0))
      .mockReturnValueOnce(rateLimitResponse(0))
      .mockReturnValueOnce(okResponse());

    const promise = sendTelegramMessage("token", "chat", "hello");
    // Advance through the three 429 sleeps (0s each) and let microtasks resolve
    await vi.advanceTimersByTimeAsync(1000);
    const result = await promise;

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  // Test 3: Non-429 errors exhaust retry budget
  it("returns false after exhausting retries on non-429 errors", async () => {
    mockFetch
      .mockReturnValueOnce(errorResponse(500))
      .mockReturnValueOnce(errorResponse(500))
      .mockReturnValueOnce(errorResponse(500));

    const promise = sendTelegramMessage("token", "chat", "hello");
    // Advance through retry delays (1s, 2s exponential backoff)
    await vi.advanceTimersByTimeAsync(10_000);
    const result = await promise;

    expect(result).toBe(false);
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  // Test 4: Fetch timeout triggers retry
  it("retries when fetch rejects with AbortError", async () => {
    const abortError = new DOMException("The operation was aborted", "AbortError");
    mockFetch
      .mockReturnValueOnce(Promise.reject(abortError))
      .mockReturnValueOnce(okResponse());

    const promise = sendTelegramMessage("token", "chat", "hello");
    await vi.advanceTimersByTimeAsync(5000);
    const result = await promise;

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // Test 5: Fetch is called with AbortSignal
  it("passes an AbortSignal to fetch", async () => {
    mockFetch.mockReturnValueOnce(okResponse());

    const promise = sendTelegramMessage("token", "chat", "hello");
    await vi.advanceTimersByTimeAsync(0);
    await promise;

    const fetchOptions = mockFetch.mock.calls[0][1];
    expect(fetchOptions.signal).toBeInstanceOf(AbortSignal);
  });

  // Test 7: 429 with missing retry_after defaults gracefully
  it("handles 429 with missing retry_after by using default", async () => {
    mockFetch
      .mockReturnValueOnce(rateLimitResponse(undefined))
      .mockReturnValueOnce(okResponse());

    const promise = sendTelegramMessage("token", "chat", "hello");
    // Default is 5s
    await vi.advanceTimersByTimeAsync(6000);
    const result = await promise;

    expect(result).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  // Test 8: 429 cumulative wait cap — gives up when total wait exceeds limit
  it("gives up when 429 cumulative wait exceeds cap", async () => {
    // Two 429s with retry_after: 35 each = 70s total, exceeds 60s cap on second
    mockFetch
      .mockReturnValueOnce(rateLimitResponse(35))
      .mockReturnValueOnce(rateLimitResponse(35));

    const promise = sendTelegramMessage("token", "chat", "hello");
    await vi.advanceTimersByTimeAsync(40_000);
    const result = await promise;

    expect(result).toBe(false);
    // Only 2 fetches: first 429 (wait 35s, cumulative=35s, under cap), second 429 (cumulative=70s, over cap, abort)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

// ---- sendAlerts ----

describe("sendAlerts", () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function okResponse() {
    return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
  }

  function errorResponse(status: number) {
    return Promise.resolve(new Response("error", { status }));
  }

  // Test 6: sendAlerts returns correct failure count
  it("returns correct failure count for mixed success/failure", async () => {
    const alerts: Alert[] = [
      { silent: false, eventType: "governorProposalCreated", message: "alert 1" },
      { silent: false, eventType: "governorProposalExecuted", message: "alert 2" },
      { silent: false, eventType: "governorProposalExecuted", message: "alert 3" },
    ];

    // Alert 1: success
    mockFetch.mockReturnValueOnce(okResponse());
    // Alert 2: 3x failure (exhausts retries)
    mockFetch.mockReturnValueOnce(errorResponse(500));
    mockFetch.mockReturnValueOnce(errorResponse(500));
    mockFetch.mockReturnValueOnce(errorResponse(500));
    // Alert 3: success
    mockFetch.mockReturnValueOnce(okResponse());

    const promise = sendAlerts("token", "chat", alerts);
    await vi.advanceTimersByTimeAsync(60_000);
    const result = await promise;

    expect(result.failures).toBe(1);
    expect(result.failedEventTypes).toEqual(new Set(["governorProposalExecuted"]));
  });
});
