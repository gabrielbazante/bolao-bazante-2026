"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bet = {
  user_id: string;
  home_score: number;
  away_score: number;
  profile: { full_name: string; avatar_url: string | null };
};

type Props = {
  fixture: {
    id: number;
    home: { id: number; name_pt: string; flag_emoji: string };
    away: { id: number; name_pt: string; flag_emoji: string };
    home_score_ft: number | null;
    away_score_ft: number | null;
  };
};

function tone(bet: Bet, homeNow: number, awayNow: number) {
  const winnerNow = homeNow > awayNow ? "h" : homeNow < awayNow ? "a" : "d";
  const winnerBet = bet.home_score > bet.away_score ? "h"
                  : bet.home_score < bet.away_score ? "a" : "d";
  if (bet.home_score === homeNow && bet.away_score === awayNow)
    return "bg-emerald-100 text-emerald-700";
  if (winnerNow === winnerBet) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export function LiveMatchCard({ fixture }: Props) {
  const [bets, setBets] = useState<Bet[]>([]);
  const homeNow = fixture.home_score_ft ?? 0;
  const awayNow = fixture.away_score_ft ?? 0;

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("bets")
        .select("user_id, home_score, away_score, profile:profiles(full_name, avatar_url)")
        .eq("fixture_id", fixture.id);
      setBets((data ?? []) as any);
    };
    load();
    const ch = supabase.channel(`live-bets-${fixture.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "fixtures", filter: `id=eq.${fixture.id}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fixture.id]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="bg-gradient-to-br from-red-600 to-red-800 text-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{fixture.home.flag_emoji} {fixture.home.name_pt}</span>
          <span className="text-2xl font-black">{homeNow} - {awayNow}</span>
          <span className="font-bold text-sm">{fixture.away.name_pt} {fixture.away.flag_emoji}</span>
        </div>
      </div>
      <ul className="p-3 space-y-2">
        {bets.map(b => (
          <li key={b.user_id} className="flex items-center gap-2">
            <span className="text-sm flex-1 font-medium">{b.profile.full_name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${tone(b, homeNow, awayNow)}`}>
              {b.home_score} × {b.away_score}
            </span>
          </li>
        ))}
        {bets.length === 0 && <li className="text-xs text-muted-foreground text-center">
          Nenhum palpite registrado pra esse jogo.
        </li>}
      </ul>
    </div>
  );
}
