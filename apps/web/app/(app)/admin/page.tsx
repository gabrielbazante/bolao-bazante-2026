import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { approveUser, rejectUser } from "./actions";
import { ManualResultForm } from "./manual-result-form";
import { TopBar } from "@/components/ui-pro/top-bar";
import { CheckCircle, XCircle, ClipboardList, AlarmClock } from "lucide-react";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin, full_name, avatar_url")
    .eq("id", user!.id)
    .single();

  if (!me?.is_admin) redirect("/");

  const name = me?.full_name ?? "";
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0])
    .join("")
    .toUpperCase() || "?";

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .is("approved_at", null)
    .order("created_at", { ascending: true });

  const { data: late } = await supabase
    .from("fixtures")
    .select(
      "id, kickoff_at, home:home_team_id(name_pt), away:away_team_id(name_pt)"
    )
    .neq("status", "finished")
    .lt("kickoff_at", new Date().toISOString())
    .order("kickoff_at", { ascending: false })
    .limit(10);

  // Quem ainda não palpitou na fase aberta. Usa admin client porque a RLS de `bets`
  // só deixa cada um ler os próprios palpites (esta página já é admin-gated).
  const admin = createAdminClient();
  const { data: openPhase } = await admin
    .from("phases")
    .select("id, name, closes_at")
    .eq("status", "open")
    .maybeSingle();

  let missingBettors: { id: string; name: string; count: number }[] = [];
  let approvedCount = 0;
  let phaseFixtureCount = 0;
  if (openPhase) {
    const [{ data: phaseFixtures }, { data: approved }] = await Promise.all([
      admin.from("fixtures").select("id").eq("phase_id", openPhase.id),
      admin.from("profiles").select("id, full_name").not("approved_at", "is", null),
    ]);
    const fixtureIds = (phaseFixtures ?? []).map((f: { id: number }) => f.id);
    phaseFixtureCount = fixtureIds.length;
    approvedCount = (approved ?? []).length;
    const { data: bets } = fixtureIds.length
      ? await admin.from("bets").select("user_id").in("fixture_id", fixtureIds)
      : { data: [] as { user_id: string }[] };
    const perUser = new Map<string, number>();
    for (const b of (bets ?? []) as { user_id: string }[]) {
      perUser.set(b.user_id, (perUser.get(b.user_id) ?? 0) + 1);
    }
    missingBettors = (approved ?? [])
      .map((p: { id: string; full_name: string | null }) => ({
        id: p.id,
        name: p.full_name ?? "?",
        count: perUser.get(p.id) ?? 0,
      }))
      .filter((u) => u.count < phaseFixtureCount)
      .sort((a, b) => a.count - b.count || a.name.localeCompare(b.name));
  }
  const doneCount = approvedCount - missingBettors.length;
  const closesLabel = openPhase?.closes_at
    ? new Date(openPhase.closes_at).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="flex flex-col">
      <TopBar title="Admin" userInitials={initials} avatarUrl={me?.avatar_url} />

      <div className="mx-auto w-full max-w-2xl space-y-5 p-4 pb-6">
        {/* Quem falta palpitar */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-foreground">
            <AlarmClock size={18} />
            Quem falta palpitar
          </h2>

          {!openPhase ? (
            <div
              className="flex flex-col items-center gap-2 rounded-2xl bg-card py-8 text-center"
              style={{
                boxShadow: "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                border: "1px solid rgba(0,0,0,.05)",
              }}
            >
              <p className="text-sm font-bold text-foreground">Nenhuma fase aberta.</p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Fase{" "}
                <span className="font-semibold text-foreground">{openPhase.name}</span>
                {closesLabel ? <> · trava {closesLabel}</> : null} ·{" "}
                <span className="font-semibold text-foreground">
                  {doneCount}/{approvedCount}
                </span>{" "}
                completos
              </p>

              {missingBettors.length === 0 ? (
                <div
                  className="flex flex-col items-center gap-3 rounded-2xl bg-card py-8 text-center"
                  style={{
                    boxShadow: "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                    border: "1px solid rgba(0,0,0,.05)",
                  }}
                >
                  <CheckCircle size={28} className="text-green-500" />
                  <p className="text-sm font-bold text-foreground">
                    Todos já palpitaram! 🎉
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {missingBettors.map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center gap-3 rounded-2xl bg-card p-4"
                      style={{
                        boxShadow: "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                        border: "1px solid rgba(0,0,0,.05)",
                      }}
                    >
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                        style={{
                          background: "linear-gradient(135deg, #003d7a 0%, #006633 100%)",
                        }}
                      >
                        {u.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")
                          .toUpperCase()}
                      </div>
                      <p className="min-w-0 flex-1 truncate font-semibold text-foreground">
                        {u.name}
                      </p>
                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                          u.count === 0
                            ? "bg-red-500/10 text-red-600"
                            : "bg-amber-500/15 text-amber-600"
                        }`}
                      >
                        {u.count === 0 ? "não começou" : `${u.count}/${phaseFixtureCount}`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>

        {/* Approvals section */}
        <div>
          <h2 className="mb-3 flex items-center gap-2 text-base font-extrabold text-foreground">
            <ClipboardList size={18} />
            Aprovações pendentes
          </h2>

          {pending?.length === 0 ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl bg-card py-10 text-center"
              style={{
                boxShadow:
                  "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                border: "1px solid rgba(0,0,0,.05)",
              }}
            >
              <CheckCircle size={36} className="text-green-500" />
              <div>
                <p className="font-bold text-foreground">Tudo aprovado!</p>
                <p className="text-sm text-muted-foreground">
                  Nenhum participante aguardando aprovação.
                </p>
              </div>
            </div>
          ) : (
            <ul className="space-y-2">
              {pending?.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center gap-3 rounded-2xl bg-card p-4"
                  style={{
                    boxShadow:
                      "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                    border: "1px solid rgba(0,0,0,.05)",
                  }}
                >
                  {/* Initials */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white"
                    style={{
                      background:
                        "linear-gradient(135deg, #003d7a 0%, #006633 100%)",
                    }}
                  >
                    {(p.full_name ?? "?")
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((s: string) => s[0])
                      .join("")
                      .toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-foreground">
                      {p.full_name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.email}
                    </p>
                  </div>

                  <form action={approveUser.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="btn-3d btn-3d-primary px-4 py-2 text-xs"
                    >
                      <CheckCircle size={12} />
                      Aprovar
                    </button>
                  </form>
                  <form action={rejectUser.bind(null, p.id)}>
                    <button
                      type="submit"
                      className="btn-3d btn-3d-destructive px-4 py-2 text-xs"
                    >
                      <XCircle size={12} />
                      Rejeitar
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Manual results section */}
        <div>
          <h2 className="mb-3 text-base font-extrabold text-foreground">
            Resultados manuais
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">
            Jogos passados sem resultado registrado.
          </p>

          {(!late || late.length === 0) ? (
            <div
              className="flex flex-col items-center gap-3 rounded-2xl bg-card py-8 text-center"
              style={{
                boxShadow:
                  "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                border: "1px solid rgba(0,0,0,.05)",
              }}
            >
              <CheckCircle size={28} className="text-green-500" />
              <p className="text-sm font-bold text-foreground">
                Nenhum resultado pendente.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {late?.map((f) => {
                const home = (f.home as any)?.name_pt ?? "?";
                const away = (f.away as any)?.name_pt ?? "?";
                return (
                  <li
                    key={f.id}
                    className="rounded-2xl bg-card p-4"
                    style={{
                      boxShadow:
                        "0 4px 16px -4px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)",
                      border: "1px solid rgba(0,0,0,.05)",
                    }}
                  >
                    <p className="font-semibold text-sm text-foreground">
                      {home} × {away}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.kickoff_at).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                    </p>
                    <ManualResultForm
                      fixtureId={f.id}
                      homeLabel={home}
                      awayLabel={away}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
