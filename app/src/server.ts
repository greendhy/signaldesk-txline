import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defaultRiskConfig, runScenario } from "./shared/engine";
import { replayScenarios } from "./shared/replayScenarios";
import { txlineNetworks, type TxlineNetwork } from "./shared/txlineConfig";

loadLocalEnv();

const app = express();
const port = Number(process.env.PORT || 8790);
const apiOrigin = process.env.TXLINE_API_ORIGIN || "https://txline.txodds.com";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "SignalDesk",
    mode: "replay-first",
    txline: txlineStatus(),
  });
});

app.get("/api/replay/scenarios", (_req, res) => {
  res.json(
    replayScenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      description: scenario.description,
      fixture: scenario.fixture,
      eventCount: scenario.events.length,
      durationMs: scenario.events.at(-1)?.offsetMs ?? 0,
    })),
  );
});

app.get("/api/replay/scenarios/:id", (req, res) => {
  const scenario = replayScenarios.find((item) => item.id === req.params.id);
  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }
  res.json(scenario);
});

app.post("/api/engine/run/:id", (req, res) => {
  const scenario = replayScenarios.find((item) => item.id === req.params.id);
  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  const risk = { ...defaultRiskConfig, ...(req.body?.risk || {}) };
  res.json({
    scenario: {
      id: scenario.id,
      name: scenario.name,
      fixture: scenario.fixture,
    },
    risk,
    ticks: runScenario(scenario, risk, "replay"),
  });
});

app.get("/api/replay/stream/:id", (req, res) => {
  const scenario = replayScenarios.find((item) => item.id === req.params.id);
  if (!scenario) {
    res.status(404).json({ error: "Scenario not found" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const ticks = runScenario(scenario, defaultRiskConfig, "replay");
  let index = 0;
  const timer = setInterval(() => {
    const tick = ticks[index];
    if (!tick) {
      res.write("event: done\ndata: {}\n\n");
      clearInterval(timer);
      res.end();
      return;
    }
    res.write(`event: tick\ndata: ${JSON.stringify(tick)}\n\n`);
    index += 1;
  }, 900);

  req.on("close", () => clearInterval(timer));
});

app.get("/api/txline/status", (_req, res) => {
  res.json(txlineStatus());
});

app.post("/api/activation/guest", async (req, res) => {
  const network = normalizeNetwork(req.body?.network);
  if (!network) {
    res.status(400).json({ error: "Invalid network" });
    return;
  }

  try {
    const response = await fetch(`${txlineNetworks[network].apiOrigin}/auth/guest/start`, {
      method: "POST",
    });
    const data = await readTxlineResponse(response);
    res.status(response.status).json(data);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Guest session failed" });
  }
});

app.post("/api/activation/activate", async (req, res) => {
  const network = normalizeNetwork(req.body?.network);
  const { txSig, walletSignature, jwt } = req.body || {};

  if (!network || !txSig || !walletSignature || !jwt) {
    res.status(400).json({ error: "network, txSig, walletSignature, and jwt are required" });
    return;
  }

  try {
    const response = await fetch(`${txlineNetworks[network].apiOrigin}/api/token/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        txSig,
        walletSignature,
        leagues: [],
      }),
    });
    const data = await readTxlineResponse(response);
    const apiToken = typeof data === "string" ? data : data.token || data.apiToken || data;

    if (response.ok && typeof apiToken === "string") {
      process.env.TXLINE_API_ORIGIN = txlineNetworks[network].apiOrigin;
      process.env.TXLINE_GUEST_JWT = jwt;
      process.env.TXLINE_API_TOKEN = apiToken;

      const envText = [
        `PORT=${port}`,
        `TXLINE_API_ORIGIN=${txlineNetworks[network].apiOrigin}`,
        `TXLINE_GUEST_JWT=${jwt}`,
        `TXLINE_API_TOKEN=${apiToken}`,
        "",
      ].join("\n");
      fs.writeFileSync(path.resolve(process.cwd(), ".env.local"), envText, "utf8");
      fs.writeFileSync(
        path.resolve(process.cwd(), "activation-result.json"),
        JSON.stringify({ network, txSig, activatedAt: new Date().toISOString(), apiOrigin: txlineNetworks[network].apiOrigin }, null, 2),
        "utf8",
      );
    }

    res.status(response.status).json({ data, apiToken: typeof apiToken === "string" ? apiToken : null, liveReady: hasLiveCredentials() });
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "Activation failed" });
  }
});

app.get("/api/txline/fixtures", async (_req, res) => {
  await proxyTxlineJson("/api/fixtures/snapshot", res);
});

app.get("/api/txline/odds/snapshot/:fixtureId", async (req, res) => {
  await proxyTxlineJson(`/api/odds/snapshot/${req.params.fixtureId}`, res);
});

app.get("/api/txline/scores/snapshot/:fixtureId", async (req, res) => {
  await proxyTxlineJson(`/api/scores/snapshot/${req.params.fixtureId}`, res);
});

app.get("/api/txline/odds/validation", async (req, res) => {
  await proxyTxlineJson(`/api/odds/validation?${new URLSearchParams(req.query as Record<string, string>).toString()}`, res);
});

app.get("/api/txline/scores/stat-validation", async (req, res) => {
  await proxyTxlineJson(`/api/scores/stat-validation?${new URLSearchParams(req.query as Record<string, string>).toString()}`, res);
});

app.get("/api/txline/odds/stream", async (_req, res) => {
  await proxyTxlineStream("/api/odds/stream", res);
});

app.get("/api/txline/scores/stream", async (_req, res) => {
  await proxyTxlineStream("/api/scores/stream", res);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.resolve(__dirname, "../dist");

app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.listen(port, () => {
  console.log(`SignalDesk listening on http://127.0.0.1:${port}`);
});

function hasLiveCredentials() {
  return Boolean(process.env.TXLINE_GUEST_JWT && process.env.TXLINE_API_TOKEN);
}

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

function txlineHeaders() {
  return {
    Authorization: `Bearer ${process.env.TXLINE_GUEST_JWT}`,
    "X-Api-Token": process.env.TXLINE_API_TOKEN || "",
    "Content-Type": "application/json",
  };
}

function txlineStatus() {
  return {
    apiOrigin,
    guestJwt: Boolean(process.env.TXLINE_GUEST_JWT),
    apiToken: Boolean(process.env.TXLINE_API_TOKEN),
    liveReady: hasLiveCredentials(),
    endpoints: [
      "/api/fixtures/snapshot",
      "/api/odds/stream",
      "/api/scores/stream",
      "/api/odds/validation",
      "/api/scores/stat-validation",
    ],
  };
}

async function proxyTxlineJson(pathname: string, res: express.Response) {
  if (!hasLiveCredentials()) {
    res.status(428).json(missingCredentialPayload());
    return;
  }

  try {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      headers: txlineHeaders(),
    });
    const text = await response.text();
    res.status(response.status).type(response.headers.get("content-type") || "application/json").send(text);
  } catch (error) {
    res.status(502).json({ error: error instanceof Error ? error.message : "TxLINE request failed" });
  }
}

async function proxyTxlineStream(pathname: string, res: express.Response) {
  if (!hasLiveCredentials()) {
    res.status(428).json(missingCredentialPayload());
    return;
  }

  try {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      headers: {
        ...txlineHeaders(),
        Accept: "text/event-stream",
        "Cache-Control": "no-cache",
      },
    });

    if (!response.ok || !response.body) {
      res.status(response.status).json({ error: `TxLINE stream failed with ${response.status}` });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body.getReader();
    const pump = async () => {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    };

    await pump();
  } catch (error) {
    if (!res.headersSent) {
      res.status(502).json({ error: error instanceof Error ? error.message : "TxLINE stream failed" });
    } else {
      res.end();
    }
  }
}

function missingCredentialPayload() {
  return {
    error: "TxLINE credentials are not configured.",
    nextStep: "Set TXLINE_GUEST_JWT and TXLINE_API_TOKEN after wallet activation.",
  };
}

async function readTxlineResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeNetwork(value: unknown): TxlineNetwork | null {
  if (value === "mainnet" || value === "devnet") return value;
  return null;
}
