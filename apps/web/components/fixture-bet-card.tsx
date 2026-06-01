"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import { saveBet } from "@/app/(app)/palpites/actions";

type Team = { id: number; name_pt: string; flag_emoji: string };
type Fixture = { id: number; kickoff_at: string; home: Team; away: Team };

export function FixtureBetCard({
  fixture, initialHome, initialAway, locked,
}: { fixture: Fixture; initialHome?: number; initialAway?: number; locked: boolean }) {
  const [home, setHome] = useState<number | "">(initialHome ?? "");
  const [away, setAway] = useState<number | "">(initialAway ?? "");
  const [saved, setSaved] = useState(initialHome != null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (home === "" || away === "" || locked) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => start(async () => {
      await saveBet(fixture.id, Number(home), Number(away));
      setSaved(true);
    }), 800);
  }, [home, away, locked, fixture.id]);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{fixture.home.flag_emoji}</span>
          <span className="text-xs font-semibold">{fixture.home.name_pt}</span>
        </div>
        <div className="flex items-center gap-1">
          <input className="w-9 h-10 text-center text-lg font-bold border-2 border-primary rounded"
            type="number" min={0} max={20} value={home} disabled={locked}
            onChange={(e) => { setSaved(false); setHome(e.target.value === "" ? "" : Number(e.target.value)); }} />
          <span className="text-muted-foreground">×</span>
          <input className="w-9 h-10 text-center text-lg font-bold border-2 border-primary rounded"
            type="number" min={0} max={20} value={away} disabled={locked}
            onChange={(e) => { setSaved(false); setAway(e.target.value === "" ? "" : Number(e.target.value)); }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{fixture.away.flag_emoji}</span>
          <span className="text-xs font-semibold">{fixture.away.name_pt}</span>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2">
        {new Date(fixture.kickoff_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>
      <p className="text-right text-[10px] text-emerald-700 h-3">
        {pending ? "Salvando…" : saved ? "✓ Salvo" : ""}
      </p>
    </div>
  );
}
