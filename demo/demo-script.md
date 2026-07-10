# SignalDesk Final Demo Runbook

Target length: 3:41. Hard limit: 5 minutes.

## 0:00 - 0:23 | Real TxLINE Input

- Open the public `/api/txline/pulse` origin in a terminal-style view.
- Re-request the live fixture snapshot so sequence, receive time, latency, fixture rows, and payload hash move on screen.
- Establish the problem: raw sports data is fast and difficult to govern.

## 0:23 - 0:45 | Live Mode

- Switch to the deployed SignalDesk application and click `Live`.
- Point to the request sequence, fixture sample, and sanitized JSON envelope.
- Keep the panel visible for multiple 2.5-second refreshes.

## 0:45 - 1:05 | Verified Replay

- Click `Verified replay`.
- Point to `TxLINE input verified`, `66,339 source records`, the score strip, and the selected fixture.
- Explain that the France 2-1 Morocco incident is reconstructed from TxLINE odds and score history rather than hand-authored UI animation.

## 1:05 - 1:58 | Autonomous Agents

- Select `0.5x` and press Play once.
- Do not make any trade clicks after playback starts.
- Hover Market Maker, Score Shock, Sharp Move, and Mean Reversion as each status and explanation changes.
- Keep the moving score, price chart, progress counter, and decision tape in view.

## 1:58 - 2:35 | Counterfactual Risk Twin

- Point across Normal, Reduced, and Halted policy results.
- Drag the confidence floor from 58% to 73%.
- Replace max exposure with `35000`.
- Click Reduced and restart at `4x`.
- Click Halted and restart the identical replay.
- Show all four agents as blocked, 23 blocked decisions, and `$0` executable notional.

## 2:35 - 2:58 | Receipts

- Click a decision row.
- Point to source mode, upstream endpoint, exact message ID, `txline-validated`, and the SHA-256 receipt hash.
- Point to the public verified-input proof route.

## 2:58 - 3:27 | Dynamic Judge Evidence

- Open the public `/api/judge/evidence` origin in the evidence shell.
- Put the cursor on the curl command and press Enter twice.
- Keep request count, live sequence, and generated-at time visible as they change.
- Show the 10-level subtree proof, 7-level main-tree proof, and source message ID.

## 3:27 - 3:41 | Close

- Return to the deployed dashboard and finish the replay at `4x`.
- End on all four executed agents, the 2-1 result, three policy outcomes, receipt tape, and TxLINE-validated proof.

## Required Capture Properties

- Chrome controlled only through CDP port `9888` and Playwright `connectOverCDP`.
- Browser window fully visible at 1920x1080 output with no other application covering it.
- Real pointer movement, hover, clicks, drag, text entry, and repeated network requests.
- Natural English narration aligned to the segment boundaries.
- H.264 video, AAC audio, normalized near -16 dB, under five minutes.
