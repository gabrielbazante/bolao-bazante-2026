"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; full_name: string; avatar_url: string | null; total_points: number };

function MedalBadge({ pos }: { pos: number }) {
  if (pos === 1) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
        style={{
          background: "linear-gradient(135deg, #ffd700, #f0b800)",
          color: "#003d7a",
          boxShadow: "0 2px 8px rgba(255,215,0,.5), inset 0 1px 0 rgba(255,255,255,.5)",
        }}
      >
        1
      </span>
    );
  }
  if (pos === 2) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black"
        style={{
          background: "linear-gradient(135deg, #e2e8f0, #94a3b8)",
          color: "#1e293b",
          boxShadow: "0 2px 8px rgba(148,163,184,.5), inset 0 1px 0 rgba(255,255,255,.5)",
        }}
      >
        2
      </span>
    );
  }
  if (pos === 3) {
    return (
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white"
        style={{
          background: "linear-gradient(135deg, #c2771a, #92400e)",
          boxShadow: "0 2px 8px rgba(180,83,9,.5), inset 0 1px 0 rgba(255,255,255,.3)",
        }}
      >
        3
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-black text-muted-foreground">
      {pos}
    </span>
  );
}

export function RankingList({
  initial,
  myId,
  championFlags,
}: {
  initial: Row[];
  myId: string;
  championFlags: Record<string, { flag: string; out: boolean }[]>;
}) {
  const [rows, setRows] = useState(initial);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("ranking-bets")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bets" },
        async () => {
          const { data } = await supabase.from("ranking").select("*");
          if (data) setRows(data as Row[]);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full bg-card"
          style={{
            boxShadow: "0 4px 16px -4px rgba(0,61,122,.15)",
          }}
        >
          <span className="text-3xl">🏆</span>
        </div>
        <p className="font-bold text-foreground">Ranking ainda vazio</p>
        <p className="text-sm text-muted-foreground">
          Os pontos aparecerão após os primeiros resultados.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const me = r.id === myId;
        const pos = i + 1;
        return (
          <li
            key={r.id}
            className={`hover-lift flex items-center gap-3 rounded-2xl p-3 transition-all ${
              me ? "text-white" : "bg-card"
            }`}
            style={
              me
                ? {
                    background:
                      "linear-gradient(135deg, #003d7a 0%, #006633 100%)",
                    boxShadow: "0 4px 16px -4px rgba(0,61,122,.4)",
                  }
                : {
                    boxShadow:
                      "0 1px 0 rgba(0,0,0,.05), 0 2px 4px rgba(0,0,0,.04), inset 0 1px 0 rgba(255,255,255,1)",
                    border: "1px solid rgba(0,0,0,.04)",
                  }
            }
          >
            {/* Position / medal */}
            <MedalBadge pos={pos} />

            {/* Avatar */}
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold"
              style={
                me
                  ? {
                      background: "rgba(255,255,255,.2)",
                      color: "#fff",
                    }
                  : {
                      background:
                        pos === 1
                          ? "linear-gradient(135deg, #ffd700, #f0b800)"
                          : pos === 2
                          ? "#e2e8f0"
                          : pos === 3
                          ? "#c2771a"
                          : "var(--muted)",
                      color: pos <= 3 ? (pos === 1 ? "#003d7a" : pos === 2 ? "#1e293b" : "#fff") : "var(--muted-foreground)",
                    }
              }
            >
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                r.full_name
                  .split(" ")
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join("")
              )}
            </div>

            {/* Name + champion picks */}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate text-sm font-semibold">
                {me ? "Você" : r.full_name}
              </span>
              {championFlags[r.id]?.length ? (
                <span
                  className="flex shrink-0 items-center gap-1"
                  title="Seleções escolhidas para campeã (escurecida = eliminada)"
                  aria-label="Seleções escolhidas para campeã"
                >
                  {championFlags[r.id]!.map((c, idx) => (
                    <span
                      key={idx}
                      className={`text-base leading-none ${c.out ? "opacity-30 grayscale" : ""}`}
                    >
                      {c.flag}
                    </span>
                  ))}
                </span>
              ) : null}
            </div>

            {/* Points */}
            <span
              className="font-display text-2xl leading-none"
              style={{ color: me ? "#ffd700" : "var(--primary)" }}
            >
              {r.total_points}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
