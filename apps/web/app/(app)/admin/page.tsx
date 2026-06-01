import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/button";

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
    </div>
  );
}
