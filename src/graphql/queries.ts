import { gql } from "graphql-request";

// ============================================================
// JuiceSwap queries
// ============================================================

export const GOVERNOR_PROPOSALS_NEW = gql`
  query GovernorProposalsNew($watermark: BigInt!) {
    governorProposals(
      where: { createdAt_gt: $watermark, status: "active" }
      orderBy: "createdAt"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        proposalId
        proposer
        target
        calldata
        executeAfter
        description
        status
        createdAt
        txHash
      }
    }
  }
`;

export const GOVERNOR_PROPOSALS_RESOLVED = gql`
  query GovernorProposalsResolved($watermark: BigInt!) {
    governorProposals(
      where: { resolvedAt_gt: $watermark, status_in: ["executed", "vetoed"] }
      orderBy: "resolvedAt"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        proposalId
        proposer
        target
        description
        status
        executedBy
        vetoedBy
        createdAt
        resolvedAt
        txHash
        resolvedTxHash
      }
    }
  }
`;

export const FACTORY_OWNER_CHANGES = gql`
  query FactoryOwnerChanges($watermark: BigInt!) {
    factoryOwnerChanges(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        oldOwner
        newOwner
        blockTimestamp
        txHash
      }
    }
  }
`;

export const FEE_COLLECTOR_OWNER_UPDATES = gql`
  query FeeCollectorOwnerUpdates($watermark: BigInt!) {
    feeCollectorOwnerUpdates(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        newOwner
        blockTimestamp
        txHash
      }
    }
  }
`;

export const FEE_COLLECTOR_ROUTER_UPDATES = gql`
  query FeeCollectorRouterUpdates($watermark: BigInt!) {
    feeCollectorRouterUpdates(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        oldRouter
        newRouter
        blockTimestamp
        txHash
      }
    }
  }
`;

export const FEE_COLLECTOR_COLLECTOR_UPDATES = gql`
  query FeeCollectorCollectorUpdates($watermark: BigInt!) {
    feeCollectorCollectorUpdates(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        oldCollector
        newCollector
        blockTimestamp
        txHash
      }
    }
  }
`;

export const FEE_COLLECTOR_PROTECTION_UPDATES = gql`
  query FeeCollectorProtectionUpdates($watermark: BigInt!) {
    feeCollectorProtectionUpdates(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        twapPeriod
        maxSlippageBps
        blockTimestamp
        txHash
      }
    }
  }
`;

export const GATEWAY_BRIDGED_TOKEN_REGISTRATIONS = gql`
  query GatewayBridgedTokenRegistrations($watermark: BigInt!) {
    gatewayBridgedTokenRegistrations(
      where: { blockTimestamp_gt: $watermark }
      orderBy: "blockTimestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        chainId
        token
        bridge
        registeredBy
        decimals
        blockTimestamp
        txHash
      }
    }
  }
`;

// ============================================================
// JuiceDollar queries
// ============================================================

export const POSITION_V2S_NEW = gql`
  query PositionV2sNew($watermark: BigInt!) {
    positionV2s(
      where: { created_gt: $watermark, isOriginal: true, denied: false }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        position
        owner
        collateral
        price
        created
        isOriginal
        denied
        cooldown
        collateralSymbol
        collateralDecimals
        stablecoinSymbol
        stablecoinDecimals
        minimumCollateral
        limitForClones
      }
    }
  }
`;

export const MINTERS_NEW = gql`
  query MintersNew($watermark: BigInt!) {
    minters(
      where: { applyDate_gt: $watermark }
      orderBy: "applyDate"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        minter
        applicationPeriod
        applicationFee
        applyMessage
        applyDate
        suggestor
        denyDate
        denyMessage
        vetor
      }
    }
  }
`;

export const MINTERS_DENIED = gql`
  query MintersDenied($watermark: BigInt!) {
    minters(
      where: { denyDate_gt: $watermark }
      orderBy: "denyDate"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        minter
        applyMessage
        applyDate
        suggestor
        denyDate
        denyMessage
        denyTxHash
        vetor
      }
    }
  }
`;

export const SAVINGS_RATE_PROPOSEDS = gql`
  query SavingsRateProposeds($watermark: BigInt!) {
    savingsRateProposeds(
      where: { created_gt: $watermark }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        created
        blockheight
        txHash
        proposer
        nextRate
        nextChange
      }
    }
  }
`;

export const SAVINGS_RATE_CHANGEDS = gql`
  query SavingsRateChangeds($watermark: BigInt!) {
    savingsRateChangeds(
      where: { created_gt: $watermark }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        created
        blockheight
        txHash
        approvedRate
      }
    }
  }
`;

export const RATE_CHANGES_PROPOSEDS = gql`
  query RateChangesProposeds($watermark: BigInt!) {
    rateChangesProposeds(
      where: { timestamp_gt: $watermark }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        who
        nextFeeRate
        nextSavingsFeeRate
        nextMintingFeeRate
        nextChange
        blockheight
        timestamp
        txHash
      }
    }
  }
`;

export const RATE_CHANGES_EXECUTEDS = gql`
  query RateChangesExecuteds($watermark: BigInt!) {
    rateChangesExecuteds(
      where: { timestamp_gt: $watermark }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        who
        nextFeeRate
        nextSavingsFeeRate
        nextMintingFeeRate
        blockheight
        timestamp
        txHash
      }
    }
  }
`;

export const EMERGENCY_STOPPEDS = gql`
  query EmergencyStoppeds($watermark: BigInt!) {
    emergencyStoppeds(
      where: { timestamp_gt: $watermark }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        bridgeAddress
        caller
        message
        blockheight
        timestamp
        txHash
      }
    }
  }
`;

export const FORCED_SALES = gql`
  query ForcedSales($watermark: BigInt!) {
    forcedSales(
      where: { timestamp_gt: $watermark }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        position
        amount
        priceE36MinusDecimals
        blockheight
        timestamp
        txHash
      }
    }
  }
`;

export const POSITION_DENIED_BY_GOVERNANCES = gql`
  query PositionDeniedByGovernances($watermark: BigInt!) {
    positionDeniedByGovernances(
      where: { timestamp_gt: $watermark }
      orderBy: "timestamp"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        position
        denier
        message
        blockheight
        timestamp
        txHash
      }
    }
  }
`;

export const CHALLENGE_V2S = gql`
  query ChallengeV2s($watermark: BigInt!) {
    challengeV2s(
      where: { created_gt: $watermark }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        position
        number
        challenger
        start
        created
        duration
        size
        liqPrice
        status
      }
    }
  }
`;

export const CHALLENGE_BID_V2S_SUCCEEDED = gql`
  query ChallengeBidV2sSucceeded($watermark: BigInt!) {
    challengeBidV2s(
      where: { created_gt: $watermark, bidType: "Succeeded" }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        position
        number
        numberBid
        bidder
        created
        bidType
        bid
        price
        filledSize
        acquiredCollateral
        challengeSize
      }
    }
  }
`;

export const CHALLENGE_BID_V2S_AVERTED = gql`
  query ChallengeBidV2sAverted($watermark: BigInt!) {
    challengeBidV2s(
      where: { created_gt: $watermark, bidType: "Averted" }
      orderBy: "created"
      orderDirection: "asc"
      limit: 50
    ) {
      items {
        id
        txHash
        position
        number
        numberBid
        bidder
        created
        bidType
        bid
        price
        filledSize
        acquiredCollateral
        challengeSize
      }
    }
  }
`;

