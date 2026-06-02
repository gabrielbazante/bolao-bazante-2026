import Link from "next/link";

interface LiveBannerProps {
  count: number;
}

export function LiveBanner({ count }: LiveBannerProps) {
  return (
    <Link href="/live" className="block">
      <div
        className="relative flex items-center gap-3 overflow-hidden rounded-2xl px-4 py-3 font-bold text-sm text-white"
        style={{
          background: "linear-gradient(90deg, #dc2626, #b91c1c)",
          boxShadow: "0 4px 12px rgba(220,38,38,.4), inset 0 1px 0 rgba(255,255,255,.2)",
        }}
      >
        {/* Shimmer overlay */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
            animation: "shimmer 2s infinite",
          }}
        />

        {/* Pulse dot */}
        <div
          className="relative z-10 h-3 w-3 shrink-0 rounded-full bg-white"
          style={{
            boxShadow: "0 0 12px #fff",
            animation: "pulse 1s infinite",
          }}
        />

        <span className="relative z-10 flex-1">
          {count === 1 ? "1 jogo AO VIVO agora" : `${count} jogos AO VIVO agora`}
        </span>

        <span className="relative z-10 text-lg">→</span>
      </div>
    </Link>
  );
}
