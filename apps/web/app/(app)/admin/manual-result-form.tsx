"use client";
import { useState } from "react";
import { setManualResult } from "./actions";
import { Button } from "@/components/ui/button";

type Props = {
  fixtureId: number;
  homeLabel: string;
  awayLabel: string;
};

export function ManualResultForm({ fixtureId, homeLabel, awayLabel }: Props) {
  const [homeFt, setHomeFt] = useState("");
  const [awayFt, setAwayFt] = useState("");
  const [homeEt, setHomeEt] = useState("");
  const [awayEt, setAwayEt] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (homeFt === "" || awayFt === "") return;
    setSaving(true);
    await setManualResult(fixtureId, {
      home_ft: Number(homeFt),
      away_ft: Number(awayFt),
      home_et: homeEt !== "" ? Number(homeEt) : null,
      away_et: awayEt !== "" ? Number(awayEt) : null,
    });
    setSaving(false);
  }

  const inp = "w-12 border rounded px-2 py-1 text-center text-sm";

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2 mt-2">
      <span className="text-xs text-muted-foreground w-full">FT: {homeLabel}</span>
      <input type="number" min={0} placeholder="0" value={homeFt}
        onChange={e => setHomeFt(e.target.value)} className={inp} required />
      <span className="text-xs">×</span>
      <input type="number" min={0} placeholder="0" value={awayFt}
        onChange={e => setAwayFt(e.target.value)} className={inp} required />
      <span className="text-xs text-muted-foreground">ET:</span>
      <input type="number" min={0} placeholder="-" value={homeEt}
        onChange={e => setHomeEt(e.target.value)} className={inp} />
      <span className="text-xs">×</span>
      <input type="number" min={0} placeholder="-" value={awayEt}
        onChange={e => setAwayEt(e.target.value)} className={inp} />
      <Button size="sm" type="submit" disabled={saving}>
        {saving ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
