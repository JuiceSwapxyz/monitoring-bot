# Juice Protocol Monitoring Bot

Telegram alerting bot for the Juice Protocol ecosystem on Citrea. Polls GraphQL indexers for governance events, position changes, and protocol parameter updates across JuiceSwap and JuiceDollar, then sends formatted alerts to a Telegram chat.

## Setup

```
npm install
cp .env.example .env  # fill in values
```

## Configuration

| Variable | Required | Default | Description |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes | | Telegram bot API token |
| `TELEGRAM_CHAT_ID` | Yes | | Target chat/group ID for alerts |
| `JUICESWAP_GRAPHQL_URL` | No | `https://dev.ponder.juiceswap.com/graphql` | JuiceSwap indexer endpoint |
| `JUICEDOLLAR_GRAPHQL_URL` | No | `https://dev.ponder.juicedollar.com/graphql` | JuiceDollar indexer endpoint |
| `POLL_INTERVAL_MS` | No | `30000` | Polling interval in ms (min: 1000) |
| `CITREA_EXPLORER_URL` | No | `https://citreascan.com` | Block explorer base URL for tx links |
| `WATERMARK_PATH` | No | `.watermarks.json` | File path for event watermark persistence |
| `INIT_MODE` | No | `now` | `now` = start from current time, `genesis` = process all historical events |

## Running

```
npm start          # production
npm run dev        # watch mode
npm test           # run tests
npm run test:watch # tests in watch mode
```

## Monitored Events

The bot tracks 22 event types across two protocols. Each event is classified as **URGENT** (requires operator action before a deadline) or **IMPORTANT** (significant state change, no deadline).

### URGENT — Operator Action Required

These events have time-sensitive deadlines. Missing them means the action auto-executes or auto-approves.

#### JuiceSwap

| Event | Description |
|---|---|
| **Governor Proposal Created** | New governance proposal submitted. Auto-executes after a timelock deadline if not vetoed. |

#### JuiceDollar

| Event | Description |
|---|---|
| **New Original Position** | New collateralized debt position opened. Must be reviewed and denied before cooldown ends if terms are inappropriate. |
| **Minter Application** | New minter requests approval. Auto-approves after the application period unless explicitly denied. |
| **Savings Rate Proposed** | Protocol savings rate change proposed. Takes effect after a delay period. |
| **Fee Rate Changes Proposed** | Fee rate, savings fee rate, and minting fee rate changes proposed. Takes effect after a delay period. |
| **Emergency Stop** | Bridge emergency stop triggered. Indicates a critical security event on a bridged asset. |
| **Forced Liquidation** | Position forcibly liquidated by the protocol. Indicates undercollateralization or governance action. |

### IMPORTANT — Significant State Changes

No immediate deadline, but these indicate meaningful protocol changes that operators should be aware of.

#### JuiceSwap

| Event | Description |
|---|---|
| **Governor Proposal Executed** | Governance proposal passed the timelock and was executed on-chain. |
| **Governor Proposal Vetoed** | Governance proposal was vetoed before execution. |
| **Factory Owner Changed** | Ownership of the factory contract transferred. Controls protocol deployment permissions. |
| **FeeCollector Owner Updated** | Ownership of the fee collector contract transferred. Controls fee fund management. |
| **Swap Router Updated** | Swap router address changed on the fee collector. Affects how collected fees are swapped. |
| **Fee Collector Updated** | Fee collector address changed. Affects where protocol fees are sent. |
| **Protection Params Updated** | TWAP period and max slippage parameters changed on the fee collector. Affects MEV protection for fee swaps. |
| **Bridged Token Registered** | New token registered on the gateway bridge. Enables bridging of an additional asset. |

#### JuiceDollar

| Event | Description |
|---|---|
| **Minter Denied** | Minter application was denied by a vetor before auto-approval. |
| **Position Denied** | Position denied by governance during its cooldown period. |
| **Challenge Started** | Liquidation challenge initiated against a position. Auction is now active. |
| **Challenge Succeeded** | Challenge auction completed, position was liquidated. |
| **Challenge Averted** | Challenge was averted by the position owner repaying. |
| **Savings Rate Changed** | Previously proposed savings rate change took effect. |
| **Fee Rate Changes Executed** | Previously proposed fee rate changes took effect. |

## Architecture

```
src/
  index.ts              Main polling loop
  config.ts             Environment variable loading and validation
  types.ts              Shared TypeScript types
  watermark.ts          Watermark persistence (tracks last-seen event timestamps)
  telegram.ts           Telegram message delivery
  graphql/
    client.ts           GraphQL client factory
    queries.ts          All GraphQL query constants
  pollers/
    juiceswap.ts        JuiceSwap event poller (8 query sections)
    juicedollar.ts      JuiceDollar event poller (13 query sections)
  formatters/
    telegram.ts         Telegram HTML message formatters
    utils.ts            Shared formatting utilities
```

The bot uses **watermark-based pagination**: each event type tracks the timestamp of the last processed event. On each poll cycle, only events newer than the watermark are fetched. Watermarks are persisted to disk as JSON and survive restarts. Corrupted watermark files are automatically backed up and reinitialized.
