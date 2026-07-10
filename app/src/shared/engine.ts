import type {
  AgentDecision,
  AgentId,
  DecisionReceipt,
  FeedEvent,
  FeedMode,
  OddsUpdate,
  ReplayScenario,
  RiskConfig,
  ScoreUpdate,
  StrategyState,
  TradeSide,
} from "./types";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

export const defaultRiskConfig: RiskConfig = {
  mode: "normal",
  maxExposure: 100_000,
  confidenceFloor: 58,
  cooldownMs: 18_000,
  maxSingleNotional: 12_500,
};

const agentLabels: Record<AgentId, string> = {
  "sharp-move": "Sharp Move",
  "mean-reversion": "Mean Reversion",
  "score-shock": "Score Shock",
  "market-maker": "Market Maker",
};

export function createInitialState(): StrategyState {
  return {
    exposureBySide: {},
    lastDecisionAt: {
      "sharp-move": 0,
      "mean-reversion": 0,
      "score-shock": 0,
      "market-maker": 0,
    },
    oddsHistory: [],
    scoreHistory: [],
    volatility: 0,
  };
}

export function runScenario(
  scenario: ReplayScenario,
  riskConfig: RiskConfig = defaultRiskConfig,
  mode: FeedMode = "replay",
) {
  const state = createInitialState();
  return scenario.events.map((replayEvent) => {
    const decisions = processEvent(replayEvent.event, state, riskConfig, mode);
    return {
      event: replayEvent.event,
      decisions,
      state: cloneState(state),
    };
  });
}

export function processEvent(
  event: FeedEvent,
  state: StrategyState,
  riskConfig: RiskConfig = defaultRiskConfig,
  mode: FeedMode = "replay",
): AgentDecision[] {
  updateState(event, state);

  const proposed = [
    sharpMoveAgent(event, state, mode),
    meanReversionAgent(event, state, mode),
    scoreShockAgent(event, state, mode),
    marketMakerAgent(event, state, mode),
  ].filter(Boolean) as AgentDecision[];

  return proposed.map((decision) => applyRisk(decision, state, riskConfig));
}

function updateState(event: FeedEvent, state: StrategyState) {
  if (event.kind === "odds") {
    state.oddsHistory.push(event);
    state.oddsHistory = state.oddsHistory.slice(-20);
    state.volatility = computeVolatility(state.oddsHistory);
  } else {
    state.scoreHistory.push(event);
    state.scoreHistory = state.scoreHistory.slice(-20);
  }
}

function sharpMoveAgent(
  event: FeedEvent,
  state: StrategyState,
  mode: FeedMode,
): AgentDecision | undefined {
  if (event.kind !== "odds" || state.oddsHistory.length < 2) return undefined;

  const previous = state.oddsHistory[state.oddsHistory.length - 2];
  const delta1 = event.implied[0] - previous.implied[0];
  const delta2 = event.implied[2] - previous.implied[2];
  const strongerDelta = Math.abs(delta1) >= Math.abs(delta2) ? delta1 : delta2;
  const side: TradeSide =
    Math.abs(delta1) >= Math.abs(delta2)
      ? delta1 > 0
        ? "back-participant-1"
        : "lay-participant-1"
      : delta2 > 0
        ? "back-participant-2"
        : "lay-participant-2";

  if (Math.abs(strongerDelta) < 0.035) return undefined;

  const confidence = clamp(62 + Math.abs(strongerDelta) * 420 + state.volatility * 40, 0, 96);
  const notional = Math.round(4_000 + Math.abs(strongerDelta) * 80_000);

  return makeDecision({
    agent: "sharp-move",
    event,
    mode,
    side,
    confidence,
    notional,
    price: side.includes("participant-1") ? event.prices[0] : event.prices[2],
    reason: `${formatPct(strongerDelta)} implied-probability move in ${event.market} within the replay window.`,
  });
}

function meanReversionAgent(
  event: FeedEvent,
  state: StrategyState,
  mode: FeedMode,
): AgentDecision | undefined {
  if (event.kind !== "odds" || state.oddsHistory.length < 4) return undefined;

  const recent = state.oddsHistory.slice(-4);
  const changes = recent.slice(1).map((item, index) => item.implied[0] - recent[index].implied[0]);
  const impulse = changes[1];
  const retrace = changes[2];
  const reversed = Math.sign(retrace) !== Math.sign(impulse);
  const stretched = Math.abs(impulse) >= 0.08;
  const controlledRetrace = Math.abs(retrace) >= 0.008 && Math.abs(retrace) <= Math.abs(impulse) * 0.5;

  if (!reversed || !stretched || !controlledRetrace || state.volatility < 0.02) return undefined;

  const side: TradeSide = impulse > 0 ? "lay-participant-1" : "back-participant-1";
  const confidence = clamp(60 + Math.abs(impulse) * 55 + state.volatility * 240, 0, 90);

  return makeDecision({
    agent: "mean-reversion",
    event,
    mode,
    side,
    confidence,
    notional: Math.round(3_500 + state.volatility * 35_000),
    price: event.prices[0],
    reason: `Probability retraced ${formatPct(retrace)} after a ${formatPct(impulse)} shock; fade only if risk accepts.`,
  });
}

function scoreShockAgent(
  event: FeedEvent,
  _state: StrategyState,
  mode: FeedMode,
): AgentDecision | undefined {
  if (event.kind !== "score") return undefined;
  if (!["goal", "red-card", "var", "penalty"].includes(event.action)) return undefined;

  let side: TradeSide = "hold";
  let notional = 0;
  let confidence = 60 + event.severity * 30;
  let reason = `${event.action.toUpperCase()} score event at minute ${event.minute}.`;

  if (event.action === "goal") {
    side = event.participant === 1 ? "back-participant-1" : "back-participant-2";
    notional = 9_000;
    reason = `Goal confirmed for participant ${event.participant}; repricing agent follows the scoring side.`;
  }

  if (event.action === "red-card") {
    side = event.participant === 1 ? "lay-participant-1" : "lay-participant-2";
    notional = 7_500;
    reason = `Red card against participant ${event.participant}; agent reduces exposure to the affected side.`;
  }

  if (event.action === "var") {
    side = "hold";
    notional = 0;
    confidence = 74;
    reason = "VAR uncertainty detected; execution pauses while market-maker spread widens.";
  }

  if (event.action === "penalty") {
    side = "hold";
    notional = 0;
    confidence = 78;
    reason = "Penalty review window detected; execution pauses until the market reprices.";
  }

  return makeDecision({
    agent: "score-shock",
    event,
    mode,
    side,
    confidence,
    notional,
    reason,
  });
}

function marketMakerAgent(
  event: FeedEvent,
  state: StrategyState,
  mode: FeedMode,
): AgentDecision | undefined {
  if (event.kind !== "odds") return undefined;

  const spreadBps = Math.round(80 + state.volatility * 2_400);
  const confidence = clamp(72 - state.volatility * 220, 40, 82);

  return makeDecision({
    agent: "market-maker",
    event,
    mode,
    side: "quote-two-sided",
    confidence,
    notional: Math.round(5_000 + (1 - Math.min(state.volatility, 0.2)) * 6_000),
    price: event.prices[0],
    reason: `Two-sided quote maintained with ${spreadBps} bps spread from current volatility.`,
    quoted: true,
  });
}

function makeDecision(params: {
  agent: AgentId;
  event: FeedEvent;
  mode: FeedMode;
  side: TradeSide;
  confidence: number;
  notional: number;
  reason: string;
  price?: number;
  quoted?: boolean;
}): AgentDecision {
  const sourceMessageId = params.event.kind === "odds" ? params.event.messageId : params.event.eventId;
  const endpoint = endpointForEvent(params.event);
  const generatedAt = params.event.ts + 350;
  const receipt = makeReceipt({
    mode: params.mode,
    fixtureId: params.event.fixtureId,
    endpoint,
    sourceMessageId,
    eventTimestamp: params.event.ts,
    generatedAt,
    proofStatus:
      params.mode === "verified-replay"
        ? "txline-validated"
        : params.mode === "live"
          ? "pending-live-token"
          : "simulated",
    payload: {
      agent: params.agent,
      event: params.event,
      side: params.side,
      confidence: Math.round(params.confidence),
      notional: params.notional,
      reason: params.reason,
    },
  });

  return {
    id: `${params.agent}-${sourceMessageId}`,
    at: generatedAt,
    agent: params.agent,
    agentLabel: agentLabels[params.agent],
    status: params.quoted ? "quoted" : params.side === "hold" ? "paused" : "executed",
    side: params.side,
    confidence: Math.round(params.confidence),
    notional: params.notional,
    price: params.price,
    reason: params.reason,
    riskNote: "Accepted by default risk policy.",
    receipt,
  };
}

function applyRisk(
  decision: AgentDecision,
  state: StrategyState,
  riskConfig: RiskConfig,
): AgentDecision {
  const updated = { ...decision };
  const lastAt = state.lastDecisionAt[decision.agent] || 0;
  const currentExposure = state.exposureBySide[decision.side] || 0;
  const wouldExpose = currentExposure + Math.max(0, decision.notional);

  if (riskConfig.mode === "halted") {
    return block(updated, "Kill switch is active.");
  }

  if (decision.status !== "quoted" && decision.confidence < riskConfig.confidenceFloor) {
    return block(updated, `Confidence ${decision.confidence} is below floor ${riskConfig.confidenceFloor}.`);
  }

  if (decision.status !== "quoted" && lastAt && decision.at - lastAt < riskConfig.cooldownMs) {
    return block(updated, `Agent cooldown active for ${Math.ceil((riskConfig.cooldownMs - (decision.at - lastAt)) / 1000)}s.`);
  }

  if (decision.notional > riskConfig.maxSingleNotional) {
    updated.notional = riskConfig.maxSingleNotional;
    updated.riskNote = `Clipped to max single notional ${formatMoney(riskConfig.maxSingleNotional)}.`;
  }

  if (wouldExpose > riskConfig.maxExposure) {
    return block(updated, `Exposure cap ${formatMoney(riskConfig.maxExposure)} would be exceeded.`);
  }

  if (updated.status === "executed") {
    if (riskConfig.mode === "reduced") {
      updated.notional = Math.round(updated.notional * 0.5);
      updated.riskNote = "Reduced mode halves executable strategy notional.";
    }
    state.exposureBySide[updated.side] = currentExposure + updated.notional;
    state.lastDecisionAt[updated.agent] = updated.at;
  }

  if (updated.status === "quoted" && riskConfig.mode === "reduced") {
    updated.notional = Math.round(updated.notional * 0.5);
    updated.riskNote = "Reduced mode halves market-maker quote size.";
  }

  return updated;
}

function block(decision: AgentDecision, note: string): AgentDecision {
  return {
    ...decision,
    status: "blocked",
    notional: 0,
    riskNote: note,
  };
}

function makeReceipt(input: {
  mode: FeedMode;
  fixtureId: number;
  endpoint: string;
  sourceMessageId: string;
  eventTimestamp: number;
  generatedAt: number;
  proofStatus: DecisionReceipt["proofStatus"];
  payload: unknown;
}): DecisionReceipt {
  const payloadHash = stableHash(input.payload);
  return {
    receiptId: `rcpt-${payloadHash.slice(0, 12)}`,
    payloadHash,
    sourceMode: input.mode,
    fixtureId: input.fixtureId,
    txlineEndpoint: input.endpoint,
    sourceMessageId: input.sourceMessageId,
    eventTimestamp: input.eventTimestamp,
    generatedAt: input.generatedAt,
    proofStatus: input.proofStatus,
    proofHint:
      input.proofStatus === "txline-validated"
        ? `/api/txline/odds/validation?messageId=${encodeURIComponent(input.sourceMessageId)}&ts=${input.eventTimestamp}`
        : input.proofStatus === "pending-live-token"
          ? "Use /api/odds/validation or /api/scores/stat-validation after API activation."
          : "Synthetic stress-test receipt mirrors the TxLINE proof shape.",
  };
}

function endpointForEvent(event: FeedEvent) {
  if (event.kind === "odds") return "/api/odds/stream";
  if (event.action === "goal" || event.action === "red-card" || event.action === "var") {
    return "/api/scores/stream";
  }
  return "/api/scores/snapshot/{fixtureId}";
}

function computeVolatility(history: OddsUpdate[]) {
  if (history.length < 2) return 0;
  const changes = history.slice(1).map((item, index) => item.implied[0] - history[index].implied[0]);
  return changes.reduce((sum, change) => sum + Math.abs(change), 0) / changes.length;
}

function stableHash(value: unknown) {
  const text = stableStringify(value);
  return bytesToHex(sha256(new TextEncoder().encode(text)));
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function cloneState(state: StrategyState): StrategyState {
  return {
    exposureBySide: { ...state.exposureBySide },
    lastDecisionAt: { ...state.lastDecisionAt },
    oddsHistory: [...state.oddsHistory],
    scoreHistory: [...state.scoreHistory],
    volatility: state.volatility,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function formatPct(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}pp`;
}

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function describeScore(event: ScoreUpdate) {
  return `${event.participant1Goals}-${event.participant2Goals}, ${event.minute}'`;
}
