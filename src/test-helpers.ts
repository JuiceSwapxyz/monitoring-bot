import type { Watermarks } from "./types.js";

/** Returns a full Watermarks object with all 22 event types set to `ts` */
export function makeWatermarks(ts = "0"): Watermarks {
  return {
    governorProposalCreated: ts,
    minterApplication: ts,
    newOriginalPosition: ts,
    savingsRateProposed: ts,
    feeRateChangesProposed: ts,
    emergencyStop: ts,
    forcedLiquidation: ts,
    governorProposalExecuted: ts,
    governorProposalVetoed: ts,
    factoryOwnerChanged: ts,
    feeCollectorOwnerUpdated: ts,
    swapRouterUpdated: ts,
    feeCollectorUpdated: ts,
    protectionParamsUpdated: ts,
    bridgedTokenRegistered: ts,
    positionDenied: ts,
    minterDenied: ts,
    challengeStarted: ts,
    challengeSucceeded: ts,
    challengeAverted: ts,
    savingsRateChanged: ts,
    feeRateChangesExecuted: ts,
  };
}

/**
 * Proxy where any property access returns `{ items: [] }`.
 * Used as default mock return for GraphQL client so unrelated queries don't interfere.
 */
export function emptyGraphQLResponse(): Record<string, { items: unknown[] }> {
  return new Proxy(
    {},
    {
      get() {
        return { items: [] };
      },
    }
  );
}
