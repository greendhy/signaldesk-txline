# SignalDesk: TxLINE Counterfactual Risk Control Plane

SignalDesk is an autonomous trading operations workbench for the TxODDS TxLINE World Cup hackathon. It turns real TxLINE odds and score events into deterministic agent decisions, compares those decisions under three execution policies, and emits SHA-256 receipts tied to TxLINE validation proofs.

The project targets the **Trading Tools and Agents** track. Execution is paper-only; SignalDesk does not place bets, custody funds, or route orders.

## Live MVP

- App: https://signaldesk-txline.onrender.com
- Demo video: https://youtu.be/bx2U81AaQHg
- Judge evidence: https://signaldesk-txline.onrender.com/api/judge/evidence
- Verified input proof: https://signaldesk-txline.onrender.com/api/judge/verified-input
- Live TxLINE pulse: https://signaldesk-txline.onrender.com/api/txline/pulse
- Public repository: https://github.com/greendhy/signaldesk-txline

## Winning Product Angle

SignalDesk is a control plane for autonomous sports-trading agents, not another alert bot. Its central feature is a counterfactual risk twin: the same TxLINE event sequence is evaluated under normal, reduced, and halted execution policies so an operator can see what would pass, what would be blocked, and how much exposure each policy prevents.

- Real TxLINE live pulse with request sequence, receive time, latency, fixture count, and payload hash.
- Verified incident replay from the France 2-1 Morocco quarter-final, derived from 66,339 TxLINE odds records plus the score event stream.
- Four deterministic agents: Sharp Move, Mean Reversion, Score Shock, and Market Maker.
- Counterfactual policy comparison across normal, reduced, and halted modes.
- Confidence floor, exposure cap, reduced sizing, and a kill switch.
- Decision receipts tied to TxLINE message IDs and the sponsor's Merkle validation endpoint.
- Runtime data routes keep TxLINE credentials server-side; public production wallet activation is disabled.
- Deterministic replay for judging when no match is live.

## Verifiable Data Chain

The default replay includes the real TxLINE message `1837057453:00003:000133-10021-stab` at timestamp `1783632662348`. TxLINE's `/api/odds/validation` endpoint returns the original odds record, update summary, subtree proof, and main-tree proof for that message.

SignalDesk then hashes each deterministic agent decision. A judge can trace:

```text
TxLINE message ID
  -> TxLINE Merkle validation proof
  -> deterministic strategy decision
  -> risk-policy result
  -> SHA-256 decision receipt
```

Mainnet free-tier activation transaction:

`5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`

## Run Locally

```bash
cd app
pnpm install
pnpm test
pnpm dev
```

Open `http://127.0.0.1:5173`. The API runs on `http://127.0.0.1:8790`.

## TxLINE Endpoints Used

- `GET /api/fixtures/snapshot` - fresh Live-mode pulse
- `GET /api/odds/updates/18209181` - verified odds history used to build the incident replay
- `GET /api/scores/updates/18209181` - verified score-event history used to build the incident replay
- `GET /api/odds/validation` - original message plus subtree and main-tree proof

SignalDesk also implements authenticated proxy routes for odds/score snapshots, streams, and score-stat validation. They are exposed as integration capabilities, not counted as evidence inputs for the submitted replay.

## Structure

- `app/` - React dashboard, Express API, strategy engine, and tests
- `docs/` - technical overview, product strategy, and competitor notes
- `demo/` - screenshots and the judge-demo walkthrough
- `submission/` - Superteam submission copy

## Deployment

Render deploys the app from `render.yaml`. TxLINE credentials are configured only as server environment variables:

```text
TXLINE_API_ORIGIN=https://txline.txodds.com
TXLINE_GUEST_JWT=...
TXLINE_API_TOKEN=...
```

Verified replay works without a currently active match. Live pulse and validation proof checks require the deployed TxLINE credentials.
