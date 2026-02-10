import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadWatermarks, saveWatermarks } from "./watermark.js";
import { makeWatermarks } from "./test-helpers.js";

describe("watermark persistence", () => {
  let dir: string;
  let wmPath: string;

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "wm-test-"));
    wmPath = join(dir, "watermarks.json");
  });

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true });
  });

  // ---- Missing file (first run) ----

  it("initializes with all zeros and isFirstRun=true when file is missing", async () => {
    const { watermarks, isFirstRun } = await loadWatermarks(wmPath);
    const expected = makeWatermarks("0");
    expect(watermarks).toEqual(expected);
    expect(isFirstRun).toBe(true);

    // File should have been written
    const onDisk = JSON.parse(await readFile(wmPath, "utf-8"));
    expect(onDisk).toEqual(expected);
  });

  // ---- Valid existing file ----

  it("loads complete existing file as-is with isFirstRun=false", async () => {
    const existing = makeWatermarks("42");
    existing.emergencyStop = "999";
    await writeFile(wmPath, JSON.stringify(existing), "utf-8");

    const { watermarks, isFirstRun } = await loadWatermarks(wmPath);
    expect(watermarks).toEqual(existing);
    expect(watermarks.emergencyStop).toBe("999");
    expect(isFirstRun).toBe(false);
  });

  it("fills missing keys from partial file with default", async () => {
    const partial = {
      governorProposalCreated: "100",
      emergencyStop: "200",
    };
    await writeFile(wmPath, JSON.stringify(partial), "utf-8");

    const { watermarks, isFirstRun } = await loadWatermarks(wmPath);
    // Preserved keys keep their values
    expect(watermarks.governorProposalCreated).toBe("100");
    expect(watermarks.emergencyStop).toBe("200");
    // Missing keys filled with "0"
    expect(watermarks.minterApplication).toBe("0");
    expect(watermarks.challengeAverted).toBe("0");
    // Total key count should be 22
    expect(Object.keys(watermarks).length).toBe(22);
    expect(isFirstRun).toBe(false);
  });

  // ---- Corrupted file ----

  it("recovers from corrupted JSON, creates .bak, isFirstRun=true", async () => {
    await writeFile(wmPath, "NOT VALID JSON{{{", "utf-8");

    const { watermarks, isFirstRun } = await loadWatermarks(wmPath);
    expect(watermarks).toEqual(makeWatermarks("0"));
    expect(isFirstRun).toBe(true);

    // .bak should contain the corrupt content
    const bak = await readFile(`${wmPath}.bak`, "utf-8");
    expect(bak).toBe("NOT VALID JSON{{{");

    // New valid file should exist
    const fresh = JSON.parse(await readFile(wmPath, "utf-8"));
    expect(fresh).toEqual(makeWatermarks("0"));
  });

  // ---- Save + load roundtrip ----

  it("roundtrips save then load with identical data", async () => {
    const original = makeWatermarks("0");
    original.governorProposalCreated = "12345";
    original.minterApplication = "67890";

    await saveWatermarks(wmPath, original);
    const { watermarks } = await loadWatermarks(wmPath);
    expect(watermarks).toEqual(original);
  });

  it("does not leave .tmp file after save", async () => {
    await saveWatermarks(wmPath, makeWatermarks("0"));

    const { readdir } = await import("node:fs/promises");
    const files = await readdir(dir);
    expect(files).not.toContain("watermarks.json.tmp");
    expect(files).toContain("watermarks.json");
  });
});
