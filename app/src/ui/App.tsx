import {
  Activity,
  BadgeCheck,
  CirclePause,
  CirclePlay,
  Gauge,
  Radio,
  ReceiptText,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  defaultRiskConfig,
  describeScore,
  formatMoney,
  processEvent,
  runScenario,
} from "../shared/engine";
import { replayScenarios } from "../shared/replayScenarios";
import type {
  AgentDecision,
  AgentId,
  FeedEvent,
  FeedMode,
  ReplayScenario,
  RiskConfig,
  StrategyState,
} from "../shared/types";
import { ActivateTxline } from "./ActivateTxline";

const speedOptions = [0.5, 1, 2, 4];

type LiveProof = {
  status: "checking" | "ready" | "missing";
  apiOrigin?: string;
  fixtureCount?: number;
  checkedAt?: string;
  sequence?: number;
  latencyMs?: number;
  payloadHash?: string | null;
  sample?: Array<{
    fixtureId: number;
    competition: string;
    participant1: string;
    participant2: string;
    startTime: number;
  }>;
};

export function App() {
  if (window.location.pathname === "/activate") {
    return <ActivateTxline />;
  }

  const [mode, setMode] = useState<FeedMode>("verified-replay");
  const [scenarioId, setScenarioId] = useState(replayScenarios[0].id);
  const [risk, setRisk] = useState<RiskConfig>(defaultRiskConfig);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const [index, setIndex] = useState(0);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<"checking" | "ready" | "missing">("checking");
  const [liveProof, setLiveProof] = useState<LiveProof>({ status: "checking" });

  const scenario = useMemo(
    () => replayScenarios.find((item) => item.id === scenarioId) || replayScenarios[0],
    [scenarioId],
  );

  const ticks = useMemo(
    () =>
      mode === "live"
        ? []
        : runScenario(scenario, risk, scenario.provenance ? "verified-replay" : "replay"),
    [scenario, risk, mode],
  );
  const visibleTicks = ticks.slice(0, index + 1);
  const latestTick = visibleTicks.at(-1);
  const latestEvent = latestTick?.event || scenario.events[0].event;
  const decisions = visibleTicks.flatMap((tick) => tick.decisions).reverse();
  const selectedDecision = decisions.find((decision) => decision.id === selectedDecisionId) || decisions[0];
  const state =
    latestTick?.state ||
    runScenario(scenario, risk, scenario.provenance ? "verified-replay" : "replay")[0]?.state;

  useEffect(() => {
    let mounted = true;
    let timer: number | undefined;

    const refresh = () =>
      fetch("/api/txline/pulse", { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!mounted) return;
        const status = response.ok && data.status === "verified" ? "ready" : "missing";
        setLiveStatus(status);
        setLiveProof({
          status,
          apiOrigin: data.source || "TxLINE mainnet",
          fixtureCount: data.fixtureCount,
          checkedAt: data.receivedAt || new Date().toISOString(),
          sequence: data.sequence,
          latencyMs: data.latencyMs,
          payloadHash: data.payloadHash,
          sample: data.sample,
        });
      })
      .catch(() => {
        if (!mounted) return;
        setLiveStatus("missing");
        setLiveProof({ status: "missing", checkedAt: new Date().toISOString() });
      });

    refresh();
    if (mode === "live") timer = window.setInterval(refresh, 2_500);

    return () => {
      mounted = false;
      if (timer) window.clearInterval(timer);
    };
  }, [mode]);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        if (current >= ticks.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, Math.max(180, 900 / speed));
    return () => window.clearInterval(timer);
  }, [isPlaying, speed, ticks.length]);

  useEffect(() => {
    setIndex(0);
    setSelectedDecisionId(null);
    setIsPlaying(false);
  }, [scenarioId, risk.mode, risk.confidenceFloor, risk.maxExposure, mode]);

  return (
    <main className="app-shell">
      <TopBar
        mode={mode}
        setMode={setMode}
        liveStatus={liveStatus}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying((value) => !value)}
        onReset={() => {
          setIndex(0);
          setSelectedDecisionId(null);
          setIsPlaying(false);
        }}
      />

      <section className="workspace">
        <FeedPanel
          mode={mode}
          liveProof={liveProof}
          scenario={scenario}
          scenarioId={scenarioId}
          setScenarioId={setScenarioId}
          latestEvent={latestEvent}
          state={state}
          index={index}
          total={ticks.length}
          speed={speed}
          setSpeed={setSpeed}
        />

        <section className="center-stack">
          <AgentGrid decisions={decisions} mode={mode} />
          <CounterfactualPanel scenario={scenario} risk={risk} />
          <DecisionTape
            decisions={decisions}
            selectedDecisionId={selectedDecision?.id}
            onSelect={setSelectedDecisionId}
          />
        </section>

        <aside className="right-stack">
          <RiskPanel risk={risk} setRisk={setRisk} />
          <ReceiptPanel
            decision={selectedDecision}
            latestEvent={latestEvent}
            mode={mode}
            liveStatus={liveStatus}
            liveProof={liveProof}
            scenario={scenario}
          />
        </aside>
      </section>
    </main>
  );
}

function TopBar(props: {
  mode: FeedMode;
  setMode: (mode: FeedMode) => void;
  liveStatus: "checking" | "ready" | "missing";
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
}) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <div className="brand-mark">
          <Activity size={18} />
        </div>
        <div>
          <h1>SignalDesk</h1>
          <span>TxLINE risk control plane</span>
        </div>
      </div>

      <div className="segmented" aria-label="mode">
        <button className={props.mode !== "live" ? "active" : ""} onClick={() => props.setMode("verified-replay")}>
          Verified replay
        </button>
        <button className={props.mode === "live" ? "active" : ""} onClick={() => props.setMode("live")}>
          Live
        </button>
      </div>

      <div className="status-row">
        <StatusPill
          tone={props.liveStatus === "ready" ? "good" : "warn"}
          label={props.liveStatus === "ready" ? "TxLINE live" : "TxLINE unavailable"}
        />
        <StatusPill tone="neutral" label="Paper execution" />
      </div>

      <div className="toolbar">
        <button
          className="icon-button"
          onClick={props.onPlayPause}
          title={props.mode === "live" ? "Live pulse runs automatically" : props.isPlaying ? "Pause replay" : "Play replay"}
          disabled={props.mode === "live"}
        >
          {props.isPlaying ? <CirclePause size={20} /> : <CirclePlay size={20} />}
        </button>
        <button className="icon-button" onClick={props.onReset} title="Reset replay" disabled={props.mode === "live"}>
          <RefreshCcw size={18} />
        </button>
      </div>
    </header>
  );
}

function FeedPanel(props: {
  mode: FeedMode;
  liveProof: LiveProof;
  scenario: ReplayScenario;
  scenarioId: string;
  setScenarioId: (id: string) => void;
  latestEvent: FeedEvent;
  state?: StrategyState;
  index: number;
  total: number;
  speed: number;
  setSpeed: (speed: number) => void;
}) {
  if (props.mode === "live") {
    return <LiveFeedPanel proof={props.liveProof} />;
  }

  const latestOdds = props.state?.oddsHistory.at(-1);
  const latestScore = props.state?.scoreHistory.at(-1);

  return (
    <section className="panel feed-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Feed</span>
          <h2>{props.scenario.fixture.participant1} vs {props.scenario.fixture.participant2}</h2>
        </div>
        <Radio size={20} />
      </div>

      <label className="field-label" htmlFor="scenario">Dataset</label>
      <select
        id="scenario"
        className="select"
        value={props.scenarioId}
        onChange={(event) => props.setScenarioId(event.target.value)}
      >
        {replayScenarios.map((scenario) => (
          <option key={scenario.id} value={scenario.id}>
            {scenario.name}
          </option>
        ))}
      </select>

      {props.scenario.provenance && (
        <div className="verified-strip" data-testid="verified-dataset">
          <BadgeCheck size={16} />
          <div>
            <strong>TxLINE input verified</strong>
            <span>{props.scenario.provenance.sourceRecordCount.toLocaleString("en-US")} source records</span>
          </div>
        </div>
      )}

      <div className="score-strip">
        <div>
          <span>{props.scenario.fixture.participant1}</span>
          <strong>{latestScore?.participant1Goals ?? 0}</strong>
        </div>
        <div>
          <span>{latestScore ? describeScore(latestScore) : "pre-match"}</span>
          <strong>:</strong>
        </div>
        <div>
          <span>{props.scenario.fixture.participant2}</span>
          <strong>{latestScore?.participant2Goals ?? 0}</strong>
        </div>
      </div>

      <PriceBoard odds={latestOdds} scenario={props.scenario} />
      <PriceChart odds={props.state?.oddsHistory || []} />

      <div className="progress-block">
        <div className="progress-meta">
          <span>{props.scenario.provenance ? "Verified incident replay" : "Synthetic stress replay"}</span>
          <span>{props.index + 1}/{props.total}</span>
        </div>
        <div className="progress-track">
          <div style={{ width: `${((props.index + 1) / props.total) * 100}%` }} />
        </div>
      </div>

      <div className="speed-row">
        {speedOptions.map((option) => (
          <button
            key={option}
            className={props.speed === option ? "speed active" : "speed"}
            onClick={() => props.setSpeed(option)}
          >
            {option}x
          </button>
        ))}
      </div>
    </section>
  );
}

function LiveFeedPanel({ proof }: { proof: LiveProof }) {
  const pulsePayload = {
    source: proof.apiOrigin || "TxLINE mainnet",
    sequence: proof.sequence || 0,
    receivedAt: proof.checkedAt,
    latencyMs: proof.latencyMs,
    fixtureCount: proof.fixtureCount || 0,
    payloadHash: proof.payloadHash,
  };

  return (
    <section className="panel feed-panel live-feed-panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">Live input</span>
          <h2>TxLINE mainnet pulse</h2>
        </div>
        <Radio className={proof.status === "ready" ? "radio-live" : ""} size={20} />
      </div>

      <div className="pulse-hero">
        <span>Request sequence</span>
        <strong data-live-sequence>{String(proof.sequence || 0).padStart(4, "0")}</strong>
        <small>{proof.status === "ready" ? "verified upstream response" : "waiting for TxLINE"}</small>
      </div>

      <div className="pulse-grid">
        <div><span>Fixtures</span><strong>{proof.fixtureCount ?? "--"}</strong></div>
        <div><span>Latency</span><strong>{proof.latencyMs !== undefined ? `${proof.latencyMs} ms` : "--"}</strong></div>
      </div>

      <div className="live-fixture-list">
        {(proof.sample || []).map((fixture) => (
          <article key={fixture.fixtureId}>
            <span>{fixture.competition}</span>
            <strong>{fixture.participant1} vs {fixture.participant2}</strong>
            <small>Fixture {fixture.fixtureId}</small>
          </article>
        ))}
      </div>

      <div className="live-box">
        <span className="eyebrow">Sanitized live envelope</span>
        <pre data-live-json>{JSON.stringify(pulsePayload, null, 2)}</pre>
      </div>

      <StatusPill tone={proof.status === "ready" ? "good" : "warn"} label="Auto-refresh every 2.5 seconds" />
    </section>
  );
}

function PriceBoard({ odds, scenario }: { odds?: Extract<FeedEvent, { kind: "odds" }>; scenario: ReplayScenario }) {
  const labels = odds?.priceNames || [scenario.fixture.participant1, "Draw", scenario.fixture.participant2];
  const prices = odds?.prices || [0, 0, 0];
  const implied = odds?.implied || [0, 0, 0];
  return (
    <div className="price-grid">
      {labels.map((label, index) => (
        <div className="price-cell" key={label}>
          <span>{label}</span>
          <strong>{prices[index] ? prices[index].toFixed(2) : "--"}</strong>
          <small>{implied[index] ? `${Math.round(implied[index] * 100)}%` : "--"}</small>
        </div>
      ))}
    </div>
  );
}

function PriceChart({ odds }: { odds: Extract<FeedEvent, { kind: "odds" }>[] }) {
  const points = odds.map((item, index) => ({
    x: odds.length <= 1 ? 0 : (index / (odds.length - 1)) * 100,
    y: 80 - item.implied[0] * 70,
  }));
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");

  return (
    <svg className="chart" viewBox="0 0 100 90" role="img" aria-label="Participant one implied probability">
      <line x1="0" y1="72" x2="100" y2="72" />
      <line x1="0" y1="45" x2="100" y2="45" />
      <line x1="0" y1="18" x2="100" y2="18" />
      {path && <path d={path} />}
      {points.map((point, index) => (
        <circle key={`${point.x}-${index}`} cx={point.x} cy={point.y} r="2" />
      ))}
    </svg>
  );
}

function AgentGrid({ decisions, mode }: { decisions: AgentDecision[]; mode: FeedMode }) {
  const agents: Array<{ id: AgentId; label: string; icon: JSX.Element }> = [
    { id: "sharp-move", label: "Sharp Move", icon: <Zap size={18} /> },
    { id: "mean-reversion", label: "Mean Reversion", icon: <Gauge size={18} /> },
    { id: "score-shock", label: "Score Shock", icon: <Activity size={18} /> },
    { id: "market-maker", label: "Market Maker", icon: <BadgeCheck size={18} /> },
  ];
  return (
    <section className="panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Agents</span>
          <h2>Autonomous strategy layer</h2>
        </div>
      </div>
      <div className="agent-grid">
        {agents.map((agent) => {
          const latest = decisions.find((decision) => decision.agent === agent.id);
          return (
            <article className="agent-card" data-agent={agent.id} key={agent.id}>
              <div className="agent-title">
                {agent.icon}
                <strong>{agent.label}</strong>
              </div>
              <span className={`decision-state ${latest?.status || "idle"}`}>{latest?.status || "idle"}</span>
              <p>
                {latest?.reason ||
                  (mode === "live"
                    ? "Monitoring the live TxLINE feed for an actionable market event."
                    : "Waiting for matching TxLINE event.")}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function CounterfactualPanel({ scenario, risk }: { scenario: ReplayScenario; risk: RiskConfig }) {
  const summaries = useMemo(() => {
    return (["normal", "reduced", "halted"] as const).map((mode) => {
      const decisions = runScenario(
        scenario,
        { ...risk, mode },
        scenario.provenance ? "verified-replay" : "replay",
      ).flatMap((tick) => tick.decisions);
      return {
        mode,
        blocked: decisions.filter((decision) => decision.status === "blocked").length,
        passed: decisions.filter((decision) => decision.status === "executed" || decision.status === "quoted").length,
        notional: decisions
          .filter((decision) => decision.status === "executed" || decision.status === "quoted")
          .reduce((sum, decision) => sum + decision.notional, 0),
      };
    });
  }, [scenario, risk]);
  const normalNotional = summaries[0].notional;

  return (
    <section className="panel counterfactual-panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Risk twin</span>
          <h2>Same TxLINE events, three execution policies</h2>
        </div>
        <ShieldCheck size={20} />
      </div>
      <div className="policy-grid">
        {summaries.map((summary) => (
          <article
            className={risk.mode === summary.mode ? "policy-card active" : "policy-card"}
            data-policy={summary.mode}
            key={summary.mode}
          >
            <div><strong>{summary.mode}</strong><span>{summary.passed} passed</span></div>
            <strong>{formatMoney(summary.notional)}</strong>
            <small>{summary.blocked} blocked · {formatMoney(Math.max(0, normalNotional - summary.notional))} prevented</small>
          </article>
        ))}
      </div>
    </section>
  );
}

function DecisionTape({
  decisions,
  selectedDecisionId,
  onSelect,
}: {
  decisions: AgentDecision[];
  selectedDecisionId?: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="panel decision-panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Decision tape</span>
          <h2>{decisions.length} receipts generated</h2>
        </div>
        <ReceiptText size={20} />
      </div>
      <div className="decision-table">
        <div className="table-head">
          <span>Agent</span>
          <span>Action</span>
          <span>Confidence</span>
          <span>Notional</span>
        </div>
        {decisions.length === 0 ? (
          <div className="empty-state">No decisions yet.</div>
        ) : (
          decisions.slice(0, 12).map((decision) => (
            <button
              key={decision.id}
              className={decision.id === selectedDecisionId ? "table-row selected" : "table-row"}
              onClick={() => onSelect(decision.id)}
            >
              <span>{decision.agentLabel}</span>
              <span>{labelSide(decision.side, decision.status)}</span>
              <span>{decision.confidence}%</span>
              <span>{formatMoney(decision.notional)}</span>
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function RiskPanel({ risk, setRisk }: { risk: RiskConfig; setRisk: (risk: RiskConfig) => void }) {
  return (
    <section className="panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Risk</span>
          <h2>Execution guardrails</h2>
        </div>
        <ShieldCheck size={20} />
      </div>

      <div className="segmented wide">
        {(["normal", "reduced", "halted"] as const).map((mode) => (
          <button
            key={mode}
            className={risk.mode === mode ? "active" : ""}
            onClick={() => setRisk({ ...risk, mode })}
          >
            {mode}
          </button>
        ))}
      </div>

      <label className="range-label">
        <span>Confidence floor</span>
        <strong>{risk.confidenceFloor}%</strong>
      </label>
      <input
        className="range"
        type="range"
        min="40"
        max="85"
        value={risk.confidenceFloor}
        onChange={(event) => setRisk({ ...risk, confidenceFloor: Number(event.target.value) })}
      />

      <label className="field-label" htmlFor="maxExposure">Max exposure</label>
      <input
        id="maxExposure"
        className="input"
        type="number"
        min="10000"
        step="5000"
        value={risk.maxExposure}
        onChange={(event) => setRisk({ ...risk, maxExposure: Number(event.target.value) })}
      />
    </section>
  );
}

function ReceiptPanel({
  decision,
  latestEvent,
  mode,
  liveStatus,
  liveProof,
  scenario,
}: {
  decision?: AgentDecision;
  latestEvent: FeedEvent;
  mode: FeedMode;
  liveStatus: "checking" | "ready" | "missing";
  liveProof: LiveProof;
  scenario: ReplayScenario;
}) {
  return (
    <section className="panel receipt-panel">
      <div className="panel-heading compact">
        <div>
          <span className="eyebrow">Receipt</span>
          <h2>{decision ? decision.receipt.receiptId : "Awaiting signal"}</h2>
        </div>
        <SlidersHorizontal size={20} />
      </div>

      {decision ? (
        <div className="receipt-list">
          <KeyValue label="Source" value={decision.receipt.sourceMode} />
          <KeyValue label="Endpoint" value={decision.receipt.txlineEndpoint} />
          <KeyValue label="Message" value={decision.receipt.sourceMessageId} />
          <KeyValue label="Proof" value={decision.receipt.proofStatus} />
          <KeyValue label="Hash" value={decision.receipt.payloadHash} />
          <p className="receipt-note">{decision.riskNote}</p>
        </div>
      ) : (
        <div className="empty-state">Run replay to generate receipts.</div>
      )}

      <div className="live-box">
        <span className="eyebrow">
          {mode === "live"
            ? "Latest live TxLINE pulse"
            : scenario.provenance
              ? "Latest verified TxLINE event"
              : "Latest TxLINE-shaped stress event"}
        </span>
        <pre>
          {JSON.stringify(
            mode === "live"
              ? {
                  sequence: liveProof.sequence,
                  receivedAt: liveProof.checkedAt,
                  latencyMs: liveProof.latencyMs,
                  fixtureCount: liveProof.fixtureCount,
                  payloadHash: liveProof.payloadHash,
                }
              : compactEvent(latestEvent),
            null,
            2,
          )}
        </pre>
      </div>

      <div className="proof-card">
        <span className="eyebrow">Live TxLINE proof</span>
        <KeyValue label="Status" value={proofStatusLabel(liveProof.status)} />
        <KeyValue label="Pulse" value={`/api/txline/pulse #${liveProof.sequence || 0}`} />
        <KeyValue label="Evidence" value="/api/judge/evidence" />
        {liveProof.fixtureCount !== undefined && <KeyValue label="Fixtures" value={`${liveProof.fixtureCount} live rows`} />}
        {liveProof.latencyMs !== undefined && <KeyValue label="Latency" value={`${liveProof.latencyMs} ms`} />}
        {liveProof.payloadHash && <KeyValue label="Live hash" value={liveProof.payloadHash} />}
        {scenario.provenance && (
          <>
            <KeyValue label="Replay" value={`${scenario.provenance.sourceRecordCount.toLocaleString("en-US")} source rows`} />
            <KeyValue label="Merkle proof" value="/api/judge/verified-input" />
          </>
        )}
      </div>

      <StatusPill
        tone={mode === "live" && liveStatus === "missing" ? "warn" : "neutral"}
        label={
          mode === "live" && liveStatus === "missing"
            ? "Live token not configured"
            : mode === "live"
              ? "Live pulse is active"
              : scenario.provenance
                ? "Verified replay and live proof active"
                : "Synthetic stress test"
        }
      />
    </section>
  );
}

function KeyValue({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="key-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatusPill({ tone, label }: { tone: "good" | "warn" | "neutral"; label: string }) {
  return <span className={`status-pill ${tone}`}>{label}</span>;
}

function labelSide(side: string, status: string) {
  if (status === "blocked") return "blocked";
  if (side === "quote-two-sided") return "quote";
  return side.replaceAll("-", " ");
}

function proofStatusLabel(status: LiveProof["status"]) {
  if (status === "ready") return "server token verified";
  if (status === "checking") return "checking";
  return "not configured";
}

function compactEvent(event: FeedEvent) {
  if (event.kind === "odds") {
    return {
      kind: event.kind,
      fixtureId: event.fixtureId,
      messageId: event.messageId,
      ts: new Date(event.ts).toISOString(),
      market: event.market,
      prices: event.prices,
      implied: event.implied,
    };
  }

  return {
    kind: event.kind,
    fixtureId: event.fixtureId,
    eventId: event.eventId,
    ts: new Date(event.ts).toISOString(),
    action: event.action,
    minute: event.minute,
    score: `${event.participant1Goals}-${event.participant2Goals}`,
  };
}
