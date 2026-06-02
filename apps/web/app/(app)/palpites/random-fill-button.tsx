"use client";
import { useState, useTransition } from "react";
import { Dices } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { fillRandomBets } from "./actions";

export function RandomFillButton({ emptyCount }: { emptyCount: number }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-3d btn-3d-dark flex w-full items-center justify-center gap-2"
      >
        <Dices size={18} />
        Gerar palpites aleatórios ({emptyCount} vazios)
      </button>
      <p className="mt-1.5 text-center text-[10px] text-muted-foreground">
        Placares ponderados pela distribuição real de Copas do Mundo. Só preenche os vazios.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Dices className="h-5 w-5 text-primary" />
              Preencher {emptyCount} palpites aleatórios?
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed pt-2">
              Vou gerar placares automaticamente para as <strong>{emptyCount} partidas
              que você ainda não palpitou</strong>, usando a distribuição real de Copas do
              Mundo (1-0 mais comum, depois 2-1, 0-0, 1-1...).
              <br /><br />
              <span className="text-foreground/70">
                Seus palpites já feitos <strong>não serão alterados</strong>. Você ainda pode
                editar qualquer palpite depois.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row gap-2 sm:gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setOpen(false)}
              className="btn-3d flex-1 bg-gradient-to-b from-slate-200 to-slate-300 text-slate-800 disabled:opacity-50"
              style={{
                boxShadow:
                  "0 6px 0 #94a3b8, 0 8px 16px rgba(148,163,184,.35), inset 0 2px 0 rgba(255,255,255,.6), inset 0 -2px 0 rgba(0,0,0,.08)",
              }}
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  await fillRandomBets();
                  setOpen(false);
                });
              }}
              className="btn-3d btn-3d-primary flex-1 disabled:opacity-60"
            >
              {pending ? "Gerando…" : "Gerar agora"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
