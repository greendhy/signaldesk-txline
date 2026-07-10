# SignalDesk Submission Copy

## Project Title

SignalDesk: Verifiable TxLINE Trading Command Center

## Demo Video

Pending: add Loom/YouTube link after final recording.

## Public Repo

https://github.com/greendhy/signaldesk-txline

## Application Access

https://signaldesk-txline.onrender.com

## Judge Evidence API

https://signaldesk-txline.onrender.com/api/judge/evidence

This endpoint returns a machine-readable proof bundle for judges: server-side TxLINE credential status, live fixture verification, autonomous strategy output, triggered agents, risk controls, TxLINE endpoints used, and a sample SHA-256 decision receipt.

## Brief Technical Documentation

https://github.com/greendhy/signaldesk-txline/blob/main/docs/technical-overview.md

## Short Description

SignalDesk is an autonomous trading operations workbench for TxLINE. It ingests live or replayed odds and score feeds, runs deterministic strategy agents, applies risk controls, paper-executes decisions, and generates SHA-256 receipts tied to TxLINE event IDs and proof endpoints.

Unlike a simple alert bot, SignalDesk is shaped like a production trading command center: replay-safe for judging, live-ready through server-side TxLINE credentials, governed by confidence/exposure controls, and auditable through deterministic receipts.

## TxLINE Endpoints Used

- `/api/fixtures/snapshot`
- `/api/odds/stream`
- `/api/scores/stream`
- `/api/odds/validation`
- `/api/scores/stat-validation`

## TxLINE Proof

- Mainnet subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Public health: `https://signaldesk-txline.onrender.com/api/health`
- Public fixtures: `https://signaldesk-txline.onrender.com/api/txline/fixtures`
- Public evidence: `https://signaldesk-txline.onrender.com/api/judge/evidence`

## TxLINE API Feedback

What worked well:

- The fixtures, odds, scores, streams, and validation endpoints make it possible to build a clean ingestion layer.
- SSE streams are a strong fit for autonomous trading agents.
- Merkle proof endpoints are a useful differentiator for auditability and settlement workflows.
- Replay/historical support matters because judging may happen outside live match windows.

Friction:

- Activation requires wallet flow plus guest JWT plus API token; a minimal starter CLI would reduce onboarding time.
- The token activation response can be plain text, so the docs should state response format and idempotency clearly.
- A TypeScript SDK or OpenAPI spec would reduce field-shape integration risk.
- More realistic sample payloads for soccer odds and score updates would speed local testing before live credentials are ready.
