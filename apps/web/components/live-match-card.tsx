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
  const winnerNow =
    homeNow > awayNow ? "h" : homeNow < awayNow ? "a" : "d";
  const winnerBet =
    bet.home_score > bet.away_score
      ? "h"
      : bet.home_score < bet.away_score
      ? "a"
      : "d";
  if (bet.home_score === homeNow && bet.away_score === awayNow)
    return {
      background: "#dcfce7",
      color: "#166534",
      border: "1px solid #86efac",
    };
  if (winnerNow === winnerBet)
    return {
      background: "#fef3c7",
      color: "#92400e",
      border: "1px solid #fcd34d",
    };
  return {
    background: "#fee2e2",
    color: "#991b1b",
    border: "1px solid #fca5a5",
  };
}

export function LiveMatchCard({ fixture }: Props) {
  const [bets, setBets] = useState<Bet[]>([]);
  const homeNow = fixture.home_score_ft ?? 0;
  const awayNow = fixture.away_score_ft ?? 0;

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase
        .from("bets")
        .select(
          "user_id, home_score, away_score, profile:profiles(full_name, avatar_url)"
        )
        .eq("fixture_id", fixture.id);
      setBets((data ?? []) as any);
    };
    load();
    const ch = supabase
      .channel(`live-bets-${fixture.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fixtures",
          filter: `id=eq.${fixture.id}`,
        },
        load
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [fixture.id]);

  return (
    <div
      className="overflow-hidden rounded-2xl bg-card"
      style={{
        boxShadow:
          "0 4px 16px -4px rgba(0,0,0,.1), 0 1px 2px rgba(0,0,0,.06)",
        border: "1px solid rgba(0,0,0,.05)",
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-4 text-white"
        style={{
          background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)",
          boxShadow: "inset 0 -1px 0 rgba(0,0,0,.1)",
        }}
      >
        <div className="grid grid-cols-3 items-center">
          <div className="flex flex-col items-center gap-1 min-w-0 px-1">
            <span className="text-2xl">{fixture.home.flag_emoji}</span>
            <span className="text-xs font-bold text-center break-words leading-tight">
              {fixture.home.name_pt}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <div className="mb-1 flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-white"
                style={{
                  animation: "pulse 1s infinite",
                  boxShadow: "0 0 8px rgba(255,255,255,.8)",
                }}
              />
              <span className="text-[9px] font-bold uppercase tracking-widest opacity-90">
                Ao Vivo
              </span>
            </div>
            <span className="font-display text-5xl leading-none tabular-nums">
              {homeNow} - {awayNow}
            </span>
          </div>

          <div className="flex flex-col items-center gap-1 min-w-0 px-1">
            <span className="text-2xl">{fixture.away.flag_emoji}</span>
            <span className="text-xs font-bold text-center break-words leading-tight">
              {fixture.away.name_pt}
            </span>
          </div>
        </div>
      </div>

      {/* Bets list — sorted by full_name (pt-BR collation, accent-insensitive) */}
      <ul className="divide-y divide-border p-3">
        {[...bets]
          .sort((a, b) =>
            (a.profile?.full_name ?? "").localeCompare(
              b.profile?.full_name ?? "",
              "pt-BR",
              { sensitivity: "base" },
            ),
          )
          .map((b) => (
          <li key={b.user_id} className="flex items-center gap-2 py-2">
            <span className="flex-1 text-sm font-semibold text-foreground">
              {b.profile.full_name}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-bold"
              style={tone(b, homeNow, awayNow)}
            >
              {b.home_score} × {b.away_score}
            </span>
          </li>
        ))}
        {bets.length === 0 && (
          <li className="py-3 text-center text-xs text-muted-foreground">
            Nenhum palpite registrado pra esse jogo.
          </li>
        )}
      </ul>
    </div>
  );
}
