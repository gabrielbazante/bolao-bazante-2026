import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixBox } from "@/components/pix-box";
import { Card } from "@/components/ui/card";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("approved_at, full_name").eq("id", user.id).single();
  if (profile?.approved_at) redirect("/");

  const { data: settings } = await supabase
    .from("settings").select("pix_key, entry_fee_cents").eq("id", 1).single();
  const { count } = await supabase
    .from("profiles").select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);
  const prize = ((count ?? 0) * (settings?.entry_fee_cents ?? 1000)) / 100;

  return (
    <Card className="p-6 space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Quase lá, {profile?.full_name?.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faz o Pix de R$ 10 pro Gabriel. Assim que ele confirmar, você entra no bolão.
        </p>
      </div>
      <PixBox pixKey={settings?.pix_key ?? ""} />
      <div className="rounded-xl bg-gradient-to-br from-emerald-700 to-blue-900 text-white p-4 text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Prêmio atual</p>
        <p className="text-3xl font-black text-yellow-300">R$ {prize}</p>
        <p className="text-xs opacity-80">{count ?? 0} participantes confirmados</p>
      </div>
      <form action={async () => { "use server";
        const s = await createClient();
        await s.auth.signOut();
        redirect("/login");
      }}>
        <button className="text-xs text-muted-foreground underline w-full text-center">Sair</button>
      </form>
    </Card>
  );
}
