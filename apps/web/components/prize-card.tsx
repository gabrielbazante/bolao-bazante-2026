"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PrizeCard({
  initialCount,
  feeCents,
}: {
  initialCount: number;
  feeCents: number;
}) {
  const [count, setCount] = useState(initialCount);
  const prize = (count * feeCents) / 100;
  const prizeFormatted = prize.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("profiles-approved")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async () => {
          const { count } = await supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .not("approved_at", "is", null);
          if (count != null) setCount(count);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div
      className="relative overflow-hidden rounded-2xl px-5 py-6 text-white"
      style={{
        background:
          "linear-gradient(135deg, #003d7a 0%, #006633 60%, #00ff88 200%)",
        boxShadow:
          "0 20px 40px -10px rgba(0,61,122,.55), 0 4px 12px rgba(0,0,0,.15), inset 0 1px 0 rgba(255,255,255,.2)",
      }}
    >
      {/* Animated gold glow top-right */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-36 w-36"
        style={{
          background:
            "radial-gradient(circle, rgba(255,215,0,.5) 0%, transparent 70%)",
          filter: "blur(10px)",
          animation: "prize-glow 4s ease-in-out infinite",
        }}
      />

      {/* Trophy watermark bottom-right */}
      <div
        className="pointer-events-none absolute -bottom-2 -right-2 font-display text-[100px] leading-none select-none"
        style={{ opacity: 0.08, transform: "rotate(-15deg)" }}
      >
        🏆
      </div>

      {/* Content */}
      <p className="relative text-[10px] font-semibold uppercase tracking-[2px] opacity-85">
        🏆 PRÊMIO ATUAL
      </p>

      <p
        className="relative my-1 font-display leading-none text-[56px] tracking-wide"
        style={{
          color: "#ffd700",
          textShadow:
            "0 4px 12px rgba(255,215,0,.4), 0 2px 4px rgba(0,0,0,.3)",
        }}
      >
        R$ {prizeFormatted}
      </p>

      <p className="relative text-xs font-medium opacity-90">
        {count} participantes confirmados
      </p>

      <div
        className="relative mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
        style={{
          background: "rgba(255,215,0,.2)",
          color: "#ffd700",
        }}
      >
        ↑ +R$ {feeCents / 100} por novo participante
      </div>
    </div>
  );
}
