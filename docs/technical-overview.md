# SignalDesk Technical Overview

## Core Idea

SignalDesk turns TxLINE odds and score updates into an auditable autonomous decision workflow. The app is designed to make three things obvious during judge review:

1. TxLINE can drive automated strategy logic.
2. Decisions are deterministic and risk-controlled.
3. Each decision can be tied back to a specific feed event and proof path.

## Architecture

```text
TxLINE feed or replay scenario
  -> normalized odds/score event
  -> strategy engine
  -> risk engine
  -> paper execution decision
  -> SHA-256 receipt
  -> judge dashboard
```

## Services

- React/Vite dashboard.
- Node/Express API.
- Shared TypeScript strategy engine used by both dashboard and API.
- Replay mode for guaranteed judge demo availability.
- Live TxLINE mode with server-side credentials.
- Public Render deployment: `https://signaldesk-txline.onrender.com`.

## Local API

- `GET /api/health`
- `GET /api/replay/scenarios`
- `GET /api/replay/scenarios/:id`
- `GET /api/replay/stream/:id`
- `POST /api/engine/run/:id`
- `GET /api/txline/status`
- `GET /api/txline/fixtures`
- `GET /api/txline/odds/snapshot/:fixtureId`
- `GET /api/txline/scores/snapshot/:fixtureId`
- `GET /api/txline/odds/stream`
- `GET /api/txline/scores/stream`
- `GET /api/txline/odds/validation`
- `GET /api/txline/scores/stat-validation`

Public verification endpoints:

- `GET https://signaldesk-txline.onrender.com/api/health`
- `GET https://signaldesk-txline.onrender.com/api/txline/status`
- `GET https://signaldesk-txline.onrender.com/api/txline/fixtures`

## Agents

### Sharp Move

Reads implied-probability deltas from match-winner odds. It emits a momentum signal when a rolling move crosses threshold.

### Mean Reversion

Looks for decelerating movement after a high-volatility run. It only fires when the market has moved hard and then loses acceleration.

### Score Shock

Consumes score events such as goal, red card, VAR, and corner. It converts match events into execution, pause, or risk-reduction actions.

### Market Maker

Maintains paper two-sided quotes around the current consensus price. It widens spread as volatility rises.

## Risk Controls

- Confidence floor.
- Maximum exposure.
- Maximum single notional.
- Strategy cooldown.
- Reduced mode.
- Kill switch.

## TxLINE Integration Plan

Live credentials are intentionally server-side only.

Mainnet activation proof:

- Network: Solana mainnet
- TxLINE service level: 12
- Subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Activated at: `2026-07-07T11:05:48.470Z`
- Live fixture snapshot verified locally and publicly: `GET /api/txline/fixtures` returned HTTP 200 with TxLINE fixture JSON.

Required headers:

```text
Authorization: Bearer ${TXLINE_GUEST_JWT}
X-Api-Token: ${TXLINE_API_TOKEN}
```

Target endpoints:

- fixtures snapshot
- odds snapshot and updates
- odds SSE stream
- odds validation proof
- scores snapshot and updates
- scores SSE stream
- score stat validation proof

## Judge Demo Safety

Because live matches may not be active during review, replay mode ships with TxLINE-shaped scenarios that still exercise the full autonomous path:

- odds movement
- score shock
- VAR uncertainty
- risk throttling
- market-maker quoting
- receipt generation

Live mode is active when server credentials are configured, and replay mode remains available for deterministic judge review.
