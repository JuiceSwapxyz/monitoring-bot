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

## First Run Behavior

On first run (no watermark file), the bot automatically catches up on all historical events by logging them to the console only — no Telegram messages are sent during catch-up. Watermarks are saved after each catch-up cycle for crash resilience. Once caught up, the bot sends a Telegram startup message and enters live monitoring.

On subsequent restarts (watermark file exists), the bot loads watermarks and enters live monitoring immediately. Any events missed while the bot was offline are sent to Telegram as normal.

If the watermark file is corrupted, it is backed up to `.watermarks.json.bak` and the bot treats it as a first run.

## Running

### Local (quick)

```
npm run dev        # watch mode with hot reload
npm start          # production (requires npm run build first)
```

### Docker (recommended for production)

```
docker compose up -d        # start in background
docker compose logs -f      # follow logs
docker compose down         # stop
docker compose up -d --build  # rebuild after code changes
```

Watermarks persist in `./data/` on the host, so containers can be rebuilt without losing event tracking state. The container auto-restarts on crashes.

### Tests

```
npm test           # run tests
npm run test:watch # tests in watch mode
```

## Monitored Events

The bot tracks 22 event types across two protocols. Each event is either **non-silent** (sends a Telegram notification that rings/vibrates) or **silent** (delivers without sound). Currently all events are non-silent.

### JuiceSwap

| Event | Description | 🔔 |
|---|---|---|
| **Governor Proposal Created** | New governance proposal submitted. Auto-executes after a timelock deadline if not vetoed. | ✓ |
| **Governor Proposal Executed** | Governance proposal passed the timelock and was executed on-chain. | ✓ |
| **Governor Proposal Vetoed** | Governance proposal was vetoed before execution. | ✓ |
| **Factory Owner Changed** | Ownership of the factory contract transferred. Controls protocol deployment permissions. | ✓ |
| **FeeCollector Owner Updated** | Ownership of the fee collector contract transferred. Controls fee fund management. | ✓ |
| **Swap Router Updated** | Swap router address changed on the fee collector. Affects how collected fees are swapped. | ✓ |
| **Fee Collector Updated** | Fee collector address changed. Affects where protocol fees are sent. | ✓ |
| **Protection Params Updated** | TWAP period and max slippage parameters changed on the fee collector. Affects MEV protection for fee swaps. | ✓ |
| **Bridged Token Registered** | New token registered on the gateway bridge. Enables bridging of an additional asset. | ✓ |

### JuiceDollar

| Event | Description | 🔔 |
|---|---|---|
| **New Original Position** | New collateralized debt position opened. Must be reviewed and denied before cooldown ends if terms are inappropriate. | ✓ |
| **Minter Application** | New minter requests approval. Auto-approves after the application period unless explicitly denied. | ✓ |
| **Minter Denied** | Minter application was denied by a vetor before auto-approval. | ✓ |
| **Savings Rate Proposed** | Protocol savings rate change proposed. Takes effect after a delay period. | ✓ |
| **Savings Rate Changed** | Previously proposed savings rate change took effect. | ✓ |
| **Fee Rate Changes Proposed** | Fee rate, savings fee rate, and minting fee rate changes proposed. Takes effect after a delay period. | ✓ |
| **Fee Rate Changes Executed** | Previously proposed fee rate changes took effect. | ✓ |
| **Emergency Stop** | Bridge emergency stop triggered. Indicates a critical security event on a bridged asset. | ✓ |
| **Forced Liquidation** | Position forcibly liquidated by the protocol. Indicates undercollateralization or governance action. | ✓ |
| **Position Denied** | Position denied by governance during its cooldown period. | ✓ |
| **Challenge Started** | Liquidation challenge initiated against a position. Auction is now active. | ✓ |
| **Challenge Succeeded** | Challenge auction completed, position was liquidated. | ✓ |
| **Challenge Averted** | Challenge was averted by the position owner repaying. | ✓ |

## Architecture

```
src/
  index.ts              Main polling loop
  config.ts             Environment variable loading and validation
  types.ts              Shared TypeScript types
  watermark.ts          Watermark persistence (tracks last-seen event timestamps, detects first run)
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
