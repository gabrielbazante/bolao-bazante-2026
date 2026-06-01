"use client";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

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
      <SheetTrigger className="text-xs px-2 py-1 border rounded font-semibold text-primary">
        ℹ️ Pontuação
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetTitle>Como funciona a pontuação</SheetTitle>
        <table className="w-full text-sm mt-3">
          <thead>
            <tr className="text-xs text-muted-foreground bg-muted">
              <th className="text-left p-2">Fase</th>
              <th className="text-right p-2">Resultado</th>
              <th className="text-right p-2">Exato</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(([name, res, exact]) => (
              <tr key={name} className="border-b">
                <td className="p-2">{name}</td>
                <td className="p-2 text-right font-semibold">{res}</td>
                <td className="p-2 text-right font-semibold">{exact}</td>
              </tr>
            ))}
            <tr className="bg-yellow-50">
              <td className="p-2 font-bold">🏆 Campeão cravado (até 2)</td>
              <td className="p-2 text-right">—</td>
              <td className="p-2 text-right font-bold">+50</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs bg-blue-50 border-l-2 border-blue-700 p-2 rounded">
          <strong>Empate?</strong> Vence quem cravou o campeão · depois mais placares exatos · depois mais acertos. Persistindo empate, divide o prêmio.
        </p>
      </SheetContent>
    </Sheet>
  );
}
