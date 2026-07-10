# Superteam Submission Draft

## Project Title

SignalDesk: Verifiable TxLINE Trading Command Center

## Brief Explanation

SignalDesk is an autonomous trading operations workbench for TxLINE. It ingests live or replayed odds and score feeds, runs deterministic strategy agents, applies risk controls, paper-executes decisions, and generates SHA-256 decision receipts tied to TxLINE event IDs and proof endpoints.

## Live MVP

https://signaldesk-txline.onrender.com

Public verification endpoints:

- `GET https://signaldesk-txline.onrender.com/api/health`
- `GET https://signaldesk-txline.onrender.com/api/txline/status`
- `GET https://signaldesk-txline.onrender.com/api/txline/fixtures`
- `GET https://signaldesk-txline.onrender.com/api/judge/evidence`

Render deployment is live with server-side TxLINE credentials. `GET /api/txline/fixtures` returns HTTP 200 with live TxLINE fixture JSON. `GET /api/judge/evidence` gives judges a machine-readable proof bundle: live fixture status, autonomous decision count, triggered agents, risk controls, TxLINE endpoints used, and a sample SHA-256 receipt hash.

## Demo Video

Pending recording.

## Public Repository

https://github.com/greendhy/signaldesk-txline

## Technical Documentation

Use `docs/technical-overview.md`.

## Live TxLINE Proof

- Mainnet subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Activation time: `2026-07-07T11:05:48.470Z`
- Local verification: `GET /api/txline/fixtures` returned HTTP 200 with live fixture JSON.
- Public verification: `GET https://signaldesk-txline.onrender.com/api/txline/fixtures` returned HTTP 200 with live fixture JSON.
- Public health: `GET https://signaldesk-txline.onrender.com/api/health` reports `liveReady: true`.
- Judge evidence: `GET https://signaldesk-txline.onrender.com/api/judge/evidence` reports live TxLINE fixtures and autonomous strategy receipts without exposing credentials.

## TxLINE API Feedback

What worked well:

- The separation between fixtures, odds, scores, streams, and validation endpoints makes it possible to build a clean ingestion layer.
- SSE streams are a strong fit for autonomous agents.
- The Merkle proof endpoints are a differentiator for trading and settlement workflows.
- Replay/historical endpoints are important because judging may happen outside live match windows.

Friction:

- Activation requires wallet flow plus guest JWT plus API token, so hackathon starter code should include a minimal copy-paste activation CLI.
- The activation endpoint can return a plain text token, so clients should document response format and idempotency clearly.
- The docs expose many field shapes; a downloadable TypeScript SDK or OpenAPI spec would reduce integration risk.
- More realistic sample payloads for soccer odds and score updates would speed local testing before live credentials are ready.
