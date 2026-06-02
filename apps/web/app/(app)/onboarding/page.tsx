"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { pickChampions } from "./actions";
import { Trophy } from "lucide-react";

type Team = { id: number; name_pt: string; flag_emoji: string };

export default function OnboardingPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .from("teams")
      .select("id,name_pt,flag_emoji")
      .order("name_pt")
      .then((r) => setTeams(r.data ?? []));
  }, []);

  const togglePick = (id: number) =>
    setPicked((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : p.length < 2 ? [...p, id] : p
    );

  const canConfirm = picked.length === 2;

  return (
    <div
      className="min-h-screen"
      style={{ background: "linear-gradient(135deg, #003d7a 0%, #001f3f 100%)" }}
    >
      {/* Header */}
      <div className="px-4 pt-6 pb-4 text-center text-white">
        <div
          className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full"
          style={{
            background: "rgba(255,215,0,.15)",
            border: "2px solid rgba(255,215,0,.4)",
          }}
        >
          <Trophy size={28} style={{ color: "#ffd700" }} />
        </div>
        <h1
          className="font-display text-4xl tracking-wider"
          style={{ color: "#ffd700" }}
        >
          Escolha 2 Campeões
        </h1>
        <p className="mt-2 text-sm text-white/75">
          Se uma delas vencer: <strong className="text-white">+50 pontos!</strong>
        </p>
        <p className="mt-1 text-xs text-white/55">
          {picked.length}/2 selecionados
        </p>
      </div>

      {/* Teams grid */}
      <div className="px-4 pb-24">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {teams.map((t) => {
            const sel = picked.includes(t.id);
            return (
              <button
                key={t.id}
                onClick={() => togglePick(t.id)}
                className={`hover-lift flex flex-col items-center gap-1.5 rounded-2xl p-3 transition-all ${
                  sel ? "text-[#003d7a]" : "text-white bg-white/10"
                }`}
                style={
                  sel
                    ? {
                        background: "#ffd700",
                        boxShadow:
                          "0 6px 0 #b88a00, 0 8px 16px rgba(184,138,0,.4), inset 0 2px 0 rgba(255,255,255,.6)",
                        transform: "translateY(-2px)",
                      }
                    : {
                        border: "1px solid rgba(255,255,255,.15)",
                      }
                }
              >
                <span className="text-2xl">{t.flag_emoji}</span>
                <span className="text-[10px] font-bold text-center leading-tight">
                  {t.name_pt}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sticky confirm button */}
      <div
        className="fixed bottom-0 inset-x-0 px-4 py-4 z-50"
        style={{
          background:
            "linear-gradient(to top, rgba(0,20,60,1) 70%, transparent)",
        }}
      >
        {err && (
          <p className="mb-2 text-center text-xs font-semibold text-red-400">{err}</p>
        )}
        <button
          className={`btn-3d w-full ${canConfirm ? "btn-3d-gold" : "btn-3d-dark opacity-50"}`}
          disabled={!canConfirm || loading}
          onClick={async () => {
            setLoading(true);
            const r = await pickChampions(picked[0]!, picked[1]!);
            if (r?.error) {
              setErr(r.error);
              setLoading(false);
            }
          }}
        >
          <Trophy size={16} />
          {loading ? "Confirmando…" : "Confirmar campeões"}
        </button>
      </div>
    </div>
  );
}
