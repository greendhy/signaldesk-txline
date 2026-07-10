# SignalDesk Technical Overview

## Core Idea

SignalDesk is a counterfactual risk control plane for autonomous TxLINE trading agents. It makes four things independently testable:

1. The backend has live TxLINE access.
2. The default incident replay contains real TxLINE odds and score events.
3. Strategy and risk decisions are deterministic.
4. A decision can be traced from a TxLINE message and Merkle proof to a SHA-256 receipt.

## Architecture

```text
TxLINE live pulse or verified incident replay
  -> normalized odds and score event
  -> four deterministic strategy agents
  -> normal / reduced / halted policy twins
  -> paper execution or policy block
  -> SHA-256 decision receipt
  -> judge evidence API and dashboard
```

## Verified Incident Dataset

The default replay is the France 2-1 Morocco World Cup quarter-final, fixture `18209181`.

- Source: `GET /api/odds/updates/18209181` and `GET /api/scores/updates/18209181`
- Raw TxLINE odds records inspected: `66,339`
- Replay events selected: match-winner prices plus kickoff, VAR, penalty, goals, cards, and full time
- Sample verified message: `1837057453:00003:000133-10021-stab`
- Sample timestamp: `1783632662348`
- Proof: `GET /api/odds/validation?messageId=...&ts=...`

The proof response contains the original odds row, batch update statistics, a subtree proof, and a main-tree proof. SignalDesk exposes a sanitized summary at `GET /api/judge/verified-input`.

## Live Mode

`GET /api/txline/pulse` makes a fresh server-side call to TxLINE's fixture snapshot. Each response includes:

- monotonic request sequence
- requested and received timestamps
- upstream latency and HTTP status
- live fixture count and a three-row sample
- SHA-256 hash of the upstream response body

The dashboard polls this endpoint every 2.5 seconds in Live mode. It never substitutes replay data into the Live panel.

## Risk Twin

Every replay event is evaluated three times with identical inputs:

- `normal`: full risk-approved paper notional
- `reduced`: half-sized executable and quoted notional
- `halted`: kill switch blocks every decision and sets executable notional to zero

The UI reports passed decisions, blocked decisions, executable notional, and notional prevented versus normal. The user-facing controls also allow confidence-floor and maximum-exposure changes.

## Agents

### Sharp Move

Compares consecutive de-margined implied probabilities. A move of at least 3.5 percentage points creates a momentum proposal. Confidence and notional scale with move size and observed volatility.

### Mean Reversion

Detects a controlled retrace after an implied-probability shock of at least 8 percentage points. It requires an opposite-direction retrace and elevated volatility before proposing a fade.

### Score Shock

Reacts to TxLINE goal, red-card, VAR, and penalty events. Confirmed goals reprice toward the scoring side; VAR and penalty windows pause execution.

### Market Maker

Maintains paper two-sided quotes around TxLINE consensus prices. Quote spread widens with realized probability volatility.

## Receipt Model

Each receipt stores:

- source mode and fixture ID
- TxLINE endpoint and source message/event ID
- event and decision timestamps
- proof status and public proof path
- SHA-256 hash of the canonical decision payload

For the verified replay, receipt proof status is `txline-validated`.

## Public API

- `GET /api/health`
- `GET /api/txline/status`
- `GET /api/txline/pulse`
- `GET /api/judge/evidence`
- `GET /api/judge/verified-input`
- `GET /api/replay/scenarios`
- `GET /api/replay/scenarios/:id`
- `GET /api/replay/stream/:id`
- `POST /api/engine/run/:id`
- `GET /api/txline/fixtures`
- `GET /api/txline/odds/snapshot/:fixtureId`
- `GET /api/txline/scores/snapshot/:fixtureId`
- `GET /api/txline/odds/stream`
- `GET /api/txline/scores/stream`
- `GET /api/txline/odds/validation`
- `GET /api/txline/scores/stat-validation`

## TxLINE Integration

Credentials are server-side only. Requests use:

```text
Authorization: Bearer ${TXLINE_GUEST_JWT}
X-Api-Token: ${TXLINE_API_TOKEN}
```

Mainnet service level 12 activation transaction:

`5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`

## Verification

```bash
cd app
pnpm test
pnpm build
```

The test suite checks real-data provenance, all four agent triggers, policy separation, kill-switch behavior, and deterministic receipt hashes.

`pnpm audit:replay` re-fetches the source odds history, parses the score SSE history, and validates the sample TxLINE message without writing credentials or raw data to disk.
