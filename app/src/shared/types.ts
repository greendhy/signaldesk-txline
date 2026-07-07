export type FeedMode = "replay" | "live" | "simulated-live";

export type AgentId =
  | "sharp-move"
  | "mean-reversion"
  | "score-shock"
  | "market-maker";

export type DecisionStatus = "executed" | "quoted" | "blocked" | "paused";

export type TradeSide =
  | "back-participant-1"
  | "back-participant-2"
  | "lay-participant-1"
  | "lay-participant-2"
  | "quote-two-sided"
  | "hold";

export type RiskMode = "normal" | "reduced" | "halted";

export type ProofStatus = "available" | "pending-live-token" | "simulated" | "not-requested";

export type Fixture = {
  fixtureId: number;
  competition: string;
  participant1: string;
  participant2: string;
  startTime: number;
};

export type OddsUpdate = {
  kind: "odds";
  fixtureId: number;
  messageId: string;
  ts: number;
  bookmaker: string;
  market: "match-winner" | "total-goals" | "spread";
  marketPeriod: "full-time" | "in-play";
  gameState: string;
  participant1: string;
  participant2: string;
  priceNames: string[];
  prices: number[];
  implied: number[];
  inRunning: boolean;
};

export type ScoreUpdate = {
  kind: "score";
  fixtureId: number;
  eventId: string;
  ts: number;
  minute: number;
  gameState: string;
  action: "kickoff" | "goal" | "red-card" | "yellow-card" | "corner" | "var" | "halftime";
  participant?: 1 | 2;
  participant1Goals: number;
  participant2Goals: number;
  severity: number;
};

export type FeedEvent = OddsUpdate | ScoreUpdate;

export type ReplayEvent = {
  offsetMs: number;
  source: "txline-replay";
  event: FeedEvent;
};

export type ReplayScenario = {
  id: string;
  name: string;
  fixture: Fixture;
  description: string;
  events: ReplayEvent[];
};

export type RiskConfig = {
  mode: RiskMode;
  maxExposure: number;
  confidenceFloor: number;
  cooldownMs: number;
  maxSingleNotional: number;
};

export type StrategyState = {
  exposureBySide: Record<string, number>;
  lastDecisionAt: Record<AgentId, number>;
  oddsHistory: OddsUpdate[];
  scoreHistory: ScoreUpdate[];
  volatility: number;
};

export type DecisionReceipt = {
  receiptId: string;
  payloadHash: string;
  sourceMode: FeedMode;
  fixtureId: number;
  txlineEndpoint: string;
  sourceMessageId: string;
  eventTimestamp: number;
  generatedAt: number;
  proofStatus: ProofStatus;
  proofHint: string;
};

export type AgentDecision = {
  id: string;
  at: number;
  agent: AgentId;
  agentLabel: string;
  status: DecisionStatus;
  side: TradeSide;
  confidence: number;
  notional: number;
  price?: number;
  reason: string;
  riskNote: string;
  receipt: DecisionReceipt;
};

export type EngineTick = {
  event: FeedEvent;
  decisions: AgentDecision[];
  state: StrategyState;
};

export type DashboardSnapshot = {
  mode: FeedMode;
  fixture: Fixture;
  latestEvent?: FeedEvent;
  decisions: AgentDecision[];
  state: StrategyState;
};
