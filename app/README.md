# SignalDesk

SignalDesk is a counterfactual risk control plane for the TxODDS TxLINE World Cup hackathon. It ingests real TxLINE odds and score history plus a continuously refreshed live pulse, runs deterministic strategy agents, applies risk controls, paper-executes decisions, and generates audit-ready receipts.

The product is built for the Trading Tools and Agents track. It is not a real-money betting app; execution is deliberately paper-only.

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
- public Render deployment at `https://signaldesk-txline.onrender.com`
- verified France 2-1 Morocco incident replay derived from 66,339 TxLINE odds records
- normal, reduced, and halted counterfactual policy results

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
- `GET /api/judge/evidence`
- `GET /api/txline/fixtures`
- `GET /api/txline/odds/snapshot/:fixtureId`
- `GET /api/txline/scores/snapshot/:fixtureId`
- `GET /api/txline/odds/stream`
- `GET /api/txline/scores/stream`
- `GET /api/txline/odds/validation`
- `GET /api/txline/scores/stat-validation`

## Environment

Copy `.env.example` to `.env.local` after TxLINE activation. The server loads `.env.local` at startup and keeps runtime TxLINE tokens server-side. Wallet activation helpers are enabled in local development and disabled when `NODE_ENV=production` unless explicitly overridden.

```bash
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=
TXLINE_API_TOKEN=
```

Without credentials, SignalDesk still runs in replay mode and clearly marks live access as pending.

## Live TxLINE Verification

Mainnet free-tier activation has been completed and deployed server-side on Render.

- Subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Local verified proxy endpoint: `GET /api/txline/fixtures`
- Public verified proxy endpoint: `GET https://signaldesk-txline.onrender.com/api/txline/fixtures`
- Public judge evidence endpoint: `GET https://signaldesk-txline.onrender.com/api/judge/evidence`
- Verification result: HTTP 200 with TxLINE fixture JSON and `liveReady: true`

## TxLINE Endpoints Used by the Submitted Evidence

- `GET /api/fixtures/snapshot`
- `GET /api/odds/updates/{fixtureId}`
- `GET /api/odds/validation`
- `GET /api/scores/updates/{fixtureId}`

## Additional Implemented Proxy Capabilities

- `GET /api/odds/snapshot/{fixtureId}`
- `GET /api/odds/stream`
- `GET /api/scores/snapshot/{fixtureId}`
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

## Render

The repository root includes `render.yaml` for a free Docker web service with `app/` as the service root. `TXLINE_GUEST_JWT` and `TXLINE_API_TOKEN` are configured as secret server-side environment variables in Render.
