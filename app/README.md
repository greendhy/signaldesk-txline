# SignalDesk

SignalDesk is a verifiable trading command center for the TxODDS TxLINE World Cup hackathon. It ingests TxLINE-shaped odds and score feeds, runs deterministic strategy agents, applies risk controls, paper-executes decisions, and generates audit-ready receipts for every automated action.

The product is built for the Trading Tools and Agents track. It is not a real-money betting app. Execution is paper-only by default, with devnet-compatible hooks planned for final submission.

## Why It Exists

Most sports-data demos stop at alerts. SignalDesk shows how a professional trading team, market operator, or B2B intermediary could use TxLINE as an operational data layer:

- live or replayed feed ingestion
- autonomous strategy decisions
- risk-managed paper execution
- deterministic decision receipts
- replay mode for judge review when no match is live

## Current Status

Implemented:

- React command-center dashboard
- replay scenarios for goal, red-card, VAR, and volatility stress
- Sharp Move, Mean Reversion, Score Shock, and Market Maker agents
- confidence floor, exposure cap, reduced mode, and kill switch
- SHA-256 decision receipts
- Node API for replay, engine runs, health, and TxLINE credential status
- wallet-based TxLINE free-tier API activation
- live TxLINE endpoint verification with `TXLINE_GUEST_JWT` and `TXLINE_API_TOKEN`

Pending:

- deployment to a public Node host
- final demo video

## Local Development

```bash
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

API health:

```text
http://127.0.0.1:8790/api/health
```

Local SignalDesk API:

- `GET /api/replay/scenarios`
- `POST /api/engine/run/:scenarioId`
- `GET /api/txline/status`
- `GET /api/txline/fixtures`
- `GET /api/txline/odds/snapshot/:fixtureId`
- `GET /api/txline/scores/snapshot/:fixtureId`
- `GET /api/txline/odds/stream`
- `GET /api/txline/scores/stream`
- `GET /api/txline/odds/validation`
- `GET /api/txline/scores/stat-validation`

## Environment

Copy `.env.example` to `.env.local` after TxLINE activation. The server loads `.env.local` at startup and keeps TxLINE tokens server-side.

```bash
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=
TXLINE_API_TOKEN=
```

Without credentials, SignalDesk still runs in replay mode and clearly marks live access as pending.

## Live TxLINE Verification

Mainnet free-tier activation has been completed for local development.

- Subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Verified proxy endpoint: `GET /api/txline/fixtures`
- Verification result: HTTP 200 with TxLINE fixture JSON

## TxLINE Endpoints Targeted

- `POST /auth/guest/start`
- `GET /api/fixtures/snapshot`
- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/odds/updates/{fixtureId}`
- `GET /api/odds/updates/{epochDay}/{hourOfDay}/{interval}`
- `GET /api/odds/stream`
- `GET /api/odds/validation`
- `GET /api/scores/snapshot/{fixtureId}`
- `GET /api/scores/updates/{fixtureId}`
- `GET /api/scores/historical/{fixtureId}`
- `GET /api/scores/stream`
- `GET /api/scores/stat-validation`

## Strategy Receipts

Every decision records:

- agent id and strategy version
- source mode
- fixture id
- TxLINE endpoint shape
- source message id or score event id
- event timestamp
- deterministic decision payload hash
- proof status

The receipt hash is generated with SHA-256 over a stable JSON payload.

## Scripts

```bash
pnpm check
pnpm build
pnpm dev
pnpm start
```
