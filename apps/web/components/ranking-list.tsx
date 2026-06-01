"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; full_name: string; avatar_url: string | null; total_points: number };

export function RankingList({ initial, myId }: { initial: Row[]; myId: string }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("ranking-bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" },
        async () => {
          const { data } = await supabase.from("ranking").select("*");
          if (data) setRows(data as Row[]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const medal = (i: number) =>
    i === 0 ? "bg-yellow-300 text-blue-900" :
    i === 1 ? "bg-gray-300" :
    i === 2 ? "bg-orange-700 text-white" : "bg-muted";
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const me = r.id === myId;
        return (
          <li key={r.id} className={`rounded-xl border p-2 flex items-center gap-2
            ${me ? "bg-gradient-to-br from-blue-900 to-emerald-700 text-white" : "bg-card"}`}>
            <span className="w-6 text-center font-black">{i+1}</span>
            <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${medal(i)}`}>
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover" /> :
               r.full_name.split(" ").map(s => s[0]).slice(0,2).join("")}
            </span>
            <span className="flex-1 text-sm font-semibold truncate">{me ? "Você" : r.full_name}</span>
            <span className={`font-extrabold ${me ? "text-yellow-300" : "text-primary"}`}>{r.total_points}</span>
          </li>
        );
      })}
    </ul>
  );
}
