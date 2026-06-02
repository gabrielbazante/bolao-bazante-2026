import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixBox } from "@/components/pix-box";

export default async function PendingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("approved_at, full_name")
    .eq("id", user.id)
    .single();
  if (profile?.approved_at) redirect("/");

  const { data: settings } = await supabase
    .from("settings")
    .select("pix_key, entry_fee_cents")
    .eq("id", 1)
    .single();
  const { count } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);
  const prize = ((count ?? 0) * (settings?.entry_fee_cents ?? 1000)) / 100;
  const prizeFormatted = prize.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const firstName = profile?.full_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-5">
      {/* Logo */}
      <div className="text-center">
        <h1
          className="font-display leading-none text-4xl tracking-widest"
          style={{ color: "#ffd700", textShadow: "0 4px 12px rgba(255,215,0,.3)" }}
        >
          Bolão Bazante
        </h1>
        <div className="font-display leading-none text-5xl tracking-[4px] text-white">
          2026
        </div>
      </div>

      {/* Main card */}
      <div className="glass p-6 flex flex-col gap-4">
        <div className="text-center text-white">
          <h2 className="text-xl font-extrabold">Quase lá, {firstName}! 🎉</h2>
          <p className="mt-1 text-sm text-white/75">
            Faz o Pix de R$ {(settings?.entry_fee_cents ?? 1000) / 100} pro Gabriel.
            Assim que ele confirmar, você entra no bolão.
          </p>
        </div>

        {/* PixBox */}
        <PixBox pixKey={settings?.pix_key ?? ""} />

        {/* Prize mini card */}
        <div
          className="relative overflow-hidden rounded-2xl px-4 py-4 text-center text-white"
          style={{
            background:
              "linear-gradient(135deg, #003d7a 0%, #006633 60%, #00ff88 200%)",
            boxShadow:
              "0 8px 24px -4px rgba(0,61,122,.4), inset 0 1px 0 rgba(255,255,255,.15)",
          }}
        >
          {/* Glow */}
          <div
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24"
            style={{
              background: "radial-gradient(circle, rgba(255,215,0,.5), transparent 70%)",
              filter: "blur(10px)",
              animation: "prize-glow 4s ease-in-out infinite",
            }}
          />
          <p className="relative text-[10px] font-semibold uppercase tracking-widest opacity-80">
            🏆 Prêmio atual
          </p>
          <p
            className="relative font-display text-5xl"
            style={{ color: "#ffd700", textShadow: "0 4px 12px rgba(255,215,0,.4)" }}
          >
            R$ {prizeFormatted}
          </p>
          <p className="relative text-xs opacity-80">{count ?? 0} participantes confirmados</p>
        </div>

        {/* Sign out */}
        <form
          action={async () => {
            "use server";
            const s = await createClient();
            await s.auth.signOut();
            redirect("/login");
          }}
        >
          <button
            type="submit"
            className="w-full text-center text-xs text-white/50 underline transition-opacity hover:opacity-80"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </div>
  );
}
