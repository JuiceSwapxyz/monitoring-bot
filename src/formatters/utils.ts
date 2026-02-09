/** Shorten an address: 0xECc0...D82B */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/** Format a unix timestamp (seconds) as UTC date string */
export function formatTimestamp(ts: string | number): string {
  const seconds = typeof ts === "string" ? parseInt(ts, 10) : ts;
  if (isNaN(seconds) || seconds === 0) return "N/A";
  return new Date(seconds * 1000).toUTCString().replace("GMT", "UTC");
}

/** Calculate time remaining from now to a future unix timestamp (seconds) */
export function timeUntil(ts: string | number): string {
  const seconds = typeof ts === "string" ? parseInt(ts, 10) : ts;
  const now = Math.floor(Date.now() / 1000);
  const diff = seconds - now;
  if (diff <= 0) return "EXPIRED";

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0 && days === 0) parts.push(`${minutes}m`);
  return parts.length > 0 ? `in ${parts.join(" ")}` : "< 1m";
}

/** Format a BigInt value with decimals (e.g. 98500000000 with 6 decimals → "98,500.000000") */
export function formatBigIntValue(
  value: string,
  decimals: number,
  displayDecimals: number = 2
): string {
  if (!value || value === "0") return "0";

  const isNeg = value.startsWith("-");
  const abs = isNeg ? value.slice(1) : value;

  const padded = abs.padStart(decimals + 1, "0");
  const intPart = padded.slice(0, padded.length - decimals) || "0";
  const fracPart = padded.slice(padded.length - decimals);

  // Add thousands separator
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const truncFrac = fracPart.slice(0, displayDecimals);

  const result = displayDecimals > 0 ? `${formatted}.${truncFrac}` : formatted;
  return isNeg ? `-${result}` : result;
}

/** Format PPM (parts per million) as percentage string */
export function formatPPM(ppm: number): string {
  return `${(ppm / 10000).toFixed(2)}%`;
}

/** Format BPS (basis points) as percentage string */
export function formatBPS(bps: string | number): string {
  const val = typeof bps === "string" ? parseInt(bps, 10) : bps;
  return `${(val / 100).toFixed(2)}%`;
}

/** Build explorer transaction URL */
export function txUrl(explorerUrl: string, txHash: string): string {
  return `${explorerUrl}/tx/${txHash}`;
}

/** Escape HTML special characters for Telegram HTML mode */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
