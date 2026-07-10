# SignalDesk Submission Copy

## Project Title

SignalDesk: TxLINE Counterfactual Risk Control Plane

## Demo Video

https://youtu.be/bx2U81AaQHg

## Public Repo

https://github.com/greendhy/signaldesk-txline

## Application Access

https://signaldesk-txline.onrender.com

## Judge Evidence

- Evidence bundle: https://signaldesk-txline.onrender.com/api/judge/evidence
- Verified TxLINE input: https://signaldesk-txline.onrender.com/api/judge/verified-input
- Live TxLINE pulse: https://signaldesk-txline.onrender.com/api/txline/pulse

The evidence bundle returns fresh request timestamps, live fixture verification, the real replay provenance, all triggered agents, three counterfactual risk-policy results, a sample SHA-256 receipt, and a sanitized TxLINE Merkle-proof summary.

## Technical Documentation

https://github.com/greendhy/signaldesk-txline/blob/main/docs/technical-overview.md

## Short Description

SignalDesk is a risk control plane for autonomous TxLINE trading agents. It ingests live TxLINE data and replays a verified France 2-1 Morocco quarter-final incident, runs four deterministic strategies, then evaluates the exact same events under normal, reduced, and halted execution policies. Every paper decision produces a SHA-256 receipt tied to a TxLINE message ID and validation-proof path.

The core innovation is the counterfactual risk twin. Instead of showing only what an agent wanted to trade, SignalDesk shows what each policy would allow, block, or resize and how much exposure the policy prevents. This makes TxLINE useful to a professional trading operator who needs governance and auditability, not only signals.

## Concrete Proof

- Mainnet TxLINE service level 12 is active with server-side credentials.
- The live pulse makes a fresh `/api/fixtures/snapshot` request and exposes its request sequence, receive time, latency, fixture count, and response hash.
- The verified replay was derived from 66,339 TxLINE odds records plus the TxLINE score event stream for fixture `18209181`.
- Message `1837057453:00003:000133-10021-stab` is independently returned by TxLINE's odds-validation endpoint with subtree and main-tree proofs.
- The real replay triggers Sharp Move, Mean Reversion, Score Shock, and Market Maker without manual trade clicks.
- Halted policy blocks all 23 generated decisions and reduces executable notional to zero.

Mainnet subscription transaction:

`5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`

## TxLINE Endpoints Used

- `/api/fixtures/snapshot`
- `/api/odds/updates/{fixtureId}`
- `/api/scores/updates/{fixtureId}`
- `/api/odds/validation`

## TxLINE API Feedback

What worked well:

- StablePrice de-margined percentages are directly useful for deterministic trading logic.
- Fixture, historical update, snapshot, and SSE paths support both production monitoring and judge-safe replay.
- The odds validation endpoint gives a compelling provenance chain from a source message to an autonomous decision receipt.
- Server-side JWT and API-token authentication fits a professional control-plane architecture.

Friction and concrete suggestions:

- Odds percentages can contain `"NA"`, and clients need tolerant numeric normalization.
- Completed fixtures often return empty odds snapshots, so historical examples should explicitly direct builders to `/api/odds/updates/{fixtureId}`.
- `/api/scores/updates/{fixtureId}` returns an SSE-formatted historical sequence rather than a JSON array; the content type and parsing behavior should be prominent in the endpoint docs.
- A generated TypeScript SDK with PascalCase response types and SSE helpers would remove substantial integration work.
- Activation can return a plain-text token, so the response format and idempotency behavior should be documented explicitly.
