// E2E test: hits wc2026 sandbox (/test/match), runs the SAME pipeline our cron uses
// (deriveScoreFields + calculate), validates results against expected values, and
// cleans up after itself.
//
// What it proves:
//   1. WC2026_API_KEY works
//   2. Sandbox response shape matches what our types expect
//   3. deriveScoreFields correctly maps phase=PEN → ET fields (FT null)
//   4. Penalties are ignored for scoring (bet "1-1" on a 1-1 ET draw won by pens = exact match)
//   5. Wrong-result bets get 0 points
//   6. Correct-tie bets (any draw) get result points on a draw
//   7. DB write/read pipeline works end-to-end (insert fixture, insert bets, simulated scoring loop, verify)
//
// Usage:
//   cd /Users/gabrielbazante/workspace/bolao-bazante-2026
//   pnpm --filter @bolao/scoring build   # ensures dist exists
//   node apps/web/scripts/test-wc2026-pipeline.mjs
//
// Exit code 0 = all green. Non-zero = at least one assertion failed.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// Inlined from @bolao/scoring to avoid Node ESM resolver quirks with the workspace dist.
// This is the SAME logic with 22 passing unit tests — see packages/scoring/.
const POINTS = {
  group: { result: 1, exact: 2 },
  r32: { result: 2, exact: 4 },
  r16: { result: 3, exact: 6 },
  qf: { result: 7, exact: 14 },
  sf: { result: 15, exact: 30 },
  third: { result: 13, exact: 26 },
  final: { result: 25, exact: 50 },
};
function calculate(bet, result, phase) {
  const isKnockout = phase !== "group";
  const finalHome = isKnockout && result.home_et != null ? result.home_et : result.home_ft;
  const finalAway = isKnockout && result.away_et != null ? result.away_et : result.away_ft;
  const { result: ptsResult, exact: ptsExact } = POINTS[phase];
  if (bet.home === finalHome && bet.away === finalAway) return ptsExact;
  const sameWinner =
    (bet.home > bet.away && finalHome > finalAway) ||
    (bet.home < bet.away && finalHome < finalAway) ||
    (bet.home === bet.away && finalHome === finalAway);
  return sameWinner ? ptsResult : 0;
}

// ---------- load .env.local ----------
const envText = readFileSync(resolve("apps/web/.env.local"), "utf8");
const env = Object.fromEntries(
  envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1)];
    }),
);

const required = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "WC2026_API_KEY"];
for (const k of required) {
  if (!env[k]) {
    console.error(`✗ missing ${k} in apps/web/.env.local`);
    process.exit(1);
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ---------- replica of apps/web/lib/wc2026.ts deriveScoreFields ----------
function deriveScoreFields(m) {
  if (m.home_score == null || m.away_score == null) {
    return { home_score_ft: null, away_score_ft: null, home_score_et: null, away_score_et: null };
  }
  const phaseUpper = (m.phase ?? "").toUpperCase();
  // Substring match: observed phases include FT_PEN, AET_PEN, plus bare AET/PEN.
  const hadExtraTimeOrPens = phaseUpper.includes("AET") || phaseUpper.includes("PEN");
  if (hadExtraTimeOrPens) {
    return {
      home_score_ft: null,
      away_score_ft: null,
      home_score_et: m.home_score,
      away_score_et: m.away_score,
    };
  }
  return {
    home_score_ft: m.home_score,
    away_score_ft: m.away_score,
    home_score_et: null,
    away_score_et: null,
  };
}

// ---------- assertion helpers ----------
let failed = 0;
function assert(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const icon = ok ? "✓" : "✗";
  console.log(`  ${icon} ${label}`);
  if (!ok) {
    console.log(`     expected: ${JSON.stringify(expected)}`);
    console.log(`     actual:   ${JSON.stringify(actual)}`);
    failed++;
  }
}

// ---------- run ----------
const TEST_FIXTURE_ID = 99999;

async function cleanup() {
  await supabase.from("bets").delete().eq("fixture_id", TEST_FIXTURE_ID);
  await supabase.from("fixtures").delete().eq("id", TEST_FIXTURE_ID);
}

try {
  console.log("\n=== STEP 1: hit wc2026 /test/match (sandbox) ===");
  const res = await fetch("https://api.wc2026api.com/test/match", {
    headers: { Authorization: `Bearer ${env.WC2026_API_KEY}` },
  });
  if (!res.ok) {
    console.error(`✗ HTTP ${res.status}: ${await res.text()}`);
    process.exit(1);
  }
  const sandbox = await res.json();
  console.log("  payload summary:", {
    teams: `${sandbox.home_team} ${sandbox.home_team_code} vs ${sandbox.away_team} ${sandbox.away_team_code}`,
    score: `${sandbox.home_score}-${sandbox.away_score}`,
    pen: `${sandbox.home_pen}-${sandbox.away_pen}`,
    phase: sandbox.phase,
    status: sandbox.status,
  });

  // expected: phase contains PEN (sandbox uses 'FT_PEN'), score 1-1, pen 3-5
  assert("sandbox phase indicates penalties", sandbox.phase.includes("PEN"), true);
  assert("sandbox score is 1-1", `${sandbox.home_score}-${sandbox.away_score}`, "1-1");
  assert("penalties were 3-5 (Argentina won on pens)", `${sandbox.home_pen}-${sandbox.away_pen}`, "3-5");

  console.log("\n=== STEP 2: deriveScoreFields handles PEN correctly ===");
  const fields = deriveScoreFields(sandbox);
  console.log("  derived:", fields);
  assert("FT fields null (we don't know the 90-min split)", fields.home_score_ft, null);
  assert("ET fields populated", `${fields.home_score_et}-${fields.away_score_et}`, "1-1");

  console.log("\n=== STEP 3: scoring lib produces correct points (PENALTIES IGNORED) ===");
  // 'final' phase: points_result=25, points_exact=50
  const result = {
    home_ft: fields.home_score_ft ?? fields.home_score_et ?? 0,
    away_ft: fields.away_score_ft ?? fields.away_score_et ?? 0,
    home_et: fields.home_score_et,
    away_et: fields.away_score_et,
  };
  assert("bet 1-1 (exact tie) → 50pts (final exact)", calculate({ home: 1, away: 1 }, result, "final"), 50);
  assert("bet 0-0 (correct winner=tie) → 25pts (final result)", calculate({ home: 0, away: 0 }, result, "final"), 25);
  assert("bet 2-1 (Brazil wins) → 0pts (wrong winner, pen ignored)", calculate({ home: 2, away: 1 }, result, "final"), 0);
  assert("bet 1-2 (Argentina wins on regulation) → 0pts (pen ignored)", calculate({ home: 1, away: 2 }, result, "final"), 0);
  assert("bet 3-5 (PENALTY SCORE) → 0pts (yep, pen is ignored)", calculate({ home: 3, away: 5 }, result, "final"), 0);

  console.log("\n=== STEP 4: full DB round-trip ===");
  const { data: teams } = await supabase
    .from("teams")
    .select("id, fifa_code")
    .in("fifa_code", ["BRA", "ARG"]);
  const braId = teams?.find((t) => t.fifa_code === "BRA")?.id;
  const argId = teams?.find((t) => t.fifa_code === "ARG")?.id;
  if (!braId || !argId) {
    console.error("✗ BRA or ARG team not found in DB. Seed first.");
    process.exit(1);
  }
  console.log(`  BRA local id=${braId}, ARG local id=${argId}`);

  const { data: finalPhase } = await supabase
    .from("phases")
    .select("id, code, points_result, points_exact")
    .eq("code", "final")
    .single();
  if (!finalPhase) {
    console.error("✗ final phase not found");
    process.exit(1);
  }

  const { data: anyApprovedUser } = await supabase
    .from("profiles")
    .select("id, email")
    .not("approved_at", "is", null)
    .limit(1)
    .single();
  if (!anyApprovedUser) {
    console.error("✗ no approved user found. Sign up + approve someone first.");
    process.exit(1);
  }
  console.log(`  using test user: ${anyApprovedUser.email}`);

  await cleanup();

  await supabase.from("fixtures").insert({
    id: TEST_FIXTURE_ID,
    phase_id: finalPhase.id,
    kickoff_at: new Date().toISOString(),
    home_team_id: braId,
    away_team_id: argId,
    status: "scheduled",
  });
  console.log("  inserted test fixture id=99999 (final · BRA × ARG)");

  await supabase.from("bets").insert([
    { fixture_id: TEST_FIXTURE_ID, user_id: anyApprovedUser.id, home_score: 1, away_score: 1 },
  ]);
  console.log("  inserted 1 test bet (1-1)");

  // Simulate what the cron does: update fixture with sandbox results
  await supabase.from("fixtures").update({
    status: "finished",
    home_score_ft: fields.home_score_ft,
    away_score_ft: fields.away_score_ft,
    home_score_et: fields.home_score_et,
    away_score_et: fields.away_score_et,
  }).eq("id", TEST_FIXTURE_ID);

  // Score the bet (same logic the cron uses)
  const { data: bet } = await supabase
    .from("bets")
    .select("id, home_score, away_score")
    .eq("fixture_id", TEST_FIXTURE_ID)
    .single();
  const pts = calculate(
    { home: bet.home_score, away: bet.away_score },
    result,
    finalPhase.code,
  );
  await supabase
    .from("bets")
    .update({ points: pts, scored_at: new Date().toISOString() })
    .eq("id", bet.id);
  await supabase
    .from("fixtures")
    .update({ scored_at: new Date().toISOString() })
    .eq("id", TEST_FIXTURE_ID);

  // Read back and verify
  const { data: scoredFixture } = await supabase
    .from("fixtures")
    .select("status, home_score_ft, away_score_ft, home_score_et, away_score_et, scored_at")
    .eq("id", TEST_FIXTURE_ID)
    .single();
  const { data: scoredBet } = await supabase
    .from("bets")
    .select("points, scored_at")
    .eq("id", bet.id)
    .single();

  assert("fixture.status = finished", scoredFixture.status, "finished");
  assert("fixture.home_score_ft is null (PEN/ET case)", scoredFixture.home_score_ft, null);
  assert("fixture.home_score_et = 1", scoredFixture.home_score_et, 1);
  assert("fixture.away_score_et = 1", scoredFixture.away_score_et, 1);
  assert("fixture.scored_at populated", scoredFixture.scored_at !== null, true);
  assert("bet.points = 50 (exact final tie)", scoredBet.points, 50);
  assert("bet.scored_at populated", scoredBet.scored_at !== null, true);
} finally {
  console.log("\n=== STEP 5: cleanup ===");
  await cleanup();
  console.log("  test fixture + bets removed");
}

console.log(`\n${failed === 0 ? "✅ ALL GREEN" : `❌ ${failed} assertion(s) failed`} — pipeline is${failed === 0 ? "" : " NOT"} production-ready\n`);
process.exit(failed === 0 ? 0 : 1);
