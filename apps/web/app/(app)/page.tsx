import { createClient } from "@/lib/supabase/server";
import { PrizeCard } from "@/components/prize-card";

export default async function HomePage() {
  const supabase = await createClient();
  const { count } = await supabase.from("profiles")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);
  const { data: settings } = await supabase
    .from("settings").select("entry_fee_cents").eq("id", 1).single();
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-center">Bolão Bazante 2026</h1>
      <PrizeCard initialCount={count ?? 0} feeCents={settings?.entry_fee_cents ?? 1000} />
      <p className="text-center text-muted-foreground text-sm">
        Em breve: palpites, ranking, ao vivo.
      </p>
    </div>
  );
}
