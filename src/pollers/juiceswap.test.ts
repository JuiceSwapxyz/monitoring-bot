import { describe, it, expect, vi } from "vitest";
import type { GraphQLClient } from "graphql-request";
import type { GovernorProposal } from "../types.js";
import { makeWatermarks, emptyGraphQLResponse } from "../test-helpers.js";
import { GOVERNOR_PROPOSALS_NEW, GOVERNOR_PROPOSALS_RESOLVED } from "../graphql/queries.js";
import { pollJuiceSwap } from "./juiceswap.js";

// Stub all telegram formatters — we test formatting elsewhere
vi.mock("../formatters/telegram.js", () => ({
  formatGovernorProposalCreated: (e: GovernorProposal) => `created:${e.proposalId}`,
  formatGovernorProposalExecuted: (e: GovernorProposal) => `executed:${e.proposalId}`,
  formatGovernorProposalVetoed: (e: GovernorProposal) => `vetoed:${e.proposalId}`,
  formatFactoryOwnerChanged: () => "factoryOwner",
  formatFeeCollectorOwnerUpdated: () => "feeCollectorOwner",
  formatSwapRouterUpdated: () => "swapRouter",
  formatFeeCollectorUpdated: () => "feeCollector",
  formatProtectionParamsUpdated: () => "protectionParams",
  formatBridgedTokenRegistered: () => "bridgedToken",
}));

function makeProposal(overrides: Partial<GovernorProposal> = {}): GovernorProposal {
  return {
    id: "1",
    chainId: 5115,
    proposalId: "42",
    proposer: "0xABC",
    target: "0xDEF",
    calldata: "0x",
    executeAfter: "1700000000",
    description: "Test proposal",
    status: "executed",
    executedBy: "0xABC",
    vetoedBy: null,
    createdAtBlock: "100",
    createdAt: "100",
    txHash: "0xaaa",
    resolvedAt: "200",
    resolvedTxHash: "0xbbb",
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

describe("pollJuiceSwap — governor resolved", () => {
  it("produces executed alert and advances both watermarks", async () => {
    const proposal = makeProposal({ status: "executed", resolvedAt: "200" });
    const client = makeMockClient((query) => {
      if (query === GOVERNOR_PROPOSALS_RESOLVED) {
        return { governorProposals: { items: [proposal] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].eventType).toBe("governorProposalExecuted");
    expect(result.alerts[0].silent).toBe(false);
    expect(result.watermarkUpdates.governorProposalExecuted).toBe("200");
    expect(result.watermarkUpdates.governorProposalVetoed).toBe("200");
  });

  it("produces vetoed alert and advances both watermarks", async () => {
    const proposal = makeProposal({
      status: "vetoed",
      vetoedBy: "0x999",
      executedBy: null,
      resolvedAt: "300",
    });
    const client = makeMockClient((query) => {
      if (query === GOVERNOR_PROPOSALS_RESOLVED) {
        return { governorProposals: { items: [proposal] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0].eventType).toBe("governorProposalVetoed");
    expect(result.watermarkUpdates.governorProposalExecuted).toBe("300");
    expect(result.watermarkUpdates.governorProposalVetoed).toBe("300");
  });

  it("handles mixed executed + vetoed proposals", async () => {
    const executed = makeProposal({ proposalId: "1", status: "executed", resolvedAt: "100" });
    const vetoed = makeProposal({
      proposalId: "2",
      status: "vetoed",
      vetoedBy: "0x999",
      executedBy: null,
      resolvedAt: "200",
    });
    const client = makeMockClient((query) => {
      if (query === GOVERNOR_PROPOSALS_RESOLVED) {
        return { governorProposals: { items: [executed, vetoed] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toHaveLength(2);
    expect(result.alerts[0].eventType).toBe("governorProposalExecuted");
    expect(result.alerts[1].eventType).toBe("governorProposalVetoed");
    // Watermarks advance to LAST item's resolvedAt
    expect(result.watermarkUpdates.governorProposalExecuted).toBe("200");
    expect(result.watermarkUpdates.governorProposalVetoed).toBe("200");
  });

  it("does not update watermark when resolvedAt is null", async () => {
    const proposal = makeProposal({ status: "executed", resolvedAt: null });
    const client = makeMockClient((query) => {
      if (query === GOVERNOR_PROPOSALS_RESOLVED) {
        return { governorProposals: { items: [proposal] } };
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toHaveLength(1);
    expect(result.watermarkUpdates.governorProposalExecuted).toBeUndefined();
    expect(result.watermarkUpdates.governorProposalVetoed).toBeUndefined();
  });
});

describe("pollJuiceSwap — error handling", () => {
  it("does not crash on GraphQL error, returns empty for that section", async () => {
    const client = makeMockClient((query) => {
      if (query === GOVERNOR_PROPOSALS_NEW) {
        throw new Error("Network timeout");
      }
      return emptyGraphQLResponse();
    });

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    // Should still complete — just no alerts from the failed query
    expect(result.alerts).toEqual([]);
    expect(result.watermarkUpdates).toEqual({});
    expect(result.queryFailures).toBe(1);
  });
});

describe("pollJuiceSwap — empty results", () => {
  it("returns no alerts and no watermark updates when all queries return empty", async () => {
    const client = makeMockClient(() => emptyGraphQLResponse());

    const result = await pollJuiceSwap(client, makeWatermarks(), EXPLORER);
    expect(result.alerts).toEqual([]);
    expect(result.watermarkUpdates).toEqual({});
    expect(result.queryFailures).toBe(0);
  });
});
