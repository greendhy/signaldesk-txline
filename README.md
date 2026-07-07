# SignalDesk: Verifiable TxLINE Trading Command Center

SignalDesk is an autonomous trading operations workbench for the TxODDS TxLINE World Cup hackathon. It turns TxLINE odds and score feeds into deterministic strategy decisions, risk-managed paper execution, and SHA-256 decision receipts.

The project is built for the **Trading Tools and Agents** track. It is not a real-money betting product; execution is paper-only by default.

## Live MVP

- App: https://signaldesk-txline.onrender.com
- Health: https://signaldesk-txline.onrender.com/api/health
- TxLINE status: https://signaldesk-txline.onrender.com/api/txline/status
- Public repository: https://github.com/greendhy/signaldesk-txline

## Why This Can Win

Most entries stop at alerts, chatbots, or simple dashboards. SignalDesk is shaped like a tool a trading desk, market operator, or B2B sports-data customer could actually evaluate:

- live TxLINE data ingestion
- replay mode for judge review when no match is live
- four deterministic agents: Sharp Move, Mean Reversion, Score Shock, Market Maker
- risk controls: exposure cap, confidence floor, reduced mode, kill switch
- audit receipts tied to source event IDs and proof endpoints
- server-side credential handling so API tokens are never exposed in the browser

## Live TxLINE Proof

Mainnet free-tier activation has been completed and deployed server-side on Render.

- Subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Local verified endpoint: `GET /api/txline/fixtures`
- Public verified endpoint: `GET https://signaldesk-txline.onrender.com/api/txline/fixtures`
- Verification result: HTTP 200 with TxLINE fixture JSON and `liveReady: true`

## Run Locally

```bash
cd app
pnpm install
pnpm dev
```

Open:

```text
http://127.0.0.1:5173
```

API:

```text
http://127.0.0.1:8790/api/health
```

## Structure

- `app/` - React dashboard and Express API
- `docs/` - product strategy, technical overview, competitor notes
- `demo/` - screenshots and demo script
- `submission/` - Superteam submission draft

## Deployment

The app is deployed on Render from the Dockerfile and blueprint at `render.yaml`. TxLINE credentials are configured as server-side environment variables:

```text
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=...
TXLINE_API_TOKEN=...
```

Replay mode works without credentials; live mode requires the TxLINE token.
