import type { GraphQLClient } from "graphql-request";
import { safePoll } from "../graphql/client.js";
import type {
  Alert,
  PollResult,
  Watermarks,
  GovernorProposal,
  FactoryOwnerChange,
  FeeCollectorOwnerUpdate,
  FeeCollectorRouterUpdate,
  FeeCollectorCollectorUpdate,
  FeeCollectorProtectionUpdate,
  GatewayBridgedTokenRegistration,
} from "../types.js";
import {
  GOVERNOR_PROPOSALS_NEW,
  GOVERNOR_PROPOSALS_RESOLVED,
  FACTORY_OWNER_CHANGES,
  FEE_COLLECTOR_OWNER_UPDATES,
  FEE_COLLECTOR_ROUTER_UPDATES,
  FEE_COLLECTOR_COLLECTOR_UPDATES,
  FEE_COLLECTOR_PROTECTION_UPDATES,
  GATEWAY_BRIDGED_TOKEN_REGISTRATIONS,
} from "../graphql/queries.js";
import {
  formatGovernorProposalCreated,
  formatGovernorProposalExecuted,
  formatGovernorProposalVetoed,
  formatFactoryOwnerChanged,
  formatFeeCollectorOwnerUpdated,
  formatSwapRouterUpdated,
  formatFeeCollectorUpdated,
  formatProtectionParamsUpdated,
  formatBridgedTokenRegistered,
} from "../formatters/telegram.js";

export async function pollJuiceSwap(
  client: GraphQLClient,
  watermarks: Watermarks,
  explorerUrl: string
): Promise<PollResult> {
  const alerts: Alert[] = [];
  const watermarkUpdates: Partial<Watermarks> = {};

  // 1. Governor Proposals Created
  {
    const data = await safePoll<{
      governorProposals: { items: GovernorProposal[] };
    }>(client, GOVERNOR_PROPOSALS_NEW, { watermark: watermarks.governorProposalCreated }, "governorProposalCreated");

    if (data?.governorProposals.items.length) {
      for (const e of data.governorProposals.items) {
        alerts.push({
          silent: false,
          eventType: "governorProposalCreated",
          message: formatGovernorProposalCreated(e, explorerUrl),
        });
      }
      const last = data.governorProposals.items[data.governorProposals.items.length - 1];
      watermarkUpdates.governorProposalCreated = last.createdAt;
    }
  }

  // 2. Governor Proposals Executed
  {
    const data = await safePoll<{
      governorProposals: { items: GovernorProposal[] };
    }>(client, GOVERNOR_PROPOSALS_RESOLVED, { watermark: watermarks.governorProposalExecuted }, "governorProposalResolved");

    if (data?.governorProposals.items.length) {
      for (const e of data.governorProposals.items) {
        if (e.status === "executed") {
          alerts.push({
            silent: false,
            eventType: "governorProposalExecuted",
            message: formatGovernorProposalExecuted(e, explorerUrl),
          });
        } else if (e.status === "vetoed") {
          alerts.push({
            silent: false,
            eventType: "governorProposalVetoed",
            message: formatGovernorProposalVetoed(e, explorerUrl),
          });
        }
      }
      const last = data.governorProposals.items[data.governorProposals.items.length - 1];
      if (last.resolvedAt) {
        // Both executed and vetoed share the same resolvedAt watermark
        watermarkUpdates.governorProposalExecuted = last.resolvedAt;
        watermarkUpdates.governorProposalVetoed = last.resolvedAt;
      }
    }
  }

  // 3. Factory Owner Changes
  {
    const data = await safePoll<{
      factoryOwnerChanges: { items: FactoryOwnerChange[] };
    }>(client, FACTORY_OWNER_CHANGES, { watermark: watermarks.factoryOwnerChanged }, "factoryOwnerChanged");

    if (data?.factoryOwnerChanges.items.length) {
      for (const e of data.factoryOwnerChanges.items) {
        alerts.push({
          silent: false,
          eventType: "factoryOwnerChanged",
          message: formatFactoryOwnerChanged(e, explorerUrl),
        });
      }
      const last = data.factoryOwnerChanges.items[data.factoryOwnerChanges.items.length - 1];
      watermarkUpdates.factoryOwnerChanged = last.blockTimestamp;
    }
  }

  // 4. FeeCollector Owner Updates
  {
    const data = await safePoll<{
      feeCollectorOwnerUpdates: { items: FeeCollectorOwnerUpdate[] };
    }>(client, FEE_COLLECTOR_OWNER_UPDATES, { watermark: watermarks.feeCollectorOwnerUpdated }, "feeCollectorOwnerUpdated");

    if (data?.feeCollectorOwnerUpdates.items.length) {
      for (const e of data.feeCollectorOwnerUpdates.items) {
        alerts.push({
          silent: false,
          eventType: "feeCollectorOwnerUpdated",
          message: formatFeeCollectorOwnerUpdated(e, explorerUrl),
        });
      }
      const last = data.feeCollectorOwnerUpdates.items[data.feeCollectorOwnerUpdates.items.length - 1];
      watermarkUpdates.feeCollectorOwnerUpdated = last.blockTimestamp;
    }
  }

  // 5. Swap Router Updates
  {
    const data = await safePoll<{
      feeCollectorRouterUpdates: { items: FeeCollectorRouterUpdate[] };
    }>(client, FEE_COLLECTOR_ROUTER_UPDATES, { watermark: watermarks.swapRouterUpdated }, "swapRouterUpdated");

    if (data?.feeCollectorRouterUpdates.items.length) {
      for (const e of data.feeCollectorRouterUpdates.items) {
        alerts.push({
          silent: false,
          eventType: "swapRouterUpdated",
          message: formatSwapRouterUpdated(e, explorerUrl),
        });
      }
      const last = data.feeCollectorRouterUpdates.items[data.feeCollectorRouterUpdates.items.length - 1];
      watermarkUpdates.swapRouterUpdated = last.blockTimestamp;
    }
  }

  // 6. Fee Collector Collector Updates
  {
    const data = await safePoll<{
      feeCollectorCollectorUpdates: { items: FeeCollectorCollectorUpdate[] };
    }>(client, FEE_COLLECTOR_COLLECTOR_UPDATES, { watermark: watermarks.feeCollectorUpdated }, "feeCollectorUpdated");

    if (data?.feeCollectorCollectorUpdates.items.length) {
      for (const e of data.feeCollectorCollectorUpdates.items) {
        alerts.push({
          silent: false,
          eventType: "feeCollectorUpdated",
          message: formatFeeCollectorUpdated(e, explorerUrl),
        });
      }
      const last = data.feeCollectorCollectorUpdates.items[data.feeCollectorCollectorUpdates.items.length - 1];
      watermarkUpdates.feeCollectorUpdated = last.blockTimestamp;
    }
  }

  // 7. Protection Params Updates
  {
    const data = await safePoll<{
      feeCollectorProtectionUpdates: { items: FeeCollectorProtectionUpdate[] };
    }>(client, FEE_COLLECTOR_PROTECTION_UPDATES, { watermark: watermarks.protectionParamsUpdated }, "protectionParamsUpdated");

    if (data?.feeCollectorProtectionUpdates.items.length) {
      for (const e of data.feeCollectorProtectionUpdates.items) {
        alerts.push({
          silent: false,
          eventType: "protectionParamsUpdated",
          message: formatProtectionParamsUpdated(e, explorerUrl),
        });
      }
      const last = data.feeCollectorProtectionUpdates.items[data.feeCollectorProtectionUpdates.items.length - 1];
      watermarkUpdates.protectionParamsUpdated = last.blockTimestamp;
    }
  }

  // 8. Bridged Token Registrations
  {
    const data = await safePoll<{
      gatewayBridgedTokenRegistrations: { items: GatewayBridgedTokenRegistration[] };
    }>(client, GATEWAY_BRIDGED_TOKEN_REGISTRATIONS, { watermark: watermarks.bridgedTokenRegistered }, "bridgedTokenRegistered");

    if (data?.gatewayBridgedTokenRegistrations.items.length) {
      for (const e of data.gatewayBridgedTokenRegistrations.items) {
        alerts.push({
          silent: false,
          eventType: "bridgedTokenRegistered",
          message: formatBridgedTokenRegistered(e, explorerUrl),
        });
      }
      const last = data.gatewayBridgedTokenRegistrations.items[data.gatewayBridgedTokenRegistrations.items.length - 1];
      watermarkUpdates.bridgedTokenRegistered = last.blockTimestamp;
    }
  }

  return { alerts, watermarkUpdates };
}
