import type {
  GovernorProposal,
  FactoryOwnerChange,
  FeeCollectorOwnerUpdate,
  FeeCollectorRouterUpdate,
  FeeCollectorCollectorUpdate,
  FeeCollectorProtectionUpdate,
  GatewayBridgedTokenRegistration,
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
  shortAddr,
  formatTimestamp,
  timeUntil,
  formatBigIntValue,
  formatPPM,
  formatBPS,
  txUrl,
  escapeHtml,
} from "./utils.js";

export function formatGovernorProposalCreated(
  e: GovernorProposal,
  explorerUrl: string
): string {
  const desc = e.description
    ? escapeHtml(e.description.slice(0, 200))
    : "No description";
  return (
    `<b>New Governor Proposal</b>\n\n` +
    `Proposal #${e.proposalId}\n` +
    `Proposer: ${shortAddr(e.proposer)}\n` +
    `Target: ${shortAddr(e.target)}\n` +
    `Description: ${desc}\n\n` +
    `<b>Auto-executes: ${formatTimestamp(e.executeAfter)} (${timeUntil(e.executeAfter)})</b>\n\n` +
    `Chain: Citrea (${e.chainId})\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatMinterApplication(
  e: Minter,
  explorerUrl: string
): string {
  const applyDateNum = parseInt(e.applyDate, 10);
  const appPeriodNum = parseInt(e.applicationPeriod, 10);
  const deadline = applyDateNum + appPeriodNum;
  return (
    `<b>New Minter Application</b>\n\n` +
    `Minter: ${shortAddr(e.minter)}\n` +
    `Suggestor: ${shortAddr(e.suggestor)}\n` +
    `Message: "${escapeHtml(e.applyMessage || "")}"\n\n` +
    `<b>Auto-approved: ${formatTimestamp(deadline)} (${timeUntil(deadline)})</b>\n\n` +
    `Action: Deny before deadline or minter is approved.\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatNewOriginalPosition(
  e: PositionV2,
  explorerUrl: string
): string {
  const priceStr = formatBigIntValue(e.price, e.stablecoinDecimals || 18);
  return (
    `<b>New Original Position Opened</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Owner: ${shortAddr(e.owner)}\n` +
    `Collateral: ${escapeHtml(e.collateralSymbol || "") || shortAddr(e.collateral)}\n` +
    `Price: ${priceStr} ${escapeHtml(e.stablecoinSymbol || "") || "JUSD"}\n\n` +
    `<b>Cooldown ends: ${formatTimestamp(e.cooldown)} (${timeUntil(e.cooldown)})</b>\n\n` +
    `Action: Review and deny before cooldown ends if inappropriate.`
  );
}

export function formatSavingsRateProposed(
  e: SavingsRateProposed,
  explorerUrl: string
): string {
  return (
    `<b>Savings Rate Proposed</b>\n\n` +
    `Proposer: ${shortAddr(e.proposer)}\n` +
    `Next Rate: ${formatPPM(e.nextRate)}\n\n` +
    `<b>Takes effect: ${formatTimestamp(e.nextChange)} (${timeUntil(e.nextChange)})</b>\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatFeeRateChangesProposed(
  e: RateChangesProposed,
  explorerUrl: string
): string {
  return (
    `<b>Fee Rate Changes Proposed</b>\n\n` +
    `By: ${shortAddr(e.who)}\n` +
    `Fee Rate: ${formatPPM(e.nextFeeRate)}\n` +
    `Savings Fee Rate: ${formatPPM(e.nextSavingsFeeRate)}\n` +
    `Minting Fee Rate: ${formatPPM(e.nextMintingFeeRate)}\n\n` +
    `<b>Takes effect: ${formatTimestamp(e.nextChange)} (${timeUntil(e.nextChange)})</b>\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatEmergencyStop(
  e: EmergencyStopped,
  explorerUrl: string
): string {
  return (
    `<b>BRIDGE EMERGENCY STOP</b>\n\n` +
    `Bridge: ${shortAddr(e.bridgeAddress)}\n` +
    `Caller: ${shortAddr(e.caller)}\n` +
    `Message: "${escapeHtml(e.message || "")}"\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatForcedLiquidation(
  e: ForcedSale,
  explorerUrl: string
): string {
  return (
    `<b>Forced Liquidation</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Amount: ${e.amount}\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatGovernorProposalExecuted(
  e: GovernorProposal,
  explorerUrl: string
): string {
  return (
    `<b>Governor Proposal Executed</b>\n\n` +
    `Proposal #${e.proposalId}\n` +
    `Executed by: ${shortAddr(e.executedBy || "unknown")}\n` +
    `Target: ${shortAddr(e.target)}\n` +
    `Description: ${escapeHtml((e.description || "").slice(0, 200))}\n\n` +
    `Chain: Citrea (${e.chainId})\n` +
    `Tx: ${txUrl(explorerUrl, e.resolvedTxHash || e.txHash)}`
  );
}

export function formatGovernorProposalVetoed(
  e: GovernorProposal,
  explorerUrl: string
): string {
  return (
    `<b>Governor Proposal Vetoed</b>\n\n` +
    `Proposal #${e.proposalId}\n` +
    `Vetoed by: ${shortAddr(e.vetoedBy || "unknown")}\n` +
    `Target: ${shortAddr(e.target)}\n` +
    `Description: ${escapeHtml((e.description || "").slice(0, 200))}\n\n` +
    `Chain: Citrea (${e.chainId})\n` +
    `Tx: ${txUrl(explorerUrl, e.resolvedTxHash || e.txHash)}`
  );
}

export function formatFactoryOwnerChanged(
  e: FactoryOwnerChange,
  explorerUrl: string
): string {
  return (
    `<b>Factory Owner Changed</b>\n\n` +
    `Old: ${shortAddr(e.oldOwner)}\n` +
    `New: ${shortAddr(e.newOwner)}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatFeeCollectorOwnerUpdated(
  e: FeeCollectorOwnerUpdate,
  explorerUrl: string
): string {
  return (
    `<b>FeeCollector Owner Updated</b>\n\n` +
    `New Owner: ${shortAddr(e.newOwner)}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatSwapRouterUpdated(
  e: FeeCollectorRouterUpdate,
  explorerUrl: string
): string {
  return (
    `<b>Swap Router Updated</b>\n\n` +
    `Old: ${shortAddr(e.oldRouter)}\n` +
    `New: ${shortAddr(e.newRouter)}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatFeeCollectorUpdated(
  e: FeeCollectorCollectorUpdate,
  explorerUrl: string
): string {
  return (
    `<b>Fee Collector Updated</b>\n\n` +
    `Old: ${shortAddr(e.oldCollector)}\n` +
    `New: ${shortAddr(e.newCollector)}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatProtectionParamsUpdated(
  e: FeeCollectorProtectionUpdate,
  explorerUrl: string
): string {
  return (
    `<b>Protection Params Updated</b>\n\n` +
    `TWAP Period: ${e.twapPeriod}s\n` +
    `Max Slippage: ${formatBPS(e.maxSlippageBps)}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatBridgedTokenRegistered(
  e: GatewayBridgedTokenRegistration,
  explorerUrl: string
): string {
  return (
    `<b>Bridged Token Registered</b>\n\n` +
    `Token: ${shortAddr(e.token)}\n` +
    `Bridge: ${shortAddr(e.bridge)}\n` +
    `Registered by: ${shortAddr(e.registeredBy)}\n` +
    `Decimals: ${e.decimals}\n` +
    `Chain: Citrea (${e.chainId})\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatPositionDenied(
  e: PositionDeniedByGovernance,
  explorerUrl: string
): string {
  return (
    `<b>Position Denied by Governance</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Denier: ${shortAddr(e.denier)}\n` +
    `Message: "${escapeHtml(e.message || "")}"\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatMinterDenied(
  e: Minter,
  explorerUrl: string
): string {
  return (
    `<b>Minter Denied</b>\n\n` +
    `Minter: ${shortAddr(e.minter)}\n` +
    `Vetor: ${shortAddr(e.vetor || "unknown")}\n` +
    `Deny Message: "${escapeHtml(e.denyMessage || "")}"\n` +
    `Original Application: "${escapeHtml(e.applyMessage || "")}"\n\n` +
    `Tx: ${txUrl(explorerUrl, e.denyTxHash || e.txHash)}`
  );
}

export function formatChallengeStarted(
  e: ChallengeV2,
): string {
  return (
    `<b>Challenge Started</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Challenge #${e.number}\n` +
    `Challenger: ${shortAddr(e.challenger)}\n` +
    `Size: ${e.size}\n` +
    `Liq Price: ${e.liqPrice}\n` +
    `Duration: ${e.duration}s`
  );
}

export function formatChallengeSucceeded(
  e: ChallengeBidV2,
): string {
  return (
    `<b>Challenge Succeeded</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Challenge #${e.number}\n` +
    `Bidder: ${shortAddr(e.bidder)}\n` +
    `Bid: ${e.bid}\n` +
    `Filled Size: ${e.filledSize}\n` +
    `Acquired Collateral: ${e.acquiredCollateral}`
  );
}

export function formatChallengeAverted(
  e: ChallengeBidV2,
): string {
  return (
    `<b>Challenge Averted</b>\n\n` +
    `Position: ${shortAddr(e.position)}\n` +
    `Challenge #${e.number}\n` +
    `Bidder: ${shortAddr(e.bidder)}\n` +
    `Bid: ${e.bid}\n` +
    `Position saved.`
  );
}

export function formatSavingsRateChanged(
  e: SavingsRateChanged,
  explorerUrl: string
): string {
  return (
    `<b>Savings Rate Changed</b>\n\n` +
    `Approved Rate: ${formatPPM(e.approvedRate)}\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

export function formatFeeRateChangesExecuted(
  e: RateChangesExecuted,
  explorerUrl: string
): string {
  return (
    `<b>Fee Rate Changes Executed</b>\n\n` +
    `By: ${shortAddr(e.who)}\n` +
    `Fee Rate: ${formatPPM(e.nextFeeRate)}\n` +
    `Savings Fee Rate: ${formatPPM(e.nextSavingsFeeRate)}\n` +
    `Minting Fee Rate: ${formatPPM(e.nextMintingFeeRate)}\n\n` +
    `Tx: ${txUrl(explorerUrl, e.txHash)}`
  );
}

