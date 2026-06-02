"use client";
import { useState } from "react";
import { CheckCircle2, Clock, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface SubmitBetsButtonProps {
  filledCount: number;
  totalCount: number;
  firstKickoffISO: string;
  phaseName: string;
}

export function SubmitBetsButton({
  filledCount,
  totalCount,
  firstKickoffISO,
  phaseName,
}: SubmitBetsButtonProps) {
  const [open, setOpen] = useState(false);

  const lockTime = new Date(new Date(firstKickoffISO).getTime() - 60 * 60 * 1000);
  const lockFormatted = lockTime.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

  const allFilled = filledCount === totalCount;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-3d btn-3d-primary flex w-full items-center justify-center gap-2"
      >
        <Send size={18} />
        Enviar palpites ({filledCount}/{totalCount})
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              {allFilled ? "Palpites enviados!" : "Quase lá!"}
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-sm leading-relaxed">
              {allFilled ? (
                <span className="block">
                  Todos os <strong>{totalCount} palpites</strong> da {phaseName} estão
                  salvos. ⚽
                </span>
              ) : (
                <span className="block">
                  Você tem <strong>{filledCount} de {totalCount}</strong> palpites
                  preenchidos. Não esquece dos {totalCount - filledCount} que faltam —
                  jogos sem palpite valem zero!
                </span>
              )}

              <span className="flex items-start gap-2 rounded-xl border-l-4 border-amber-500 bg-amber-50 p-3 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Você pode alterar qualquer palpite até <strong>1 hora antes do
                  primeiro jogo da fase</strong> ({lockFormatted}). Depois disso,
                  os palpites travam.
                </span>
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="btn-3d btn-3d-dark w-full"
            >
              Entendi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
