import { readFile, writeFile, rename, stat } from "node:fs/promises";
import type { EventType, Watermarks, WatermarkLoadResult } from "./types.js";

const EVENT_TYPE_RECORD: Record<EventType, true> = {
  governorProposalCreated: true,
  minterApplication: true,
  newOriginalPosition: true,
  savingsRateProposed: true,
  feeRateChangesProposed: true,
  emergencyStop: true,
  forcedLiquidation: true,
  governorProposalExecuted: true,
  governorProposalVetoed: true,
  factoryOwnerChanged: true,
  feeCollectorOwnerUpdated: true,
  swapRouterUpdated: true,
  feeCollectorUpdated: true,
  protectionParamsUpdated: true,
  bridgedTokenRegistered: true,
  positionDenied: true,
  minterDenied: true,
  challengeStarted: true,
  challengeSucceeded: true,
  challengeAverted: true,
  savingsRateChanged: true,
  feeRateChangesExecuted: true,
};
const ALL_EVENT_TYPES = Object.keys(EVENT_TYPE_RECORD) as EventType[];

function initializeWatermarks(timestamp: string): Watermarks {
  const wm = {} as Watermarks;
  for (const et of ALL_EVENT_TYPES) {
    wm[et] = timestamp;
  }
  return wm;
}

export async function loadWatermarks(
  path: string
): Promise<WatermarkLoadResult> {
  const defaultTs = "0";

  try {
    await stat(path);
  } catch {
    // File doesn't exist — first run
    console.log(`[watermark] No watermark file found. Initializing (ts=${defaultTs})`);
    const wm = initializeWatermarks(defaultTs);
    await saveWatermarks(path, wm);
    return { watermarks: wm, isFirstRun: true };
  }

  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as Partial<Watermarks>;
    // Fill in any missing event types
    const wm = initializeWatermarks(defaultTs);
    for (const et of ALL_EVENT_TYPES) {
      if (parsed[et] !== undefined) {
        wm[et] = parsed[et]!;
      }
    }
    return { watermarks: wm, isFirstRun: false };
  } catch (err) {
    // Corrupted file — backup and reinitialize
    console.warn(`[watermark] Corrupted watermark file, backing up to ${path}.bak`);
    try {
      await rename(path, `${path}.bak`);
    } catch {
      // Ignore backup failure
    }
    const wm = initializeWatermarks(defaultTs);
    await saveWatermarks(path, wm);
    return { watermarks: wm, isFirstRun: true };
  }
}

export async function saveWatermarks(
  path: string,
  watermarks: Watermarks
): Promise<void> {
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, JSON.stringify(watermarks, null, 2), "utf-8");
  await rename(tmpPath, path);
}
