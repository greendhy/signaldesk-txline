import fs from "node:fs";
import path from "node:path";

loadLocalEnv();

const fixtureId = Number(process.argv[2] || 18_209_181);
const apiOrigin = process.env.TXLINE_API_ORIGIN || "https://txline.txodds.com";
const messageId = "1837057453:00003:000133-10021-stab";
const timestamp = 1_783_632_662_348;

if (!process.env.TXLINE_GUEST_JWT || !process.env.TXLINE_API_TOKEN) {
  throw new Error("TXLINE_GUEST_JWT and TXLINE_API_TOKEN are required.");
}

const headers = {
  Authorization: `Bearer ${process.env.TXLINE_GUEST_JWT}`,
  "X-Api-Token": process.env.TXLINE_API_TOKEN,
};

const proofQuery = new URLSearchParams({ messageId, ts: String(timestamp) });
const [oddsResponse, scoresResponse, proofResponse] = await Promise.all([
  fetch(`${apiOrigin}/api/odds/updates/${fixtureId}`, { headers }),
  fetch(`${apiOrigin}/api/scores/updates/${fixtureId}`, {
    headers: { ...headers, Accept: "text/event-stream" },
  }),
  fetch(`${apiOrigin}/api/odds/validation?${proofQuery}`, { headers }),
]);

if (!oddsResponse.ok || !scoresResponse.ok || !proofResponse.ok) {
  throw new Error(
    `TxLINE audit failed: odds=${oddsResponse.status}, scores=${scoresResponse.status}, proof=${proofResponse.status}`,
  );
}

const odds = (await oddsResponse.json()) as Array<Record<string, unknown>>;
const scoreStream = await scoresResponse.text();
const proof = (await proofResponse.json()) as Record<string, any>;
const scoreEvents = scoreStream
  .split(/\r?\n/)
  .filter((line) => line.startsWith("data: "))
  .map((line) => JSON.parse(line.slice(6)) as Record<string, any>);
const fullTimeMatchWinner = odds.filter(
  (row) =>
    row.SuperOddsType === "1X2_PARTICIPANT_RESULT" &&
    !row.MarketPeriod &&
    row.InRunning === true &&
    Array.isArray(row.Prices) &&
    row.Prices.length === 3 &&
    Array.isArray(row.Pct) &&
    row.Pct.length === 3 &&
    row.Pct.every((value) => value !== "NA"),
);
const incidentActions = new Set([
  "kickoff_team",
  "var",
  "var_end",
  "penalty",
  "penalty_outcome",
  "goal",
  "yellow_card",
  "halftime_finalised",
  "game_finalised",
]);

console.log(
  JSON.stringify(
    {
      fixtureId,
      source: apiOrigin,
      rawOddsRecords: odds.length,
      validInRunningMatchWinnerRecords: fullTimeMatchWinner.length,
      scoreStreamEvents: scoreEvents.length,
      incidentEvents: scoreEvents.filter((event) => incidentActions.has(event.Action)).length,
      range: {
        firstOddsTimestamp: Math.min(...odds.map((row) => Number(row.Ts))),
        lastOddsTimestamp: Math.max(...odds.map((row) => Number(row.Ts))),
      },
      validation: {
        messageId: proof.odds?.MessageId,
        fixtureId: proof.odds?.FixtureId,
        updateCount: proof.summary?.updateStats?.updateCount,
        subTreeProofDepth: proof.subTreeProof?.length,
        mainTreeProofDepth: proof.mainTreeProof?.length,
      },
    },
    null,
    2,
  ),
);

function loadLocalEnv() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separator = line.indexOf("=");
    if (separator === -1) continue;
    const key = line.slice(0, separator);
    if (!process.env[key]) process.env[key] = line.slice(separator + 1);
  }
}
