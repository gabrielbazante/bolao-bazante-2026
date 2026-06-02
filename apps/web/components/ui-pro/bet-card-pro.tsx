"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import { saveBet } from "@/app/(app)/palpites/actions";
import { Check } from "lucide-react";

type Team = { id: number; name_pt: string; flag_emoji: string };
type Fixture = { id: number; kickoff_at: string; home: Team; away: Team };

export function BetCardPro({
  fixture,
  initialHome,
  initialAway,
  locked,
}: {
  fixture: Fixture;
  initialHome?: number;
  initialAway?: number;
  locked: boolean;
}) {
  const [home, setHome] = useState<number | "">(initialHome ?? "");
  const [away, setAway] = useState<number | "">(initialAway ?? "");
  const [saved, setSaved] = useState(initialHome != null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (home === "" || away === "" || locked) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(
      () =>
        start(async () => {
          await saveBet(fixture.id, Number(home), Number(away));
          setSaved(true);
        }),
      800
    );
  }, [home, away, locked, fixture.id]);

  const kickoff = new Date(fixture.kickoff_at);
  const dateStr = kickoff.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div
      className="rounded-2xl bg-card p-4"
      style={{
        boxShadow:
          "0 2px 8px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04)",
        border: "1px solid rgba(0,0,0,.04)",
      }}
    >
      {/* Teams + inputs */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Home team */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-3xl"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.15))" }}
          >
            {fixture.home.flag_emoji}
          </span>
          <span className="text-[10px] font-bold text-foreground">
            {fixture.home.name_pt}
          </span>
        </div>

        {/* Score inputs */}
        <div className="flex items-center gap-1">
          <input
            className="input-depth w-10 h-12 text-center font-display text-2xl text-primary"
            type="number"
            min={0}
            max={20}
            value={home}
            disabled={locked}
            onChange={(e) => {
              setSaved(false);
              setHome(e.target.value === "" ? "" : Number(e.target.value));
            }}
          />
          <span className="text-muted-foreground font-bold text-sm mx-1">×</span>
          <input
            className="input-depth w-10 h-12 text-center font-display text-2xl text-primary"
            type="number"
            min={0}
            max={20}
            value={away}
            disabled={locked}
            onChange={(e) => {
              setSaved(false);
              setAway(e.target.value === "" ? "" : Number(e.target.value));
            }}
          />
        </div>

        {/* Away team */}
        <div className="flex flex-col items-center gap-1">
          <span
            className="text-3xl"
            style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.15))" }}
          >
            {fixture.away.flag_emoji}
          </span>
          <span className="text-[10px] font-bold text-foreground">
            {fixture.away.name_pt}
          </span>
        </div>
      </div>

      {/* Time */}
      <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {dateStr}
      </p>

      {/* Save status */}
      <div className="mt-1 flex items-center justify-end gap-1 h-4">
        {pending && (
          <span className="text-[10px] text-muted-foreground">Salvando…</span>
        )}
        {!pending && saved && (
          <>
            <span
              className="flex h-4 w-4 items-center justify-center rounded-full text-white"
              style={{ background: "#006633" }}
            >
              <Check size={9} />
            </span>
            <span className="text-[10px] font-semibold" style={{ color: "#006633" }}>
              Salvo
            </span>
          </>
        )}
      </div>
    </div>
  );
}
