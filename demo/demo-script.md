# SignalDesk Demo Script

Target length: 3:45 to 4:20. Hard limit: 5 minutes.

## 0:00 - 0:22 | Raw TxLINE input

Show a black terminal view making repeated real requests to `/api/txline/pulse`. Let the request sequence, receive timestamp, latency, fixture rows, and payload hash visibly change.

Narration:

"Raw sports data is fast, noisy, and difficult to govern. This is a real TxLINE mainnet pulse: every request has a new sequence, receive time, latency measurement, and hash. SignalDesk turns that stream into an operator-ready control plane."

Cut from the terminal to SignalDesk Live mode.

## 0:22 - 0:55 | Live mode

Point at the request sequence and hover over the fixture rows. Wait for at least one automatic refresh so the sequence changes on screen.

Narration:

"Live mode never substitutes replay data. The backend keeps TxLINE credentials server-side, fetches the fixture snapshot, hashes the response, and refreshes this sanitized envelope every two and a half seconds."

## 0:55 - 1:25 | Verified incident replay

Click `Verified replay`. Point to `TxLINE input verified`, `66,339 source records`, and the France 2-1 Morocco fixture.

Narration:

"Judging may happen between matches, so the default incident replay uses real TxLINE history: 66,339 odds records and the score event stream from the France-Morocco quarter-final. This is historical TxLINE input, not a synthetic animation."

## 1:25 - 2:20 | Four autonomous agents

Click `4x`, then Play. As narration names each agent, move the pointer onto the matching card and hold long enough for its hover highlight. Let goals and the probability shock visibly update the chart and decision tape.

Narration:

"Once the feed starts, there are no manual trade clicks. Sharp Move follows large implied-probability changes. Score Shock reacts to goals, VAR, and penalty windows. Mean Reversion detects a controlled retrace after a market shock. Market Maker maintains two-sided paper quotes and widens its spread with volatility."

## 2:20 - 3:12 | Counterfactual risk twin

Point across Normal, Reduced, and Halted. Drag the confidence floor, edit max exposure, click Reduced, then Halted. Restart the replay under Halted and show blocked decisions with zero notional.

Narration:

"The differentiator is the risk twin. SignalDesk evaluates the same TxLINE events under three policies. Normal allows about two hundred seventeen thousand dollars of paper notional. Reduced halves it. Halted blocks all twenty-three decisions and takes executable notional to zero. Operators can change the confidence floor and exposure cap, then see policy effects immediately."

## 3:12 - 3:42 | Receipt and TxLINE proof

Click a decision row. Point to source mode, message ID, `txline-validated`, receipt hash, and `/api/judge/verified-input`.

Narration:

"Each decision becomes a deterministic SHA-256 receipt. This one links back to a real TxLINE message ID. The public verification endpoint asks TxLINE for the original odds row, update summary, subtree proof, and main-tree proof, without exposing our API token."

## 3:42 - 4:05 | Dynamic evidence API

Open `/api/judge/evidence`. Point to `verifiedInputProof`, `counterfactualRisk`, and `generatedAt`. Refresh the browser. Make sure `generatedAt` and the live pulse sequence visibly change.

Narration:

"Judges can verify the whole system without trusting the UI. This endpoint recomputes live feed evidence, all four agents, all three risk policies, and the TxLINE proof summary. Refreshing creates a new timestamp and request sequence because this is a running backend."

## 4:05 - 4:18 | Close

Return to the finished dashboard.

Narration:

"SignalDesk makes TxLINE deployable as a governed trading data layer: real input, autonomous decisions, counterfactual controls, and verifiable receipts."
