import type { GraphQLClient } from "graphql-request";
import type {
  Alert,
  PollResult,
  Watermarks,
  PositionV2,
  Minter,
  SavingsRateProposed,
  SavingsRateChanged,
  RateChangesProposed,
  RateChangesExecuted,
  EmergencyStopped,
  ForcedSale,
  PositionDeniedByGovernance,
  ChallengeV2,
  ChallengeBidV2,
} from "../types.js";
import {
  POSITION_V2S_NEW,
  MINTERS_NEW,
  MINTERS_DENIED,
  SAVINGS_RATE_PROPOSEDS,
  SAVINGS_RATE_CHANGEDS,
  RATE_CHANGES_PROPOSEDS,
  RATE_CHANGES_EXECUTEDS,
  EMERGENCY_STOPPEDS,
  FORCED_SALES,
  POSITION_DENIED_BY_GOVERNANCES,
  CHALLENGE_V2S,
  CHALLENGE_BID_V2S_SUCCEEDED,
  CHALLENGE_BID_V2S_AVERTED,
} from "../graphql/queries.js";
import {
  formatNewOriginalPosition,
  formatMinterApplication,
  formatMinterDenied,
  formatSavingsRateProposed,
  formatSavingsRateChanged,
  formatFeeRateChangesProposed,
  formatFeeRateChangesExecuted,
  formatEmergencyStop,
  formatForcedLiquidation,
  formatPositionDenied,
  formatChallengeStarted,
  formatChallengeSucceeded,
  formatChallengeAverted,
} from "../formatters/telegram.js";

async function safePoll<T>(
  client: GraphQLClient,
  query: string,
  variables: Record<string, unknown>,
  label: string
): Promise<T | null> {
  try {
    return await client.request<T>(query, variables);
  } catch (err) {
    console.error(`[juicedollar] Failed to poll ${label}:`, err instanceof Error ? err.message : err);
    return null;
  }
}

export async function pollJuiceDollar(
  client: GraphQLClient,
  watermarks: Watermarks,
  explorerUrl: string
): Promise<PollResult> {
  const alerts: Alert[] = [];
  const watermarkUpdates: Partial<Watermarks> = {};

  // 1. New Original Positions
  {
    const data = await safePoll<{
      positionV2s: { items: PositionV2[] };
    }>(client, POSITION_V2S_NEW, { watermark: watermarks.newOriginalPosition }, "newOriginalPosition");

    if (data?.positionV2s.items.length) {
      for (const e of data.positionV2s.items) {
        alerts.push({
          silent: false,
          eventType: "newOriginalPosition",
          message: formatNewOriginalPosition(e, explorerUrl),
        });
      }
      const last = data.positionV2s.items[data.positionV2s.items.length - 1];
      watermarkUpdates.newOriginalPosition = last.created;
    }
  }

  // 2. Minter Applications
  {
    const data = await safePoll<{
      minters: { items: Minter[] };
    }>(client, MINTERS_NEW, { watermark: watermarks.minterApplication }, "minterApplication");

    if (data?.minters.items.length) {
      // Only alert on new applications (no denyDate yet)
      for (const e of data.minters.items) {
        if (!e.denyDate) {
          alerts.push({
            silent: false,
            eventType: "minterApplication",
            message: formatMinterApplication(e, explorerUrl),
          });
        }
      }
      const last = data.minters.items[data.minters.items.length - 1];
      watermarkUpdates.minterApplication = last.applyDate;
    }
  }

  // 3. Minters Denied
  {
    const data = await safePoll<{
      minters: { items: Minter[] };
    }>(client, MINTERS_DENIED, { watermark: watermarks.minterDenied }, "minterDenied");

    if (data?.minters.items.length) {
      for (const e of data.minters.items) {
        alerts.push({
          silent: false,
          eventType: "minterDenied",
          message: formatMinterDenied(e, explorerUrl),
        });
      }
      const last = data.minters.items[data.minters.items.length - 1];
      watermarkUpdates.minterDenied = last.denyDate!;
    }
  }

  // 4. Savings Rate Proposed
  {
    const data = await safePoll<{
      savingsRateProposeds: { items: SavingsRateProposed[] };
    }>(client, SAVINGS_RATE_PROPOSEDS, { watermark: watermarks.savingsRateProposed }, "savingsRateProposed");

    if (data?.savingsRateProposeds.items.length) {
      for (const e of data.savingsRateProposeds.items) {
        alerts.push({
          silent: false,
          eventType: "savingsRateProposed",
          message: formatSavingsRateProposed(e, explorerUrl),
        });
      }
      const last = data.savingsRateProposeds.items[data.savingsRateProposeds.items.length - 1];
      watermarkUpdates.savingsRateProposed = last.created;
    }
  }

  // 5. Savings Rate Changed
  {
    const data = await safePoll<{
      savingsRateChangeds: { items: SavingsRateChanged[] };
    }>(client, SAVINGS_RATE_CHANGEDS, { watermark: watermarks.savingsRateChanged }, "savingsRateChanged");

    if (data?.savingsRateChangeds.items.length) {
      for (const e of data.savingsRateChangeds.items) {
        alerts.push({
          silent: false,
          eventType: "savingsRateChanged",
          message: formatSavingsRateChanged(e, explorerUrl),
        });
      }
      const last = data.savingsRateChangeds.items[data.savingsRateChangeds.items.length - 1];
      watermarkUpdates.savingsRateChanged = last.created;
    }
  }

  // 6. Fee Rate Changes Proposed
  {
    const data = await safePoll<{
      rateChangesProposeds: { items: RateChangesProposed[] };
    }>(client, RATE_CHANGES_PROPOSEDS, { watermark: watermarks.feeRateChangesProposed }, "feeRateChangesProposed");

    if (data?.rateChangesProposeds.items.length) {
      for (const e of data.rateChangesProposeds.items) {
        alerts.push({
          silent: false,
          eventType: "feeRateChangesProposed",
          message: formatFeeRateChangesProposed(e, explorerUrl),
        });
      }
      const last = data.rateChangesProposeds.items[data.rateChangesProposeds.items.length - 1];
      watermarkUpdates.feeRateChangesProposed = last.timestamp;
    }
  }

  // 7. Fee Rate Changes Executed
  {
    const data = await safePoll<{
      rateChangesExecuteds: { items: RateChangesExecuted[] };
    }>(client, RATE_CHANGES_EXECUTEDS, { watermark: watermarks.feeRateChangesExecuted }, "feeRateChangesExecuted");

    if (data?.rateChangesExecuteds.items.length) {
      for (const e of data.rateChangesExecuteds.items) {
        alerts.push({
          silent: false,
          eventType: "feeRateChangesExecuted",
          message: formatFeeRateChangesExecuted(e, explorerUrl),
        });
      }
      const last = data.rateChangesExecuteds.items[data.rateChangesExecuteds.items.length - 1];
      watermarkUpdates.feeRateChangesExecuted = last.timestamp;
    }
  }

  // 8. Emergency Stops
  {
    const data = await safePoll<{
      emergencyStoppeds: { items: EmergencyStopped[] };
    }>(client, EMERGENCY_STOPPEDS, { watermark: watermarks.emergencyStop }, "emergencyStop");

    if (data?.emergencyStoppeds.items.length) {
      for (const e of data.emergencyStoppeds.items) {
        alerts.push({
          silent: false,
          eventType: "emergencyStop",
          message: formatEmergencyStop(e, explorerUrl),
        });
      }
      const last = data.emergencyStoppeds.items[data.emergencyStoppeds.items.length - 1];
      watermarkUpdates.emergencyStop = last.timestamp;
    }
  }

  // 9. Forced Sales
  {
    const data = await safePoll<{
      forcedSales: { items: ForcedSale[] };
    }>(client, FORCED_SALES, { watermark: watermarks.forcedLiquidation }, "forcedLiquidation");

    if (data?.forcedSales.items.length) {
      for (const e of data.forcedSales.items) {
        alerts.push({
          silent: false,
          eventType: "forcedLiquidation",
          message: formatForcedLiquidation(e, explorerUrl),
        });
      }
      const last = data.forcedSales.items[data.forcedSales.items.length - 1];
      watermarkUpdates.forcedLiquidation = last.timestamp;
    }
  }

  // 10. Position Denied by Governance
  {
    const data = await safePoll<{
      positionDeniedByGovernances: { items: PositionDeniedByGovernance[] };
    }>(client, POSITION_DENIED_BY_GOVERNANCES, { watermark: watermarks.positionDenied }, "positionDenied");

    if (data?.positionDeniedByGovernances.items.length) {
      for (const e of data.positionDeniedByGovernances.items) {
        alerts.push({
          silent: false,
          eventType: "positionDenied",
          message: formatPositionDenied(e, explorerUrl),
        });
      }
      const last = data.positionDeniedByGovernances.items[data.positionDeniedByGovernances.items.length - 1];
      watermarkUpdates.positionDenied = last.timestamp;
    }
  }

  // 11. Challenges Started
  {
    const data = await safePoll<{
      challengeV2s: { items: ChallengeV2[] };
    }>(client, CHALLENGE_V2S, { watermark: watermarks.challengeStarted }, "challengeStarted");

    if (data?.challengeV2s.items.length) {
      for (const e of data.challengeV2s.items) {
        alerts.push({
          silent: false,
          eventType: "challengeStarted",
          message: formatChallengeStarted(e, explorerUrl),
        });
      }
      const last = data.challengeV2s.items[data.challengeV2s.items.length - 1];
      watermarkUpdates.challengeStarted = last.created;
    }
  }

  // 12. Challenge Bids Succeeded
  {
    const data = await safePoll<{
      challengeBidV2s: { items: ChallengeBidV2[] };
    }>(client, CHALLENGE_BID_V2S_SUCCEEDED, { watermark: watermarks.challengeSucceeded }, "challengeSucceeded");

    if (data?.challengeBidV2s.items.length) {
      for (const e of data.challengeBidV2s.items) {
        alerts.push({
          silent: false,
          eventType: "challengeSucceeded",
          message: formatChallengeSucceeded(e, explorerUrl),
        });
      }
      const last = data.challengeBidV2s.items[data.challengeBidV2s.items.length - 1];
      watermarkUpdates.challengeSucceeded = last.created;
    }
  }

  // 13. Challenge Bids Averted
  {
    const data = await safePoll<{
      challengeBidV2s: { items: ChallengeBidV2[] };
    }>(client, CHALLENGE_BID_V2S_AVERTED, { watermark: watermarks.challengeAverted }, "challengeAverted");

    if (data?.challengeBidV2s.items.length) {
      for (const e of data.challengeBidV2s.items) {
        alerts.push({
          silent: false,
          eventType: "challengeAverted",
          message: formatChallengeAverted(e, explorerUrl),
        });
      }
      const last = data.challengeBidV2s.items[data.challengeBidV2s.items.length - 1];
      watermarkUpdates.challengeAverted = last.created;
    }
  }

  return { alerts, watermarkUpdates };
}
