# Superteam Submission Draft

## Project Title

SignalDesk: TxLINE Counterfactual Risk Control Plane

## Brief Explanation

SignalDesk is a governed execution workbench for autonomous TxLINE trading agents. It combines a continuously refreshing live TxLINE pulse with a verified France 2-1 Morocco incident replay, runs four deterministic strategies, and evaluates the same events under normal, reduced, and halted risk policies. Every paper decision produces a SHA-256 receipt tied to a TxLINE source message and public Merkle-proof path.

Its novel feature is a counterfactual risk twin: judges can see not only what an agent proposed, but what each policy would pass, resize, or block and the paper exposure prevented by each policy.

## Links

- App: https://signaldesk-txline.onrender.com
- Repo: https://github.com/greendhy/signaldesk-txline
- Technical docs: https://github.com/greendhy/signaldesk-txline/blob/main/docs/technical-overview.md
- Judge evidence: https://signaldesk-txline.onrender.com/api/judge/evidence
- Verified input proof: https://signaldesk-txline.onrender.com/api/judge/verified-input
- Live pulse: https://signaldesk-txline.onrender.com/api/txline/pulse
- Demo video: pending final recording and user approval

## Live TxLINE Proof

- Mainnet service level 12 is active with server-side JWT/API-token credentials.
- Subscription transaction: `5eCDXbZTx82XJx4jUAYRrVQuJsTxZ2kAQDrKRoQowto1iJ2NdsYFyrjBVUnboTN8WFMJDoALLzjH7bFTBhPXJwUB`
- `/api/txline/pulse` makes a fresh fixture-snapshot request and returns sequence, receive time, latency, fixture count, and payload hash.
- The default replay was derived from 66,339 TxLINE odds records and the score event stream for fixture `18209181`.
- `/api/judge/verified-input` confirms sample message `1837057453:00003:000133-10021-stab` through TxLINE's odds-validation proof.

## TxLINE Endpoints Used

- `/api/fixtures/snapshot`
- `/api/odds/updates/{fixtureId}`
- `/api/scores/updates/{fixtureId}`
- `/api/odds/validation`

## TxLINE API Feedback

What worked well:

- StablePrice de-margined percentages are strong deterministic strategy inputs.
- Historical updates plus SSE streams support both production monitoring and reliable judging.
- Merkle validation creates a compelling provenance chain for autonomous decisions.
- Server-side credentials fit a B2B control-plane architecture.

Friction:

- Odds `Pct` values can be `"NA"`, so a typed SDK should model numeric-or-missing values.
- Completed fixtures can have empty snapshots; docs should point builders to historical update endpoints.
- `/api/scores/updates/{fixtureId}` returns SSE-formatted history, which should be more explicit in the API reference.
- A generated TypeScript SDK with response types and SSE parsing would materially reduce integration time.
- Token activation can return plain text; response format and idempotency should be documented.
