# Bolão da Família Bazante 2026

PWA pra bolão de Copa do Mundo. Next.js + Supabase + Vercel.

## Dev

```bash
pnpm install
pnpm --filter @bolao/web build       # workspace packages need to be built first
cd apps/web && node_modules/.bin/next dev
```

(Direct `next dev` avoids a pnpm workspace resolution glitch; investigation pending.)

## Estrutura

- `apps/web` — Next.js app (UI + API routes + cron)
- `packages/scoring` — pura, regra de pontuação (TDD, 22 testes)
- `packages/wc-api` — wrapper API-Football (legacy; no longer used by web app)
- `supabase/migrations/` — schema migrations (0001..0008)
- `supabase/seed/` — 48 seleções + 104 jogos da Copa 2026
- `docs/superpowers/{specs,plans}/` — design + plano de implementação

## Deploy

1. Link projeto Supabase: `pnpm dlx supabase link --project-ref <ref>`
2. Aplicar migrations: `pnpm dlx supabase db push`
3. Subir seed (uma vez): `pnpm --filter @bolao/seed run`
4. Deploy Vercel: `pnpm dlx vercel deploy --prod`
5. Configurar env vars no Vercel (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_SUBJECT)
6. Após primeiro signup, promover-se a admin via SQL:
   ```sql
   update public.profiles set is_admin = true, approved_at = now()
   where email = 'gabrielbazante7@gmail.com';
   ```
7. Antes da Copa começar, abrir fase de grupos: `update public.phases set status='open', opens_at=now(), closes_at='2026-06-11T19:55:00Z' where code='group';`

## Backup

```bash
SUPABASE_DB_URL=postgresql://... bash scripts/backup.sh
```
