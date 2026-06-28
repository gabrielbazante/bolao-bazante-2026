# Aleatório Realista — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar o palpite aleatório (auto-fill do cron + botão do usuário) realista, enviesando vencedor e margem pela força das seleções classificadas à R32.

**Architecture:** Lib pura `team-strength.ts` (notas base curadas + ajuste de forma deste torneio) e `random-bet.ts` (modelo híbrido Elo + frequências de Copa reponderadas). Glue `team-ratings.ts` monta `Map<teamId, força>` do banco. Os dois consumidores (cron, server action) passam as duas forças por fixture.

**Tech Stack:** TypeScript, Next.js 16, Supabase (`@supabase/supabase-js`), Vitest.

Spec: `docs/superpowers/specs/2026-06-28-aleatorio-realista-design.md`

---

## Arquivos

- Criar: `apps/web/lib/team-strength.ts` — `BASE_RATINGS`, `NEUTRAL_RATING`, `TeamForm`, `accumulateForm`, `effectiveRating` (puro).
- Criar: `apps/web/lib/team-strength.test.ts`
- Modificar: `apps/web/lib/random-bet.ts` — `randomBet(homeRating, awayRating, rng?)` híbrido.
- Criar: `apps/web/lib/random-bet.test.ts`
- Criar: `apps/web/lib/team-ratings.ts` — `buildEffectiveRatings(client)` (glue de DB).
- Modificar: `apps/web/app/api/cron/check-fixtures/route.ts` — auto-fill passa forças.
- Modificar: `apps/web/app/(app)/palpites/actions.ts` — `fillRandomBets` passa forças.

Comando de teste (deste repo): `cd apps/web && node_modules/.bin/vitest run <arquivo>`

---

## Task 1: team-strength.ts (notas + forma, puro)

**Files:**
- Create: `apps/web/lib/team-strength.ts`
- Test: `apps/web/lib/team-strength.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// apps/web/lib/team-strength.test.ts
import { describe, it, expect } from "vitest";
import {
  BASE_RATINGS, NEUTRAL_RATING, accumulateForm, effectiveRating, type TeamForm,
} from "./team-strength";

describe("BASE_RATINGS", () => {
  it("cobre as 32 seleções da R32 com notas plausíveis", () => {
    const codes = ["MEX","RSA","BIH","CAN","SUI","BRA","MAR","AUS","USA","PAR","GER","CIV","ECU","NED","JPN","SWE","BEL","EGY","CPV","ESP","FRA","NOR","SEN","ARG","ALG","AUT","COL","COD","POR","CRO","GHA","ENG"];
    for (const c of codes) {
      expect(BASE_RATINGS[c], c).toBeGreaterThanOrEqual(40);
      expect(BASE_RATINGS[c], c).toBeLessThanOrEqual(100);
    }
    expect(BASE_RATINGS["FRA"]).toBeGreaterThan(BASE_RATINGS["CPV"]);
  });
});

describe("accumulateForm", () => {
  it("conta jogos/pontos/saldo e prefere ET sobre FT", () => {
    const fixtures = [
      // time 1 vence 2x0 (FT)
      { home_team_id: 1, away_team_id: 2, home_score_ft: 2, away_score_ft: 0, home_score_et: null, away_score_et: null },
      // time 1 perde no ET 1x2 (ET prevalece sobre FT 1x1)
      { home_team_id: 3, away_team_id: 1, home_score_ft: 1, away_score_ft: 1, home_score_et: 2, away_score_et: 1 },
      // ignora fixture sem placar
      { home_team_id: 1, away_team_id: 4, home_score_ft: null, away_score_ft: null, home_score_et: null, away_score_et: null },
    ];
    const m = accumulateForm(fixtures);
    expect(m.get(1)).toEqual({ games: 2, points: 3, gd: 2 + (-1) }); // +2 e -1 = +1
  });
});

describe("effectiveRating", () => {
  it("sem jogos retorna a base", () => {
    expect(effectiveRating(80, { games: 0, points: 0, gd: 0 })).toBe(80);
  });
  it("limita o delta a +6 (forma excelente)", () => {
    const f: TeamForm = { games: 3, points: 9, gd: 12 };
    expect(effectiveRating(80, f)).toBe(86);
  });
  it("limita o delta a -6 (forma péssima)", () => {
    const f: TeamForm = { games: 3, points: 0, gd: -12 };
    expect(effectiveRating(80, f)).toBe(74);
  });
  it("é monotônico: mais pontos => nota maior", () => {
    const a = effectiveRating(75, { games: 3, points: 3, gd: 0 });
    const b = effectiveRating(75, { games: 3, points: 7, gd: 0 });
    expect(b).toBeGreaterThan(a);
  });
  it("NEUTRAL_RATING é 70", () => {
    expect(NEUTRAL_RATING).toBe(70);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && node_modules/.bin/vitest run lib/team-strength.test.ts`
Expected: FAIL — `Cannot find module './team-strength'`.

- [ ] **Step 3: Implementar `team-strength.ts`**

```ts
// apps/web/lib/team-strength.ts
// Notas 0–100 por seleção classificada à R32 (pedigree de Copa + ranking FIFA).
// Ver docs/superpowers/specs/2026-06-28-aleatorio-realista-design.md §4.1.
export const BASE_RATINGS: Record<string, number> = {
  FRA: 92, BRA: 91, ARG: 91, ESP: 88, ENG: 87, GER: 86, POR: 85, NED: 84,
  BEL: 82, CRO: 80, MAR: 80, COL: 77, SUI: 76, JPN: 76, SEN: 75, NOR: 75,
  MEX: 74, AUT: 73, USA: 73, SWE: 72, ALG: 72, ECU: 72, EGY: 71, CIV: 70,
  CAN: 70, PAR: 68, GHA: 68, AUS: 68, BIH: 67, COD: 66, RSA: 65, CPV: 58,
};

// Nota neutra para qualquer seleção fora da tabela (não deve ocorrer no escopo R32+).
export const NEUTRAL_RATING = 70;

export type TeamForm = { games: number; points: number; gd: number };

type FixtureRow = {
  home_team_id: number | null;
  away_team_id: number | null;
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
};

// Acumula jogos/pontos/saldo por time a partir de fixtures pontuados.
// Mata-mata: ET prevalece sobre FT quando houve prorrogação.
export function accumulateForm(fixtures: FixtureRow[]): Map<number, TeamForm> {
  const m = new Map<number, TeamForm>();
  const get = (id: number): TeamForm => {
    let f = m.get(id);
    if (!f) { f = { games: 0, points: 0, gd: 0 }; m.set(id, f); }
    return f;
  };
  for (const fx of fixtures) {
    if (fx.home_team_id == null || fx.away_team_id == null) continue;
    const h = fx.home_score_et ?? fx.home_score_ft;
    const a = fx.away_score_et ?? fx.away_score_ft;
    if (h == null || a == null) continue;
    const H = get(fx.home_team_id);
    const A = get(fx.away_team_id);
    H.games++; A.games++;
    H.gd += h - a; A.gd += a - h;
    if (h > a) H.points += 3;
    else if (h < a) A.points += 3;
    else { H.points += 1; A.points += 1; }
  }
  return m;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

// Nota efetiva = base + ajuste de forma deste torneio, limitado a ±6.
export function effectiveRating(base: number, form: TeamForm): number {
  if (form.games <= 0) return base;
  const ppg = form.points / form.games;
  const gdpg = form.gd / form.games;
  const delta = clamp(2.0 * (ppg - 1.35) + 1.2 * gdpg, -6, 6);
  return base + delta;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web && node_modules/.bin/vitest run lib/team-strength.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/team-strength.ts apps/web/lib/team-strength.test.ts
git commit -m "feat(aleatorio): notas base das seleções + ajuste de forma (puro, testado)"
```

---

## Task 2: random-bet.ts híbrido

**Files:**
- Modify: `apps/web/lib/random-bet.ts` (reescreve a API e o sorteio; mantém `SCORELINES`/`DRAWS`)
- Test: `apps/web/lib/random-bet.test.ts`

- [ ] **Step 1: Escrever os testes que falham**

```ts
// apps/web/lib/random-bet.test.ts
import { describe, it, expect } from "vitest";
import { randomBet } from "./random-bet";

// PRNG determinístico (mulberry32) para testes estáveis.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sample(home: number, away: number, n: number) {
  const rng = mulberry32(12345);
  let homeWins = 0, awayWins = 0, draws = 0, sumWinMargin = 0, decided = 0;
  let underdogBigWin = 0; let maxGoals = 0;
  for (let i = 0; i < n; i++) {
    const r = randomBet(home, away, rng);
    maxGoals = Math.max(maxGoals, r.home, r.away);
    if (r.home === r.away) { draws++; continue; }
    decided++;
    const margin = Math.abs(r.home - r.away);
    sumWinMargin += margin;
    if (r.home > r.away) homeWins++; else awayWins++;
    // zebra (lado mais fraco) vencendo por 3+
    const weakWonBig = ((home < away && r.home > r.away) || (away < home && r.away > r.home)) && margin >= 3;
    if (weakWonBig) underdogBigWin++;
  }
  return { homeWins, awayWins, draws, n, decided, avgWinMargin: sumWinMargin / decided, underdogBigWin, maxGoals };
}

describe("randomBet híbrido", () => {
  it("favorito forte vence muito mais que a zebra", () => {
    const s = sample(90, 60, 20000);
    expect(s.homeWins / s.n).toBeGreaterThan(0.7);
    expect(s.awayWins / s.n).toBeLessThan(0.15);
  });

  it("jogo equilibrado é ~simétrico", () => {
    const s = sample(75, 75, 20000);
    const ratio = s.homeWins / Math.max(1, s.awayWins);
    expect(ratio).toBeGreaterThan(0.85);
    expect(ratio).toBeLessThan(1.15);
    expect(s.draws / s.n).toBeGreaterThan(0.2); // empate relevante em jogo parelho
  });

  it("abismo maior => margem média do favorito maior", () => {
    const pequeno = sample(80, 75, 20000).avgWinMargin;
    const grande = sample(90, 55, 20000).avgWinMargin;
    expect(grande).toBeGreaterThan(pequeno);
  });

  it("nunca gera placar absurdo (teto 5)", () => {
    const s = sample(92, 58, 20000);
    expect(s.maxGoals).toBeLessThanOrEqual(5);
  });

  it("caso reportado: França(92) x Senegal(75) — Senegal vencer por 3+ é < 1%", () => {
    const s = sample(92, 75, 20000);
    expect(s.underdogBigWin / s.n).toBeLessThan(0.01);
  });

  it("é determinístico com rng injetado", () => {
    const a = randomBet(80, 70, mulberry32(7));
    const b = randomBet(80, 70, mulberry32(7));
    expect(a).toEqual(b);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `cd apps/web && node_modules/.bin/vitest run lib/random-bet.test.ts`
Expected: FAIL — `randomBet` exige 0 args hoje (TypeScript) / asserts quebram.

- [ ] **Step 3: Reescrever `random-bet.ts`**

```ts
// apps/web/lib/random-bet.ts
// Placar aleatório realista enviesado pela força das seleções (modelo híbrido).
// Ver docs/superpowers/specs/2026-06-28-aleatorio-realista-design.md §5.

// Frequências de placar da história das Copas (1930-2022). [vencedor, perdedor, peso].
const SCORELINES: Array<[number, number, number]> = [
  [1, 0, 18], [2, 1, 14], [2, 0, 11], [3, 1, 6], [3, 0, 5], [3, 2, 4],
  [4, 1, 3], [4, 0, 2], [4, 2, 2], [5, 0, 1], [5, 1, 1],
];

// Empates: [placar dos dois lados, peso].
const DRAWS: Array<[number, number]> = [[0, 12], [1, 11], [2, 5], [3, 1]];

const S = 20;        // escala Elo (diferença de nota -> expectativa)
const DRAW_MAX = 0.30; // prob. máxima de empate (jogo equilibrado)
const K = 0.9;       // intensidade da reponderação da margem pela força

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: () => number): T {
  const total = items.reduce((acc, it) => acc + weight(it), 0);
  let r = rng() * total;
  for (const it of items) {
    r -= weight(it);
    if (r <= 0) return it;
  }
  return items[items.length - 1]!;
}

export function randomBet(
  homeRating: number,
  awayRating: number,
  rng: () => number = Math.random,
): { home: number; away: number } {
  const d = homeRating - awayRating;
  const e = 1 / (1 + Math.pow(10, -d / S)); // expectativa do mando (rótulo)
  const pDraw = DRAW_MAX * (1 - Math.abs(2 * e - 1));
  const pHome = Math.max(0, e - pDraw / 2);

  const roll = rng();
  if (roll < pDraw) {
    const [score] = weightedPick(DRAWS, (x) => x[1], rng);
    return { home: score!, away: score! };
  }

  const homeWins = roll < pDraw + pHome;
  const favoriteWon = homeWins ? d >= 0 : d <= 0;
  const g = Math.abs(d) / 100;

  const reweighted = SCORELINES.map(([hi, lo, w]): [number, number, number] => {
    const margin = hi - lo;
    const factor = favoriteWon
      ? Math.exp(K * (margin - 1) * g)   // favorito + abismo -> margens maiores
      : Math.exp(-K * (margin - 1));     // zebra vencendo -> margem comprimida
    return [hi, lo, w * factor];
  });

  const [hi, lo] = weightedPick(reweighted, (x) => x[2], rng);
  return homeWins ? { home: hi!, away: lo! } : { home: lo!, away: hi! };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `cd apps/web && node_modules/.bin/vitest run lib/random-bet.test.ts`
Expected: PASS (todos).

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/random-bet.ts apps/web/lib/random-bet.test.ts
git commit -m "feat(aleatorio): modelo híbrido de placar enviesado por força (Elo + frequências de Copa)"
```

---

## Task 3: team-ratings.ts (glue de DB)

**Files:**
- Create: `apps/web/lib/team-ratings.ts`

- [ ] **Step 1: Implementar o glue**

```ts
// apps/web/lib/team-ratings.ts
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  BASE_RATINGS, NEUTRAL_RATING, accumulateForm, effectiveRating,
} from "./team-strength";

// Monta Map<teamId, nota efetiva> = base curada + forma deste torneio.
// Aceita tanto o admin client quanto o server client (mesma API de query).
export async function buildEffectiveRatings(
  client: SupabaseClient,
): Promise<Map<number, number>> {
  const { data: teams } = await client.from("teams").select("id, fifa_code");
  const { data: fixtures } = await client
    .from("fixtures")
    .select("home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
    .not("scored_at", "is", null);

  const form = accumulateForm(fixtures ?? []);
  const ratings = new Map<number, number>();
  for (const t of (teams ?? []) as Array<{ id: number; fifa_code: string }>) {
    const base = BASE_RATINGS[t.fifa_code] ?? NEUTRAL_RATING;
    const f = form.get(t.id);
    ratings.set(t.id, f ? effectiveRating(base, f) : base);
  }
  return ratings;
}
```

- [ ] **Step 2: Verificar build de tipos**

Run: `pnpm --filter @bolao/web build`
Expected: `✓ Compiled successfully`. (`SupabaseClient` resolve de `@supabase/supabase-js`, já dependência do projeto.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/team-ratings.ts
git commit -m "feat(aleatorio): builder de notas efetivas a partir do banco"
```

---

## Task 4: Wire no auto-fill do cron

**Files:**
- Modify: `apps/web/app/api/cron/check-fixtures/route.ts` (função `autoFillExpiredPhases`, ~linha 113-158)

- [ ] **Step 1: Importar o builder**

Adicionar ao topo, junto dos outros imports:

```ts
import { buildEffectiveRatings } from "@/lib/team-ratings";
import { NEUTRAL_RATING } from "@/lib/team-strength";
```

- [ ] **Step 2: Montar o mapa uma vez e passar as forças**

Em `autoFillExpiredPhases`, trocar a seleção de fixtures (que hoje pega só `id`) e o uso de `randomBet()`.

Localizar:

```ts
  for (const phase of expired) {
    const { data: fixtures } = await admin
      .from("fixtures")
      .select("id")
      .eq("phase_id", phase.id)
      .not("home_team_id", "is", null)
      .not("away_team_id", "is", null);
    if (!fixtures || fixtures.length === 0) continue;
```

Substituir por (adiciona os team ids ao select):

```ts
  const ratings = await buildEffectiveRatings(admin);

  for (const phase of expired) {
    const { data: fixtures } = await admin
      .from("fixtures")
      .select("id, home_team_id, away_team_id")
      .eq("phase_id", phase.id)
      .not("home_team_id", "is", null)
      .not("away_team_id", "is", null);
    if (!fixtures || fixtures.length === 0) continue;
```

Localizar o uso do `randomBet`:

```ts
        if (taken.has(`${u.id}|${f.id}`)) continue;
        const r = randomBet();
        toInsert.push({
```

Substituir por:

```ts
        if (taken.has(`${u.id}|${f.id}`)) continue;
        const r = randomBet(
          ratings.get(f.home_team_id!) ?? NEUTRAL_RATING,
          ratings.get(f.away_team_id!) ?? NEUTRAL_RATING,
        );
        toInsert.push({
```

- [ ] **Step 3: Verificar build**

Run: `pnpm --filter @bolao/web build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/cron/check-fixtures/route.ts
git commit -m "feat(aleatorio): auto-fill do cron usa força das seleções"
```

---

## Task 5: Wire no botão do usuário

**Files:**
- Modify: `apps/web/app/(app)/palpites/actions.ts` (função `fillRandomBets`, ~linha 35-78)

- [ ] **Step 1: Importar o builder**

Trocar o import existente do `randomBet` por:

```ts
import { randomBet } from "@/lib/random-bet";
import { buildEffectiveRatings } from "@/lib/team-ratings";
import { NEUTRAL_RATING } from "@/lib/team-strength";
```

- [ ] **Step 2: Passar os team ids no select e as forças no sorteio**

Localizar:

```ts
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id")
    .eq("phase_id", openPhase.id)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null);
```

Substituir por:

```ts
  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id")
    .eq("phase_id", openPhase.id)
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null);

  const ratings = await buildEffectiveRatings(supabase);
```

Localizar:

```ts
    .map(f => {
      const r = randomBet();
      return {
```

Substituir por:

```ts
    .map(f => {
      const r = randomBet(
        ratings.get(f.home_team_id!) ?? NEUTRAL_RATING,
        ratings.get(f.away_team_id!) ?? NEUTRAL_RATING,
      );
      return {
```

- [ ] **Step 3: Verificar build**

Run: `pnpm --filter @bolao/web build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 4: Commit**

```bash
git add "apps/web/app/(app)/palpites/actions.ts"
git commit -m "feat(aleatorio): botão preencher aleatório usa força das seleções"
```

---

## Task 6: Verificação final

- [ ] **Step 1: Rodar toda a suíte de testes do web**

Run: `cd apps/web && node_modules/.bin/vitest run`
Expected: PASS — inclui `team-strength.test.ts`, `random-bet.test.ts` e os testes já existentes (`advance-phase.test.ts`).

- [ ] **Step 2: Build limpo**

Run: `pnpm --filter @bolao/web build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 3: Sanidade de distribuição (amostra real)**

Rodar um script ad-hoc (scratchpad) que importa `randomBet` e imprime ~10 amostras de França(92)×Senegal(75) e Brasil(91)×Curaçao→não classificou; usar Brasil(91)×Cabo Verde(58). Conferir visualmente que: França/Brasil ganham na maioria, margens plausíveis, zebra rara e magra.

Run (exemplo):
```bash
cd apps/web && node_modules/.bin/vitest run lib/random-bet.test.ts --reporter=verbose
```
Expected: asserts estatísticos confirmam o comportamento (substitui inspeção manual).

- [ ] **Step 4: Commit final (se houver ajuste) e fim**

Sem mudanças pendentes → nada a commitar. Plano concluído.

---

## Notas de execução

- **Escopo**: só R32+. Não re-sortear palpites de grupo já existentes.
- **Sem fator casa**: `casa`/`fora` são rótulos; modelo simétrico em força igual.
- **Deploy**: após merge na `main`, a Vercel publica. O auto-fill da R32 roda às 15:50 BRT — garantir merge antes disso.
