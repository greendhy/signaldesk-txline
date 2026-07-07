# Superteam Submission Draft

## Project Title

SignalDesk: Verifiable TxLINE Trading Command Center

## Brief Explanation

SignalDesk is an autonomous trading operations workbench for TxLINE. It ingests live or replayed odds and score feeds, runs deterministic strategy agents, applies risk controls, paper-executes decisions, and generates SHA-256 decision receipts tied to TxLINE event IDs and proof endpoints.

## Live MVP

Pending deployment. Local live mode has been activated against TxLINE mainnet and verified through `GET /api/txline/fixtures`.

## Demo Video

Pending recording.

## Public Repository

Pending GitHub setup.

## Technical Documentation

Use `docs/technical-overview.md`.

## Live TxLINE Proof

- Mainnet subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- Activation time: `2026-07-07T11:05:48.470Z`
- Verified endpoint: `GET /api/txline/fixtures` returned HTTP 200 with live fixture JSON.

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
