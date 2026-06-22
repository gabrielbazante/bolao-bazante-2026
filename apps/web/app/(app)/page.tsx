import { createClient } from "@/lib/supabase/server";
import { PrizeCard } from "@/components/prize-card";
import { TopBar } from "@/components/ui-pro/top-bar";
import { StatCard } from "@/components/ui-pro/stat-card";
import { LiveBanner } from "@/components/ui-pro/live-banner";
import { NextMatchCard } from "@/components/ui-pro/next-match-card";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);

  const { data: settings } = await supabase
    .from("settings")
    .select("entry_fee_cents")
    .eq("id", 1)
    .single();

  // Live fixtures count
  const { data: liveFixtures } = await supabase
    .from("fixtures")
    .select("id")
    .eq("status", "live");
  const liveCount = liveFixtures?.length ?? 0;

  // Next upcoming fixture
  const { data: nextFixtures } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, home:home_team_id(id,name_pt,flag_emoji), away:away_team_id(id,name_pt,flag_emoji)"
    )
    .gte("kickoff_at", new Date().toISOString())
    .eq("status", "scheduled")
    .order("kickoff_at")
    .limit(1);
  const nextFixture = nextFixtures?.[0] ?? null;

  // My bet on next fixture
  let myBet: { home_score: number; away_score: number } | null = null;
  if (nextFixture) {
    const { data: bet } = await supabase
      .from("bets")
      .select("home_score, away_score")
      .eq("fixture_id", nextFixture.id)
      .eq("user_id", user!.id)
      .maybeSingle();
    myBet = bet ?? null;
  }

  // Ranking position + my totals (from the ranking view)
  const { data: rankingRows } = await supabase
    .from("ranking")
    .select("id, total_points, exact_count, hit_count");
  const myRankIdx = rankingRows
    ? rankingRows.findIndex((r: { id: string }) => r.id === user!.id)
    : -1;
  const myRankPos = myRankIdx >= 0 ? myRankIdx + 1 : 0;
  const myStats =
    myRankIdx >= 0
      ? (rankingRows![myRankIdx] as {
          total_points: number;
          exact_count: number;
          hit_count: number;
        })
      : { total_points: 0, exact_count: 0, hit_count: 0 };

  // Últimos jogos do usuário, ordenados pelo momento em que foram pontuados
  const { data: recentBets } = await supabase
    .from("bets")
    .select(
      "home_score, away_score, points, scored_at, fixture:fixtures!inner(id, kickoff_at, home_score_ft, away_score_ft, home_score_et, away_score_et, scored_at, home:home_team_id(name_pt, flag_emoji), away:away_team_id(name_pt, flag_emoji))",
    )
    .eq("user_id", user!.id)
    .not("scored_at", "is", null)
    .order("scored_at", { ascending: false })
    .limit(10);

  // User initials
  const name = profile?.full_name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase() || "?";

  return (
    <div className="flex flex-col">
      <TopBar title="Bolão Bazante 2026" userInitials={initials} avatarUrl={profile?.avatar_url} />

      <div className="mx-auto w-full max-w-md space-y-4 p-4 pb-6">
        {/* Prize card */}
        <PrizeCard
          initialCount={count ?? 0}
          feeCents={settings?.entry_fee_cents ?? 1000}
        />

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard
            value={myRankPos > 0 ? `${myRankPos}º` : "—"}
            label="Sua pos."
          />
          <StatCard value={String(myStats.total_points)} label="Pontos" />
          <StatCard value={String(myStats.exact_count)} label="Exatos" />
        </div>

        {/* Next match */}
        {nextFixture && (
          <NextMatchCard
            fixture={nextFixture as any}
            myBet={myBet}
          />
        )}

        {/* Live banner */}
        {liveCount > 0 && <LiveBanner count={liveCount} />}

        {/* CTA */}
        <Link href="/palpites" className="btn-3d btn-3d-primary block w-full text-center">
          ⚽ Fazer palpites da rodada
        </Link>

        {/* Resumo dos últimos jogos pontuados (ordenados por scored_at desc) */}
        {recentBets && recentBets.length > 0 && (
          <div
            className="rounded-2xl bg-card p-4"
            style={{
              boxShadow:
                "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
              border: "1px solid rgba(0,0,0,.05)",
            }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Últimos resultados
              </p>
              <p className="text-[10px] text-muted-foreground">
                {recentBets.length} jogo{recentBets.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="space-y-2">
              {(recentBets as any[]).map((b, i) => {
                const f = b.fixture;
                const realH = f.home_score_et ?? f.home_score_ft ?? 0;
                const realA = f.away_score_et ?? f.away_score_ft ?? 0;
                const exact = realH === b.home_score && realA === b.away_score;
                const points = b.points ?? 0;
                const badgeClass = exact
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : points > 0
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
                    : "bg-muted text-muted-foreground";
                const when = new Date(f.kickoff_at).toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                });
                return (
                  <li
                    key={i}
                    className="flex items-center gap-2 border-b border-border/40 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="w-9 shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {when}
                    </span>
                    <span className="flex flex-1 items-center gap-1.5 text-xs">
                      <span className="text-base leading-none">{f.home.flag_emoji}</span>
                      <span className="font-display text-base text-foreground tabular-nums">
                        {realH}-{realA}
                      </span>
                      <span className="text-base leading-none">{f.away.flag_emoji}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      palpite{" "}
                      <span className="font-display text-sm text-foreground tabular-nums">
                        {b.home_score}-{b.away_score}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold tabular-nums ${badgeClass}`}
                    >
                      {points > 0 ? `+${points}` : "0"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
