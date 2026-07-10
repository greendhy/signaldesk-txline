import assert from "node:assert/strict";
import test from "node:test";
import { defaultRiskConfig, runScenario } from "./engine";
import { replayScenarios } from "./replayScenarios";

const verifiedScenario = replayScenarios[0];

function decisionsFor(mode: "normal" | "reduced" | "halted") {
  return runScenario(
    verifiedScenario,
    { ...defaultRiskConfig, mode },
    "verified-replay",
  ).flatMap((tick) => tick.decisions);
}

test("verified replay records real TxLINE provenance", () => {
  assert.equal(verifiedScenario.fixture.fixtureId, 18_209_181);
  assert.equal(verifiedScenario.provenance?.kind, "txline-verified");
  assert.equal(verifiedScenario.provenance?.sourceRecordCount, 66_339);
});

test("real incident replay triggers all four deterministic agents", () => {
  const decisions = decisionsFor("normal");
  assert.deepEqual(
    new Set(decisions.map((decision) => decision.agent)),
    new Set(["sharp-move", "mean-reversion", "score-shock", "market-maker"]),
  );
  assert.ok(decisions.every((decision) => decision.receipt.proofStatus === "txline-validated"));
  assert.ok(decisions.some((decision) => decision.receipt.proofHint.includes("/api/txline/odds/validation")));
});

test("risk twin produces materially different execution envelopes", () => {
  const normal = decisionsFor("normal");
  const reduced = decisionsFor("reduced");
  const halted = decisionsFor("halted");
  const executableNotional = (decisions: typeof normal) =>
    decisions
      .filter((decision) => decision.status === "executed" || decision.status === "quoted")
      .reduce((sum, decision) => sum + decision.notional, 0);

  assert.ok(executableNotional(normal) > executableNotional(reduced));
  assert.equal(executableNotional(halted), 0);
  assert.ok(halted.every((decision) => decision.status === "blocked"));
});

test("decision receipts are deterministic for the same input and policy", () => {
  const first = decisionsFor("normal").map((decision) => decision.receipt.payloadHash);
  const second = decisionsFor("normal").map((decision) => decision.receipt.payloadHash);
  assert.deepEqual(first, second);
});
