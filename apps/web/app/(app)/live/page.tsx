import { createClient } from "@/lib/supabase/server";
import { LiveMatchCard } from "@/components/live-match-card";
import { TopBar } from "@/components/ui-pro/top-bar";
import { Tv } from "lucide-react";

export default async function LivePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  const name = profile?.full_name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase() || "?";

  const { data: live } = await supabase
    .from("fixtures")
    .select(
      "id, home_score_ft, away_score_ft, home:home_team_id(id,name_pt,flag_emoji), away:away_team_id(id,name_pt,flag_emoji)"
    )
    .eq("status", "live");

  if (!live?.length) {
    return (
      <div className="flex flex-col">
        <TopBar title="Ao Vivo" userInitials={initials} avatarUrl={profile?.avatar_url} variant="live" />
        <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
          <div
            className="flex h-20 w-20 items-center justify-center rounded-full bg-card"
            style={{
              boxShadow: "0 4px 16px -4px rgba(220,38,38,.2)",
              border: "1px solid rgba(220,38,38,.1)",
            }}
          >
            <Tv size={36} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground">Nenhum jogo ao vivo</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Volte quando um jogo estiver rolando — você verá os palpites em tempo real.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <TopBar title="Ao Vivo" userInitials={initials} avatarUrl={profile?.avatar_url} variant="live" />

      <div className="mx-auto w-full max-w-md space-y-4 p-4 pb-6">
        {/* Live count banner */}
        <div
          className="relative overflow-hidden rounded-2xl p-4 text-center text-white"
          style={{
            background: "linear-gradient(90deg, #dc2626, #b91c1c)",
            boxShadow:
              "0 4px 12px rgba(220,38,38,.4), inset 0 1px 0 rgba(255,255,255,.2)",
          }}
        >
          {/* Shimmer */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(255,255,255,.15), transparent)",
              animation: "shimmer 2s infinite",
            }}
          />
          <p className="relative text-[10px] uppercase tracking-widest opacity-90">
            Rolando agora
          </p>
          <p className="relative font-display text-4xl">
            {live.length} {live.length === 1 ? "jogo" : "jogos"}
          </p>
        </div>

        {live.map((f) => (
          <LiveMatchCard key={f.id} fixture={f as any} />
        ))}
      </div>
    </div>
  );
}
