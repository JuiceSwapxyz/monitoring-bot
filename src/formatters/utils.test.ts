import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatBigIntValue,
  timeUntil,
  formatPPM,
  formatBPS,
  escapeHtml,
  shortAddr,
  formatTimestamp,
  txUrl,
} from "./utils.js";

// ============================================================
// formatBigIntValue
// ============================================================

describe("formatBigIntValue", () => {
  it("returns '0' for zero value", () => {
    expect(formatBigIntValue("0", 6, 2)).toBe("0");
  });

  it("returns '0' for empty string", () => {
    expect(formatBigIntValue("", 6, 2)).toBe("0");
  });

  it("formats standard USDC amount", () => {
    expect(formatBigIntValue("98500000", 6, 2)).toBe("98.50");
  });

  it("adds thousands separators", () => {
    expect(formatBigIntValue("1234567890000", 6, 2)).toBe("1,234,567.89");
  });

  it("handles sub-unit values (< 1.0) via padStart", () => {
    expect(formatBigIntValue("500000", 6, 2)).toBe("0.50");
  });

  it("handles smallest unit with full precision", () => {
    expect(formatBigIntValue("1", 6, 6)).toBe("0.000001");
  });

  it("truncates 1 wei to 2 decimal places", () => {
    expect(formatBigIntValue("1", 18, 2)).toBe("0.00");
  });

  it("formats 1 ETH (18 decimals)", () => {
    expect(formatBigIntValue("1000000000000000000", 18, 2)).toBe("1.00");
  });

  it("handles negative values", () => {
    expect(formatBigIntValue("-98500000", 6, 2)).toBe("-98.50");
  });

  it("omits decimal point when displayDecimals is 0", () => {
    expect(formatBigIntValue("98500000", 6, 0)).toBe("98");
  });
});

// ============================================================
// timeUntil
// ============================================================

describe("timeUntil", () => {
  beforeEach(() => {
    // Pin to a known epoch: 1700000000 seconds = 2023-11-14T22:13:20Z
    vi.useFakeTimers();
    vi.setSystemTime(1700000000 * 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns EXPIRED for past timestamp", () => {
    expect(timeUntil(1699999000)).toBe("EXPIRED");
  });

  it("returns EXPIRED for exactly now", () => {
    expect(timeUntil(1700000000)).toBe("EXPIRED");
  });

  it("returns '< 1m' for 30s ahead", () => {
    expect(timeUntil(1700000030)).toBe("< 1m");
  });

  it("returns 'in 30m' for 30 minutes ahead", () => {
    expect(timeUntil(1700000000 + 30 * 60)).toBe("in 30m");
  });

  it("returns 'in 2h 15m' for 2h 15m ahead", () => {
    expect(timeUntil(1700000000 + 2 * 3600 + 15 * 60)).toBe("in 2h 15m");
  });

  it("suppresses minutes when days > 0", () => {
    expect(timeUntil(1700000000 + 86400 + 3 * 3600)).toBe("in 1d 3h");
  });

  it("handles string input same as number", () => {
    expect(timeUntil("1700000030")).toBe("< 1m");
  });
});

// ============================================================
// formatPPM
// ============================================================

describe("formatPPM", () => {
  it("formats 0 PPM as 0.00%", () => {
    expect(formatPPM(0)).toBe("0.00%");
  });

  it("formats 10000 PPM as 1.00%", () => {
    expect(formatPPM(10000)).toBe("1.00%");
  });

  it("formats 1000000 PPM as 100.00%", () => {
    expect(formatPPM(1000000)).toBe("100.00%");
  });
});

// ============================================================
// formatBPS
// ============================================================

describe("formatBPS", () => {
  it("formats 100 BPS as 1.00%", () => {
    expect(formatBPS(100)).toBe("1.00%");
  });

  it("handles string input", () => {
    expect(formatBPS("100")).toBe("1.00%");
  });

  it("formats 0 BPS as 0.00%", () => {
    expect(formatBPS(0)).toBe("0.00%");
  });

  it("formats 10000 BPS as 100.00%", () => {
    expect(formatBPS(10000)).toBe("100.00%");
  });
});

// ============================================================
// escapeHtml
// ============================================================

describe("escapeHtml", () => {
  it("escapes <, >, and &", () => {
    expect(escapeHtml("<b>A & B</b>")).toBe("&lt;b&gt;A &amp; B&lt;/b&gt;");
  });

  it("passes through clean text", () => {
    expect(escapeHtml("hello world")).toBe("hello world");
  });
});

// ============================================================
// shortAddr
// ============================================================

describe("shortAddr", () => {
  it("truncates standard address", () => {
    expect(shortAddr("0xECc0d82BD0B5a9E6fCA5FdB41bCE4CF6B6d82B")).toBe(
      "0xECc0...d82B"
    );
  });

  it("returns empty string as-is", () => {
    expect(shortAddr("")).toBe("");
  });

  it("returns 9-char string as-is (below threshold)", () => {
    expect(shortAddr("123456789")).toBe("123456789");
  });

  it("truncates at exactly 10 chars", () => {
    expect(shortAddr("1234567890")).toBe("123456...7890");
  });
});

// ============================================================
// formatTimestamp
// ============================================================

describe("formatTimestamp", () => {
  it("formats a known epoch", () => {
    // 1700000000 = Tue, 14 Nov 2023 22:13:20 GMT
    const result = formatTimestamp(1700000000);
    expect(result).toContain("UTC");
    expect(result).not.toContain("GMT");
    expect(result).toContain("14 Nov 2023");
  });

  it("returns N/A for 0", () => {
    expect(formatTimestamp(0)).toBe("N/A");
  });

  it("returns N/A for NaN string", () => {
    expect(formatTimestamp("abc")).toBe("N/A");
  });

  it("handles string input", () => {
    const result = formatTimestamp("1700000000");
    expect(result).toContain("14 Nov 2023");
  });
});

// ============================================================
// txUrl
// ============================================================

describe("txUrl", () => {
  it("concatenates explorer URL and tx hash", () => {
    expect(txUrl("https://citreascan.com", "0xabc123")).toBe(
      "https://citreascan.com/tx/0xabc123"
    );
  });
});
