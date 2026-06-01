import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/button";
import { ManualResultForm } from "./manual-result-form";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!me?.is_admin) redirect("/");

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .is("approved_at", null)
    .order("created_at", { ascending: true });

  const { data: late } = await supabase.from("fixtures")
    .select("id, kickoff_at, home:home_team_id(name_pt), away:away_team_id(name_pt)")
    .neq("status", "finished")
    .lt("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: false })
    .limit(10);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Admin · Aprovações pendentes</h1>
      {pending?.length === 0 && <p className="text-muted-foreground">Nada pendente.</p>}
      <ul className="space-y-2">
        {pending?.map((p) => (
          <li key={p.id} className="rounded-xl border p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold">{p.full_name}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <form action={approveUser.bind(null, p.id)}>
              <Button size="sm">Aprovar</Button>
            </form>
            <form action={rejectUser.bind(null, p.id)}>
              <Button size="sm" variant="destructive">Rejeitar</Button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="text-xl font-bold pt-4">Resultados manuais</h2>
      <p className="text-sm text-muted-foreground">Jogos passados sem resultado registrado.</p>
      {(!late || late.length === 0) && <p className="text-muted-foreground">Nenhum jogo pendente.</p>}
      <ul className="space-y-2">
        {late?.map((f) => {
          const home = (f.home as any)?.name_pt ?? "?";
          const away = (f.away as any)?.name_pt ?? "?";
          return (
            <li key={f.id} className="rounded-xl border p-3">
              <p className="font-semibold text-sm">{home} × {away}</p>
              <p className="text-xs text-muted-foreground">
                {new Date(f.kickoff_at).toLocaleString("pt-BR")}
              </p>
              <ManualResultForm fixtureId={f.id} homeLabel={home} awayLabel={away} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
