type Standing = { group_code: string; position: number; team_id: number; points?: number; gd?: number };

export function resolveSource(
  source: string,
  standings: Standing[],
  winners: Map<string, number>,
): number | null {
  // Pattern "1A", "2C"
  const groupPos = /^([12])([A-L])$/.exec(source);
  if (groupPos) {
    const [, pos, g] = groupPos;
    const row = standings.find(s => s.group_code === g && s.position === Number(pos));
    return row?.team_id ?? null;
  }
  // Winner-of: "W_R32_5"
  const wm = /^W_(R32|R16|QF|SF)_(\d+)$/.exec(source);
  if (wm) return winners.get(`${wm[1]}_${wm[2]}`) ?? null;
  // Loser-of: "L_SF_1"
  const lm = /^L_SF_(\d+)$/.exec(source);
  if (lm) return winners.get(`L_SF_${lm[1]}`) ?? null;
  // Best-third: "3ACDEF"
  const tm = /^3([A-L]+)$/.exec(source);
  if (tm) {
    const allowed = new Set(tm[1]!.split(""));
    const thirds = standings.filter(s => s.position === 3 && allowed.has(s.group_code));
    thirds.sort((a, b) =>
      (b.points ?? 0) - (a.points ?? 0) ||
      (b.gd ?? 0) - (a.gd ?? 0));
    return thirds[0]?.team_id ?? null;
  }
  return null;
}
