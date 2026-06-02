"use client";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Info, Trophy } from "lucide-react";

const ROWS = [
  ["Fase de Grupos", 1, 2],
  ["32avos",         2, 4],
  ["Oitavas",        3, 6],
  ["Quartas",        7, 14],
  ["Semi",           15, 30],
  ["3º lugar",       13, 26],
  ["Final",          25, 50],
] as const;

export function ScoringLegendSheet() {
  return (
    <Sheet>
      <SheetTrigger className="flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10">
        <Info className="h-3.5 w-3.5" />
        Pontuação
      </SheetTrigger>

      <SheetContent
        side="bottom"
        className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-t-2 border-primary/20 p-0"
      >
        <div className="px-6 pt-6 pb-2">
          <SheetTitle className="font-display text-2xl tracking-wide">
            Como funciona a pontuação
          </SheetTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Pontos por fase do bolão
          </p>
        </div>

        <div className="px-4 pb-2">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-primary/10 text-foreground">
                  <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider">
                    Fase
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-wider">
                    Resultado
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider">
                    Exato
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map(([name, res, exact], idx) => (
                  <tr
                    key={name}
                    className={`border-t border-border/60 ${idx % 2 === 1 ? "bg-muted/30" : ""}`}
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{name}</td>
                    <td className="px-3 py-3 text-right font-display text-lg text-foreground/80 tabular-nums">
                      {res}
                    </td>
                    <td className="px-4 py-3 text-right font-display text-lg text-primary tabular-nums">
                      {exact}
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-accent/40 bg-gradient-to-r from-accent/15 via-accent/10 to-accent/15">
                  <td className="px-4 py-3 font-bold text-foreground">
                    <span className="flex items-center gap-1.5">
                      <Trophy className="h-4 w-4 text-accent" />
                      Campeão cravado (até 2)
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right text-muted-foreground">—</td>
                  <td className="px-4 py-3 text-right font-display text-xl text-accent tabular-nums">
                    +50
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mx-4 mb-6 mt-3 rounded-xl border-l-4 border-primary bg-primary/5 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-primary">
            Critério de desempate
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/80">
            Vence quem cravou o campeão · depois mais placares exatos · depois mais acertos. Persistindo empate, divide o prêmio.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
