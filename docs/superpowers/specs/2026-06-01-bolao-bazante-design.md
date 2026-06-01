# Bolão da Família Bazante 2026 — Design

**Data:** 2026-06-01
**Autor:** Gabriel Bazante (com brainstorming Claude)
**Status:** aprovado para implementação

## 1. Visão geral

App web PWA mobile-first (95% acesso por celular) para um bolão de Copa do Mundo 2026 entre família e amigos. Cada participante palpita placares de todos os jogos da Copa, organizado por fase, e ganha pontos conforme a tabela de pontuação variável por fase. Prêmio = R$ 10 por participante confirmado, mostrado ao vivo no app. Vencedor leva tudo (com critério de desempate em cascata).

**Diferenciais:**
- Palpites por fase (não por jogo) — abre quando a fase anterior termina, com o bracket já preenchido
- Aba "Ao Vivo" mostra palpites de todos enquanto o jogo rola (única exceção à privacidade)
- Prêmio cresce visivelmente na home a cada novo participante aprovado
- Bônus de 50 pontos por seleção campeã cravada (até 2 picks por participante)

## 2. Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript | Stack já usada em [bazatravel-offers](../../../../bazatravel-offers) |
| UI | Tailwind + shadcn/ui | Produtividade, customizável |
| Auth + DB + Realtime | Supabase | Solicitado pelo usuário; Postgres + RLS + Auth + Realtime em uma plataforma |
| Hospedagem | Vercel | Stack atual do usuário; cron nativo |
| Dados oficiais | [API-Football](https://www.api-football.com/) free tier (100 req/dia) | Inclui `extratime` e `penalty` separados, atualiza a cada 15s ao vivo |
| Backup de fixtures | [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) | JSON estático grátis, sem chave |
| Polling | Vercel Cron (15 em 15 min nas janelas de jogo) | Sem servidor dedicado |
| PWA | next-pwa + Web Push API | Instalável no iOS/Android, push nativo |

**Custo estimado:** R$ 0/mês durante a Copa (Vercel Hobby + Supabase Free + API-Football Free cabem no uso).

## 3. Identidade visual

- **Tema light:** "FIFA Oficial" — verde (#006633) + azul (#003d7a) + dourado (#ffd700). Vibe torneio elegante.
- **Tema dark:** "Sport Dark" — preto (#0a0e1a) + neon verde (#00ff88). Vibe app moderno de jogo.
- Usuário escolhe manualmente ou segue preferência do sistema.
- Tipografia: stack nativa (`-apple-system, BlinkMacSystemFont, sans-serif`) — performática.

## 4. Modelo de dados

### 4.1 Tabelas

```sql
profiles (
  id           uuid PK references auth.users,
  full_name    text not null,
  sex          text check (sex in ('M','F','O')),
  birth_date   date not null,
  email        text not null,
  avatar_url   text,                  -- bucket "avatars" no Storage
  is_admin     boolean default false,
  approved_at  timestamptz,           -- null = aguardando aprovação
  created_at   timestamptz default now()
);

teams (
  id           int PK,
  fifa_code    text unique,           -- 'BRA','ARG'
  name_pt      text,
  flag_emoji   text,
  group_code   text                   -- 'A'..'L'
);

phases (
  id            int PK,
  code          text unique,          -- 'group','r32','r16','qf','sf','third','final'
  name          text,
  order_idx     int,
  points_result int,                  -- 1,2,3,7,15,13,25
  points_exact  int,                  -- 2,4,6,14,30,26,50
  opens_at      timestamptz,
  closes_at     timestamptz,          -- 5 min antes do 1º jogo da fase
  status        text                  -- 'locked','open','closed','scored'
);

fixtures (
  id              int PK,
  phase_id        int FK,
  api_fixture_id  bigint unique,
  kickoff_at      timestamptz,
  home_team_id    int FK teams,       -- null em mata-mata até a fase anterior fechar
  away_team_id    int FK teams,
  status          text,               -- 'scheduled','live','finished'
  home_score_ft   int,                -- 90 min
  away_score_ft   int,
  home_score_et   int,                -- 120 min (null se não houve)
  away_score_et   int,
  scored_at       timestamptz         -- preenchido pelo cron quando aplica pontos
);

bets (
  id          uuid PK,
  user_id     uuid FK profiles,
  fixture_id  int FK fixtures,
  home_score  int not null,
  away_score  int not null,
  points      int default 0,
  scored_at   timestamptz,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, fixture_id)
);

champion_picks (
  id         uuid PK,
  user_id    uuid FK,
  team_id    int FK,
  points     int default 0,
  scored_at  timestamptz,
  unique (user_id, team_id)
);

cron_runs (
  id           bigserial PK,
  ran_at       timestamptz default now(),
  fixtures_checked int,
  fixtures_scored  int,
  errors           jsonb
);

settings (                            -- singleton (id=1)
  id            int PK default 1,
  entry_fee_cents int default 1000,   -- R$ 10
  pix_key       text default '1264d57d-4a54-4479-8012-25f7bddc3853',
  pool_name     text default 'Bolão da Família Bazante 2026'
);
```

### 4.2 View de ranking

```sql
CREATE VIEW ranking AS
  SELECT
    p.id,
    p.full_name,
    p.avatar_url,
    coalesce(sum(b.points), 0) + coalesce(sum(cp.points), 0) AS total_points,
    count(*) FILTER (WHERE b.points = ph.points_exact AND b.points > 0) AS exact_count,
    count(*) FILTER (WHERE b.points > 0) AS hit_count,
    bool_or(cp.points > 0) AS hit_champion
  FROM profiles p
  LEFT JOIN bets b ON b.user_id = p.id
  LEFT JOIN fixtures f ON b.fixture_id = f.id
  LEFT JOIN phases ph ON f.phase_id = ph.id
  LEFT JOIN champion_picks cp ON cp.user_id = p.id
  WHERE p.approved_at IS NOT NULL
  GROUP BY p.id, p.full_name, p.avatar_url
  ORDER BY total_points DESC, hit_champion DESC, exact_count DESC, hit_count DESC;
```

Critério de desempate embutido no `ORDER BY`: pontos → cravou campeão → mais exatos → mais acertos. Persistindo empate após tudo isso, o prêmio é dividido (cálculo feito no frontend exibindo a lista de empatados).

### 4.3 Storage

Bucket `avatars` no Supabase Storage. Política: usuário só pode escrever/sobrescrever objeto cujo nome é `{user_id}.jpg`. Leitura pública. Fallback: iniciais coloridas geradas a partir do `full_name` quando `avatar_url` é null.

### 4.4 RLS (Row-Level Security)

| Tabela | SELECT | INSERT/UPDATE |
|---|---|---|
| `profiles` | próprio + admin lê todos | próprio (campos limitados) + admin |
| `bets` | dono **sempre**; outros só se `fixtures.status='live'` daquele fixture | dono, **só se** `phases.status='open'` daquela fase |
| `champion_picks` | dono sempre; admin | dono, **só antes** de phases.code='group' travar |
| `fixtures` | qualquer autenticado | só admin (override manual) + service_role (cron) |
| `phases` | qualquer autenticado | só admin + service_role |
| `cron_runs` | só admin | só service_role |
| `settings` | qualquer autenticado | só admin |
| view `ranking` | qualquer autenticado | — |

## 5. Arquitetura

```
┌────────────────────────────────────────────────────────────────┐
│  CLIENTE (PWA Next.js — mobile-first)                          │
│  Telas: Login, Cadastro, Aguardando aprovação, Home,           │
│         Palpites, Ranking, Ao Vivo, Perfil, Admin              │
└──────────────────────────┬─────────────────────────────────────┘
                           │ Supabase JS SDK (HTTPS + WSS)
                           ▼
┌────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                       │
│  ─ Auth (email + senha)                                        │
│  ─ Postgres + RLS                                              │
│  ─ Storage (bucket "avatars")                                  │
│  ─ Realtime channel para ranking                               │
└──────────────────────▲─────────────────────────────────────────┘
                       │ service_role key
                       │
┌──────────────────────┴─────────────────────────────────────────┐
│  VERCEL CRON                                                    │
│  ─ POST /api/cron/check-fixtures  (15/15 min em janela de jogo)│
│  ─ POST /api/cron/advance-phase   (após cada jogo finalizado)  │
└──────────────────────┬─────────────────────────────────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ API-Football    │
              │ league=1        │
              │ season=2026     │
              └─────────────────┘
```

### 5.1 Componentes isolados (cada um com contrato claro)

- **`packages/scoring`** — lib pura, sem I/O. `calculate(bet, fixture, phase) → points`. 100% testável; coração do bolão.
- **`packages/wc-api`** — wrapper da API-Football. Normaliza score (extratime aplicado em mata-mata, pênaltis ignorados).
- **`apps/web`** — Next.js App Router. UI, auth, server actions, server components com RLS.
- **Route handler `/api/cron/check-fixtures`** — chamado pelo Vercel Cron com header `CRON_SECRET`. Lê fixtures não-finalizados próximos, consulta API-Football, atualiza, dispara scoring.
- **Route handler `/api/cron/advance-phase`** — verifica se fase atual tem todos os jogos finalizados; se sim, popula fixtures da próxima fase (lê standings da API-Football), abre janela de palpites, notifica.

## 6. Lógica de pontuação (lib `scoring`)

```ts
export type Bet = { home: number; away: number };
export type Result = {
  home_ft: number; away_ft: number;
  home_et?: number; away_et?: number;
};
export type Phase = 'group'|'r32'|'r16'|'qf'|'sf'|'third'|'final';

const POINTS: Record<Phase, { result: number; exact: number }> = {
  group:  { result: 1,  exact: 2  },
  r32:    { result: 2,  exact: 4  },
  r16:    { result: 3,  exact: 6  },
  qf:     { result: 7,  exact: 14 },
  sf:     { result: 15, exact: 30 },
  third:  { result: 13, exact: 26 },
  final:  { result: 25, exact: 50 },
};

export function calculate(bet: Bet, result: Result, phase: Phase): number {
  const isKnockout = phase !== 'group';
  // Mata-mata: usa ET se houve, senão FT. Pênaltis SEMPRE ignorados.
  const finalHome = isKnockout && result.home_et != null ? result.home_et : result.home_ft;
  const finalAway = isKnockout && result.away_et != null ? result.away_et : result.away_ft;

  const { result: ptsResult, exact: ptsExact } = POINTS[phase];

  if (bet.home === finalHome && bet.away === finalAway) return ptsExact;

  const sameWinner =
    (bet.home > bet.away && finalHome > finalAway) ||
    (bet.home < bet.away && finalHome < finalAway) ||
    (bet.home === bet.away && finalHome === finalAway);

  return sameWinner ? ptsResult : 0;
}

// bonus campeão: aplicado pelo job advance-phase quando o campeão real é decidido
export function championBonus(picks: number[], championTeamId: number): number {
  return picks.includes(championTeamId) ? 50 : 0;
}
```

## 7. Fluxos principais

### 7.1 Cadastro → Aprovação → Primeiro acesso

1. Usuário preenche: nome completo, sexo, e-mail, data de nascimento, senha, avatar (opcional).
2. Supabase Auth cria registro; linha em `profiles` é criada com `approved_at = null`.
3. Tela "Aguardando aprovação" mostra:
   - Chave Pix `1264d57d-4a54-4479-8012-25f7bddc3853` com botão "Copiar"
   - QR Code gerado on-the-fly da chave
   - Valor: R$ 10
   - Total atual de participantes confirmados
4. Admin abre `/admin` → lista de pendentes → Aprovar/Rejeitar.
5. Ao aprovar: `approved_at = now()`, e-mail "Você está dentro!", push se PWA instalado, prêmio na home anima +R$ 10.
6. Primeiro login do aprovado: onboarding em 2 passos: escolhe 2 campeões + palpita fase de grupos.

### 7.2 Palpite da fase

- Tela mostra todos os jogos da fase atual (`phases.status='open'`).
- Auto-save a cada mudança (debounce 800ms).
- Barra de progresso "X/Y palpites preenchidos" (não obriga preencher todos).
- Edição livre até `phases.closes_at`.
- Contador regressivo até o lock.

### 7.3 Scoring automático

Cron a cada 15 min em datas de jogo (configurável em `vercel.json`):

```
POST /api/cron/check-fixtures
  Header: x-cron-secret: $CRON_SECRET
  Body: {}
```

1. Lê `fixtures` onde `status != 'finished'` e `kickoff_at < now() + 2h`.
2. Pra cada uma → `GET api-football /fixtures?id=…`.
3. Se response indica `status=FT`:
   - Atualiza colunas de placar.
   - `UPDATE bets SET points = scoring.calculate(...) WHERE fixture_id = X AND points IS NULL`.
   - Marca `fixtures.scored_at = now()`, `fixtures.status = 'finished'`.
4. Postgres NOTIFY `ranking_changed` → Realtime push pros clientes.
5. Grava linha em `cron_runs` com contadores.

### 7.4 Abertura de fase seguinte

Após cada execução do cron, se todos os fixtures da fase atual têm `scored_at`:
1. Chama `/api/cron/advance-phase`.
2. Lê `standings` da API-Football → determina classificados.
3. Aplica regra de chaveamento da fase seguinte para preencher `home_team_id`/`away_team_id` dos fixtures da próxima fase (que já existem em branco no seed). O mapeamento de cada chave (ex: R32 = 1A×3B/3C/3D/3E, 1C×3D/3E/3F, etc.) é definido como tabela estática `bracket_rules` no banco — segue o regulamento oficial FIFA 2026 (48 times, 12 grupos, 2 primeiros + 8 melhores 3ºs → R32).
4. `phases.next.status = 'open'`, `opens_at = now()`, `closes_at = primeiro_kickoff - 5min`.
5. Marca fase atual como `closed`.
6. Envia e-mail + push pra todos os aprovados.

Quando todos os jogos da final tiverem `scored_at`:
1. Determina campeão (vencedor da final, considerando ET).
2. Pra cada `champion_picks`: `points = 50 if team_id == champion else 0`.
3. Realtime atualiza ranking final.

### 7.5 Aba "Ao Vivo"

- Aparece destacada no header **só** quando existe `fixtures.status='live'`.
- Lista todos os jogos rolando, cada um em um card próprio:
  - Header vermelho com bandeiras, placar atual (vindo da API a cada 30s), minuto.
  - Lista de palpites de todos os participantes (RLS libera leitura porque `status='live'`).
  - Cores: verde (palpite com mesmo vencedor que placar atual), amarelo (perto), vermelho (perdendo).
- Quando todos os jogos da janela viram `finished`, aba some.

### 7.6 Admin

- `/admin` (só `is_admin=true`).
- Pendentes: aprovar/rejeitar com 1 clique.
- Fixtures: ver todos, editar resultado manualmente → recalcula `bets` daquele jogo via mesma lib `scoring`.
- Painel de saúde: última execução do cron, próximos jogos, total de participantes confirmados, erros recentes.

## 8. Tela inicial — Prêmio

Hero card grande na Home:

```
🏆 PRÊMIO ATUAL
   R$ 150
   (15 participantes confirmados)
```

Cálculo: `count(profiles WHERE approved_at IS NOT NULL) * settings.entry_fee_cents / 100`. Animação de incremento (`+R$ 10`) quando o número muda em tempo real (Realtime).

## 9. Notificações

Eventos disparados:

| Evento | E-mail | Push |
|---|:-:|:-:|
| Cadastro aprovado | ✓ | — |
| Nova fase aberta pra palpitar | ✓ | ✓ |
| Deadline em 24h (se ainda tem jogo sem palpite) | ✓ | ✓ |
| Resumo diário do ranking (só em dia que rolou jogo) | ✓ | — |

Sem push por jogo individual finalizado, evitando spam quando há 3 jogos no mesmo dia. Ranking ao vivo cobre o "fui ultrapassado".

- **E-mail**: via Supabase (transactional templates).
- **Push web (PWA)**: Web Push API com VAPID keys; salva subscription em `profiles.push_subscription jsonb`.

## 10. Testes

### 10.1 Lib `scoring` (TDD obrigatório)

- 7 fases × 3 cenários (exato, resultado, erro) = **21 casos base**.
- Mata-mata com ET decidindo: `result.home_ft=1, away_ft=1, home_et=2, away_et=1` + palpite `2-1` → pontos exatos da fase; palpite `1-1` → 0.
- Mata-mata empate no ET (pênaltis decidem): `home_ft=1, away_ft=1, home_et=1, away_et=1` + palpite `1-1` → exatos; palpite com qualquer placar diferente, mesmo do vencedor real nos pênaltis → 0.
- Edge cases: `0-0` exato, palpite invertido (2-3 vs 3-2 → 0).
- `championBonus`: pick acertado → 50; errado → 0; ambos picks acertados (improvável mas testar) → 100.

### 10.2 Integração

- E2E mínimo (Playwright): cadastro → login → palpitar 1 jogo → admin aprova → admin força resultado → ponto aparece no ranking.
- Mock da API-Football com fixtures de teste.

### 10.3 RLS

- Tentar `SELECT` em `bets` de outro usuário com fixture `scheduled` → vazio.
- Tentar `SELECT` em `bets` de outro usuário com fixture `live` → retorna.
- Tentar `INSERT` em `bets` quando `phases.status='closed'` → erro.

## 11. Segurança

- Senha mínima 8 chars (validação Supabase Auth).
- `CRON_SECRET` em env, validado no header dos route handlers de cron.
- `SUPABASE_SERVICE_ROLE_KEY` só em variáveis server-side (Vercel env).
- Service role usada exclusivamente nos cron handlers.
- API-Football key em env (`API_FOOTBALL_KEY`).
- Sem dados sensíveis no `bets` (placares são públicos uma vez expostos).
- Avatar uploads passam por validação de content-type e tamanho máx 2MB.

## 12. Resiliência

- API-Football down: retry 3× com backoff exponencial; depois e-mail pro admin.
- Score absurdo (diff > 10 gols): flag pra revisão admin antes de gravar pontos.
- Override manual sempre disponível pelo admin (recalcula bets afetados).
- `cron_runs` persiste histórico pra debug/auditoria.
- Backup do banco: Supabase Free não tem PITR; admin roda `pg_dump` semanal manual (script `scripts/backup.sh`). Avaliar upgrade pra Pro (US$ 25/mês) só se a base crescer.

## 13. Critério de aceitação ("pronto")

1. Cadastro funciona; admin aprova; usuário vê home com prêmio crescendo.
2. Usuário escolhe 2 campeões e palpita os 72 jogos da fase de grupos antes do lock.
3. Cron pega o resultado real do 1º jogo em até 15 min após o apito final.
4. Ranking atualiza em tempo real sem refresh manual.
5. "Ao Vivo" mostra todos os jogos rolando com palpites de todos; some quando termina.
6. PWA instala em iOS e Android; recebe push de abertura de fase.
7. UI funciona perfeito em iPhone SE (375px) e iPad (768px).
8. Cobertura ≥ 95% na lib `scoring`.

## 14. Decisões abertas (a resolver na implementação)

Nenhuma — todas as decisões foram travadas no brainstorm. Se algo surgir, escalar pro Gabriel antes de implementar.

## 15. Referências

- [API-Football docs](https://www.api-football.com/documentation-v3)
- [API-Football WC 2026 guide](https://www.api-football.com/news/post/fifa-world-cup-2026-guide-to-using-data-with-api-sports)
- [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) (fallback de fixtures)
- [Supabase RLS docs](https://supabase.com/docs/guides/auth/row-level-security)
- [Vercel Cron docs](https://vercel.com/docs/cron-jobs)
- [next-pwa](https://github.com/shadowwalker/next-pwa)
