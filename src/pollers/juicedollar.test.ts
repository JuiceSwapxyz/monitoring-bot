import { describe, it, expect, vi } from "vitest";
import type { GraphQLClient } from "graphql-request";
import type { Minter, MintingUpdateV2 } from "../types.js";
import { makeWatermarks, emptyGraphQLResponse } from "../test-helpers.js";
import { MINTERS_NEW, MINTING_UPDATE_V2S_PRICE_INCREASE } from "../graphql/queries.js";
import { pollJuiceDollar } from "./juicedollar.js";

// Stub all telegram formatters — we test formatting elsewhere
vi.mock("../formatters/telegram.js", () => ({
  formatNewOriginalPosition: () => "newPosition",
  formatMinterApplication: (e: Minter) => `minterApp:${e.minter}`,
  formatMinterDenied: () => "minterDenied",
  formatSavingsRateProposed: () => "savingsRateProposed",
  formatSavingsRateChanged: () => "savingsRateChanged",
  formatFeeRateChangesProposed: () => "feeRateProposed",
  formatFeeRateChangesExecuted: () => "feeRateExecuted",
  formatEmergencyStop: () => "emergencyStop",
  formatForcedLiquidation: () => "forcedLiquidation",
  formatPositionDenied: () => "positionDenied",
  formatChallengeStarted: () => "challengeStarted",
  formatChallengeSucceeded: () => "challengeSucceeded",
  formatChallengeAverted: () => "challengeAverted",
  formatPositionPriceIncrease: () => "positionPriceIncrease",
  formatMintingHubRateProposed: () => "mintingHubRateProposed",
  formatMintingHubRateChanged: () => "mintingHubRateChanged",
  formatSavingsVaultDeposit: () => "savingsVaultDeposit",
  formatSavingsVaultWithdraw: () => "savingsVaultWithdraw",
  formatSavingsVaultInterestClaimed: () => "savingsVaultInterestClaimed",
}));

function makeMinter(overrides: Partial<Minter> = {}): Minter {
  return {
    id: "1",
    txHash: "0xaaa",
    minter: "0xMINTER",
    applicationPeriod: "86400",
    applicationFee: "1000000",
    applyMessage: "I want to mint",
    applyDate: "100",
    suggestor: "0xSUGGESTOR",
    denyMessage: null,
    denyDate: null,
    denyTxHash: null,
    vetor: null,
    ...overrides,
  };
}

function makeMockClient(
  impl: (query: string, variables: Record<string, unknown>) => unknown
): GraphQLClient {
  return {
    request: vi.fn(impl),
  } as unknown as GraphQLClient;
}

const EXPLORER = "https://citreascan.com";

describe("pollJuiceDollar — minter application denyDate filter", () => {
  it("alerts on new application (denyDate: null)", async () => {
    const minter = makeMinter({ denyDate: null, applyDate: "100" });
    const client = makeMockClient((query) => {
      if (query === MINTERS_NEW) {
        return { minters: { items: [minter] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const minterAlerts = result.alerts.filter((a) => a.eventType === "minterApplication");
    expect(minterAlerts).toHaveLength(1);
    expect(minterAlerts[0].silent).toBe(false);
    expect(result.watermarkUpdates.minterApplication).toBe("100");
  });

  it("produces 0 alerts for already-denied minter but still advances watermark", async () => {
    const minter = makeMinter({ denyDate: "50", applyDate: "100" });
    const client = makeMockClient((query) => {
      if (query === MINTERS_NEW) {
        return { minters: { items: [minter] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const minterAlerts = result.alerts.filter((a) => a.eventType === "minterApplication");
    expect(minterAlerts).toHaveLength(0);
    // Watermark still advances to prevent stuck watermark
    expect(result.watermarkUpdates.minterApplication).toBe("100");
  });

  it("filters correctly in mix: 1 new + 1 denied → 1 alert", async () => {
    const newMinter = makeMinter({ minter: "0xNEW", denyDate: null, applyDate: "100" });
    const deniedMinter = makeMinter({ minter: "0xDENIED", denyDate: "50", applyDate: "200" });
    const client = makeMockClient((query) => {
      if (query === MINTERS_NEW) {
        return { minters: { items: [newMinter, deniedMinter] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const minterAlerts = result.alerts.filter((a) => a.eventType === "minterApplication");
    expect(minterAlerts).toHaveLength(1);
    expect(minterAlerts[0].message).toContain("0xNEW");
    // Watermark advances to LAST item's applyDate
    expect(result.watermarkUpdates.minterApplication).toBe("200");
  });
});

describe("pollJuiceDollar — general patterns", () => {
  it("returns no alerts and no watermark changes on empty results", async () => {
    const client = makeMockClient(() => emptyGraphQLResponse());

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toEqual([]);
    expect(result.watermarkUpdates).toEqual({});
    expect(result.queryFailures).toBe(0);
  });

  it("advances watermark to LAST item's timestamp with multiple items", async () => {
    const m1 = makeMinter({ applyDate: "100", denyDate: null });
    const m2 = makeMinter({ applyDate: "200", denyDate: null });
    const m3 = makeMinter({ applyDate: "300", denyDate: null });
    const client = makeMockClient((query) => {
      if (query === MINTERS_NEW) {
        return { minters: { items: [m1, m2, m3] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    expect(result.watermarkUpdates.minterApplication).toBe("300");
  });

  it("does not crash on GraphQL error, returns empty for that section", async () => {
    const client = makeMockClient((query) => {
      if (query === MINTERS_NEW) {
        throw new Error("Connection refused");
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    // Should complete — no minter alerts but no crash
    expect(result.watermarkUpdates.minterApplication).toBeUndefined();
    expect(result.queryFailures).toBe(1);
  });

  it("handles all queries erroring without crash", async () => {
    const client = makeMockClient(() => {
      throw new Error("Total failure");
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toEqual([]);
    expect(result.watermarkUpdates).toEqual({});
    expect(result.queryFailures).toBe(19);
  });
});

function makeMintingUpdate(overrides: Partial<MintingUpdateV2> = {}): MintingUpdateV2 {
  return {
    id: "0xPOS-2",
    txHash: "0xabc",
    created: "1000",
    position: "0xPOS",
    owner: "0xOWNER",
    isClone: false,
    collateralSymbol: "cBTC",
    collateralDecimals: 18,
    size: "1000000000000000000",
    price: "50000000000000000000000",
    priceAdjusted: "100000000000000000000",
    cooldown: "2000",
    ...overrides,
  };
}

describe("pollJuiceDollar — position price increase filter", () => {
  it("skips events with id ending in '-1' (initial position opening)", async () => {
    const update = makeMintingUpdate({ id: "0xPOS-1", cooldown: "2000", created: "1000" });
    const client = makeMockClient((query) => {
      if (query === MINTING_UPDATE_V2S_PRICE_INCREASE) {
        return { mintingUpdateV2s: { items: [update] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const priceAlerts = result.alerts.filter((a) => a.eventType === "positionPriceIncrease");
    expect(priceAlerts).toHaveLength(0);
    // Watermark still advances
    expect(result.watermarkUpdates.positionPriceIncrease).toBe("1000");
  });

  it("skips events where cooldown <= created (reference-validated, no governance review)", async () => {
    const update = makeMintingUpdate({ id: "0xPOS-2", cooldown: "500", created: "1000" });
    const client = makeMockClient((query) => {
      if (query === MINTING_UPDATE_V2S_PRICE_INCREASE) {
        return { mintingUpdateV2s: { items: [update] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const priceAlerts = result.alerts.filter((a) => a.eventType === "positionPriceIncrease");
    expect(priceAlerts).toHaveLength(0);
    expect(result.watermarkUpdates.positionPriceIncrease).toBe("1000");
  });

  it("alerts when cooldown > created and id does not end in '-1'", async () => {
    const update = makeMintingUpdate({ id: "0xPOS-2", cooldown: "2000", created: "1000" });
    const client = makeMockClient((query) => {
      if (query === MINTING_UPDATE_V2S_PRICE_INCREASE) {
        return { mintingUpdateV2s: { items: [update] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const priceAlerts = result.alerts.filter((a) => a.eventType === "positionPriceIncrease");
    expect(priceAlerts).toHaveLength(1);
    expect(priceAlerts[0].silent).toBe(false);
  });

  it("filters correctly in mix: 1 opening + 1 reference-validated + 1 real increase → 1 alert", async () => {
    const opening = makeMintingUpdate({ id: "0xPOS-1", cooldown: "2000", created: "100" });
    const refValidated = makeMintingUpdate({ id: "0xPOS-2", cooldown: "50", created: "200" });
    const realIncrease = makeMintingUpdate({ id: "0xPOS-3", cooldown: "500", created: "300" });
    const client = makeMockClient((query) => {
      if (query === MINTING_UPDATE_V2S_PRICE_INCREASE) {
        return { mintingUpdateV2s: { items: [opening, refValidated, realIncrease] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceDollar(client, makeWatermarks(), EXPLORER);
    const priceAlerts = result.alerts.filter((a) => a.eventType === "positionPriceIncrease");
    expect(priceAlerts).toHaveLength(1);
    // Watermark advances to last item
    expect(result.watermarkUpdates.positionPriceIncrease).toBe("300");
  });
});
