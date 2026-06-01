"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PrizeCard({ initialCount, feeCents }: { initialCount: number; feeCents: number }) {
  const [count, setCount] = useState(initialCount);
  const prize = (count * feeCents) / 100;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("profiles-approved")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async () => {
          const { count } = await supabase
            .from("profiles").select("id", { count: "exact", head: true })
            .not("approved_at", "is", null);
          if (count != null) setCount(count);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-blue-900 text-white p-6 text-center relative overflow-hidden">
      <div className="absolute -top-5 -right-5 w-24 h-24 bg-yellow-300/30 rounded-full blur-2xl" />
      <p className="text-[10px] uppercase tracking-widest opacity-90">🏆 Prêmio atual</p>
      <p className="text-4xl font-black text-yellow-300 my-1 tabular-nums">R$ {prize}</p>
      <p className="text-xs opacity-90">{count} participantes confirmados</p>
    </div>
  );
}
