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
    .select("full_name, total_points")
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

  // Ranking position
  const { data: rankingRows } = await supabase.from("ranking").select("id");
  const myRankPos = rankingRows
    ? rankingRows.findIndex((r: { id: string }) => r.id === user!.id) + 1
    : 0;

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
      <TopBar title="Bolão Bazante 2026" userInitials={initials} />

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
          <StatCard
            value={profile?.total_points != null ? String(profile.total_points) : "—"}
            label="Pontos"
          />
          <StatCard value="—" label="Exatos" />
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
      </div>
    </div>
  );
}
