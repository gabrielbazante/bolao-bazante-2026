"use client";
import { useState } from "react";
import { setManualResult } from "./actions";
import { Save } from "lucide-react";

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

  const inputCls =
    "input-depth w-12 h-9 text-center text-base font-display text-primary px-1";

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-semibold text-muted-foreground w-full">
        FT: {homeLabel}
      </span>
      <input
        type="number"
        min={0}
        placeholder="0"
        value={homeFt}
        onChange={(e) => setHomeFt(e.target.value)}
        className={inputCls}
        required
      />
      <span className="text-sm text-muted-foreground">×</span>
      <input
        type="number"
        min={0}
        placeholder="0"
        value={awayFt}
        onChange={(e) => setAwayFt(e.target.value)}
        className={inputCls}
        required
      />
      <span className="text-xs text-muted-foreground">ET:</span>
      <input
        type="number"
        min={0}
        placeholder="-"
        value={homeEt}
        onChange={(e) => setHomeEt(e.target.value)}
        className={inputCls}
      />
      <span className="text-sm text-muted-foreground">×</span>
      <input
        type="number"
        min={0}
        placeholder="-"
        value={awayEt}
        onChange={(e) => setAwayEt(e.target.value)}
        className={inputCls}
      />
      <button
        type="submit"
        disabled={saving}
        className="btn-3d btn-3d-primary px-4 py-2 text-xs"
      >
        <Save size={12} />
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
