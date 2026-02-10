// All monitored event types
export type EventType =
  | "governorProposalCreated"
  | "minterApplication"
  | "newOriginalPosition"
  | "savingsRateProposed"
  | "feeRateChangesProposed"
  | "emergencyStop"
  | "forcedLiquidation"
  | "governorProposalExecuted"
  | "governorProposalVetoed"
  | "factoryOwnerChanged"
  | "feeCollectorOwnerUpdated"
  | "swapRouterUpdated"
  | "feeCollectorUpdated"
  | "protectionParamsUpdated"
  | "bridgedTokenRegistered"
  | "positionDenied"
  | "minterDenied"
  | "challengeStarted"
  | "challengeSucceeded"
  | "challengeAverted"
  | "savingsRateChanged"
  | "feeRateChangesExecuted";

// Watermark state
export type Watermarks = Record<EventType, string>;

export interface WatermarkLoadResult {
  watermarks: Watermarks;
  isFirstRun: boolean;
}

// Config
export interface Config {
  telegramBotToken: string;
  telegramChatId: string;
  juiceswapGraphqlUrl: string;
  juicedollarGraphqlUrl: string;
  pollIntervalMs: number;
  citreaExplorerUrl: string;
  watermarkPath: string;
}

// Poll result from a poller
export interface PollResult {
  alerts: Alert[];
  watermarkUpdates: Partial<Watermarks>;
  queryFailures: number;
}

// Alert to send
export interface Alert {
  silent: boolean;
  eventType: EventType;
  message: string;
}

// ---- JuiceSwap event shapes ----

export interface GovernorProposal {
  id: string;
  chainId: number;
  proposalId: string;
  proposer: string;
  target: string;
  calldata: string;
  executeAfter: string;
  description: string;
  status: string;
  executedBy: string | null;
  vetoedBy: string | null;
  createdAtBlock: string;
  createdAt: string;
  txHash: string;
  resolvedAt: string | null;
  resolvedTxHash: string | null;
}

export interface FactoryOwnerChange {
  id: string;
  chainId: number;
  oldOwner: string;
  newOwner: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

export interface FeeCollectorOwnerUpdate {
  id: string;
  chainId: number;
  newOwner: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

export interface FeeCollectorRouterUpdate {
  id: string;
  chainId: number;
  oldRouter: string;
  newRouter: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

export interface FeeCollectorCollectorUpdate {
  id: string;
  chainId: number;
  oldCollector: string;
  newCollector: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

export interface FeeCollectorProtectionUpdate {
  id: string;
  chainId: number;
  twapPeriod: number;
  maxSlippageBps: string;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

export interface GatewayBridgedTokenRegistration {
  id: string;
  chainId: number;
  token: string;
  bridge: string;
  registeredBy: string;
  decimals: number;
  blockNumber: string;
  blockTimestamp: string;
  txHash: string;
}

// ---- JuiceDollar event shapes ----

export interface PositionV2 {
  id: string;
  txHash: string;
  position: string;
  owner: string;
  stablecoinAddress: string;
  collateral: string;
  price: string;
  created: string;
  isOriginal: boolean;
  isClone: boolean;
  denied: boolean;
  closed: boolean;
  original: string;
  minimumCollateral: string;
  riskPremiumPPM: number;
  reserveContribution: number;
  start: number;
  cooldown: string;
  expiration: number;
  challengePeriod: number;
  stablecoinName: string;
  stablecoinSymbol: string;
  stablecoinDecimals: number;
  collateralName: string;
  collateralSymbol: string;
  collateralDecimals: number;
  collateralBalance: string;
  limitForClones: string;
  availableForClones: string;
  availableForMinting: string;
  fixedAnnualRatePPM: number;
  principal: string;
  virtualPrice: string;
  actualVirtualPrice: string;
}

export interface Minter {
  id: string;
  txHash: string;
  minter: string;
  applicationPeriod: string;
  applicationFee: string;
  applyMessage: string;
  applyDate: string;
  suggestor: string;
  denyMessage: string | null;
  denyDate: string | null;
  denyTxHash: string | null;
  vetor: string | null;
}

export interface SavingsRateProposed {
  id: string;
  created: string;
  blockheight: string;
  txHash: string;
  proposer: string;
  nextRate: number;
  nextChange: number;
}

export interface SavingsRateChanged {
  id: string;
  created: string;
  blockheight: string;
  txHash: string;
  approvedRate: number;
}

export interface RateChangesProposed {
  id: string;
  who: string;
  nextFeeRate: number;
  nextSavingsFeeRate: number;
  nextMintingFeeRate: number;
  nextChange: string;
  blockheight: string;
  timestamp: string;
  txHash: string;
}

export interface RateChangesExecuted {
  id: string;
  who: string;
  nextFeeRate: number;
  nextSavingsFeeRate: number;
  nextMintingFeeRate: number;
  blockheight: string;
  timestamp: string;
  txHash: string;
}

export interface EmergencyStopped {
  id: string;
  bridgeAddress: string;
  caller: string;
  message: string;
  blockheight: string;
  timestamp: string;
  txHash: string;
}

export interface ForcedSale {
  id: string;
  position: string;
  amount: string;
  priceE36MinusDecimals: string;
  blockheight: string;
  timestamp: string;
  txHash: string;
}

export interface PositionDeniedByGovernance {
  id: string;
  position: string;
  denier: string;
  message: string;
  blockheight: string;
  timestamp: string;
  txHash: string;
}

export interface ChallengeV2 {
  id: string;
  txHash: string;
  position: string;
  number: string;
  challenger: string;
  start: number;
  created: string;
  duration: number;
  size: string;
  liqPrice: string;
  bids: string;
  filledSize: string;
  acquiredCollateral: string;
  status: string;
}

export interface ChallengeBidV2 {
  id: string;
  txHash: string;
  position: string;
  number: string;
  numberBid: string;
  bidder: string;
  created: string;
  bidType: string;
  bid: string;
  price: string;
  filledSize: string;
  acquiredCollateral: string;
  challengeSize: string;
}

