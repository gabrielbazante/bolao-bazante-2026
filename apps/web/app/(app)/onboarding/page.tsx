"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { pickChampions } from "./actions";

type Team = { id: number; name_pt: string; flag_emoji: string };

export default function OnboardingPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    createClient().from("teams").select("id,name_pt,flag_emoji")
      .order("name_pt").then(r => setTeams(r.data ?? []));
  }, []);
  const togglePick = (id: number) => setPicked(p =>
    p.includes(id) ? p.filter(x => x !== id) : p.length < 2 ? [...p, id] : p);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <h1 className="text-xl font-bold text-center">Escolha 2 seleções pra serem campeãs</h1>
      <p className="text-sm text-muted-foreground text-center">
        Se uma delas for campeã: <strong>+50 pontos</strong>.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {teams.map(t => {
          const sel = picked.includes(t.id);
          return (
            <button key={t.id} onClick={() => togglePick(t.id)}
              className={`rounded-xl border p-2 flex flex-col items-center gap-1
                ${sel ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300" : "border-muted"}`}>
              <span className="text-2xl">{t.flag_emoji}</span>
              <span className="text-[10px] font-semibold text-center">{t.name_pt}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="text-red-600 text-sm text-center">{err}</p>}
      <Button className="w-full" disabled={picked.length !== 2}
        onClick={async () => {
          const r = await pickChampions(picked[0]!, picked[1]!);
          if (r?.error) setErr(r.error);
        }}>
        Confirmar campeões
      </Button>
    </div>
  );
}
