# SignalDesk Product Spec

## One-Liner

SignalDesk is a verifiable trading command center for TxLINE: it ingests live or replayed odds and score feeds, runs autonomous strategy agents, paper-executes decisions under risk limits, and produces audit-ready decision receipts.

## Target Judge Reaction

"This is not just a hackathon odds alert. This is a deployable workflow a trading team or market operator could use to monitor TxLINE, test strategies, and prove why an automated decision happened."

## Core Product Surface

The first screen is the working command center:

- Feed status: replay/live, fixture, event clock, last TxLINE update, latency.
- Strategy agents: Sharp Move, Mean Reversion, Score Shock, Market Maker.
- Risk controls: max exposure, confidence threshold, cooldown, kill switch.
- Decision tape: signal, side, stake/notional, confidence, reason, status.
- Proof drawer: input hash, TxLINE endpoint, message id, fixture id, timestamp, proof status.
- Replay controls: play, pause, speed, reset, scenario selector.
- Judge checklist: live input, autonomous logic, deterministic strategy, production posture.

## Why This Can Beat Generic Entries

Competitors already appear to cover:

- Sharp movement detector.
- Prediction settlement.
- Basic TxLINE-backed fan/prediction apps.
- Backtest/signal workbench.

SignalDesk differentiates by combining:

- Multiple deterministic agents in one operations view.
- Decision receipts for every action.
- Replay mode built specifically for judge review after live match windows.
- Risk governance that makes it feel production-ready.
- A clear B2B posture: trading desk / market operator / intermediary.

## Strategy Agents

### Sharp Move

Detects fast implied probability changes within a rolling window. Emits momentum signals only when movement exceeds threshold and liquidity/recency checks pass.

### Mean Reversion

Detects overextended price movement after a shock and suggests fading when movement decelerates.

### Score Shock

Consumes score events such as goal, red card, corner, VAR, and game-state changes. Raises event-driven repricing signals.

### Market Maker

Maintains paper bid/ask quotes around consensus price, widens spread during volatility, and pauses during uncertain score states.

## Execution Model

No real-money wagering. All actions are paper executions or devnet-compatible settlement hooks.

Each decision contains:

- Strategy id and version.
- Source mode: replay, live, simulated-live.
- Fixture id.
- Message id or replay event id.
- Triggering odds/score event.
- Deterministic thresholds.
- Confidence score.
- Risk decision: accepted, throttled, blocked, paused.
- Receipt hash.

## TxLINE Endpoints To Support

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

## Demo Narrative

1. TxLINE emits odds and score updates.
2. SignalDesk ingests the feed live or via replay.
3. Agents run deterministic rules without manual input.
4. Risk engine decides whether a signal can execute.
5. Decision tape shows what happened.
6. Receipt proves exactly what data caused the decision.
7. Replay mode lets judges verify the workflow even when no match is live.

## Deployment Shape

Single Node service:

- Serves the React dashboard.
- Provides demo replay API.
- Proxies TxLINE server-side when credentials are configured.
- Keeps API token out of browser code.

Free-host target:

- Render, Railway, Fly, or similar Node host.
- Vercel is acceptable for static preview, but less ideal for long-lived SSE.

## Success Checklist

- App runs locally without credentials.
- Replay produces autonomous decisions.
- Live mode clearly shows missing credentials instead of crashing.
- When API token is added, TxLINE endpoints can be tested.
- Demo script fits under five minutes.
- Public README explains strategy and endpoints.
