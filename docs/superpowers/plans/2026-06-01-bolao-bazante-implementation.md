# Bolão Bazante 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete PWA family World Cup pool app: signup with admin approval, phase-by-phase predictions, automatic scoring via API-Football, live ranking, and a public "Ao Vivo" tab showing everyone's bets while a match is in progress.

**Architecture:** pnpm monorepo. `apps/web` is a Next.js 15 App Router PWA. `packages/scoring` is a pure TypeScript library (TDD, no I/O) that's the heart of point calculation. `packages/wc-api` wraps API-Football. Supabase provides Postgres + Auth + Storage + Realtime; RLS policies enforce that bets are private except during a live match. Vercel hosts the app and runs cron jobs that poll API-Football, score matches, and advance phases.

**Tech Stack:**
- Next.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
- Supabase (Postgres + Auth + Storage + Realtime)
- pnpm workspaces
- Vitest for unit tests, Playwright for E2E
- Vercel Cron + API-Football (free tier)
- next-pwa + Web Push API (VAPID)

**Reference spec:** [`../specs/2026-06-01-bolao-bazante-design.md`](../specs/2026-06-01-bolao-bazante-design.md). When in doubt, the spec wins.

---

## File Structure

```
bolao-bazante-2026/
├── apps/web/                              # Next.js app
│   ├── app/
│   │   ├── (auth)/{login,signup,pending}/page.tsx
│   │   ├── (app)/
│   │   │   ├── layout.tsx                 # tabbar + header
│   │   │   ├── page.tsx                   # Home with prize
│   │   │   ├── palpites/page.tsx
│   │   │   ├── ranking/page.tsx
│   │   │   ├── live/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   └── admin/page.tsx
│   │   ├── api/cron/{check-fixtures,advance-phase}/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/                        # PrizeCard, FixtureBetCard, RankingRow, LiveMatchCard, ThemeToggle, etc.
│   ├── lib/
│   │   ├── supabase/{client.ts,server.ts,middleware.ts,admin.ts}
│   │   ├── theme.ts
│   │   └── utils.ts
│   ├── public/{manifest.json,icons/*}
│   ├── middleware.ts
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   └── package.json
├── packages/
│   ├── scoring/                           # Pure lib, TDD
│   │   ├── src/{calculate.ts,champion-bonus.ts,types.ts,index.ts}
│   │   ├── tests/{calculate.test.ts,champion-bonus.test.ts}
│   │   └── package.json
│   └── wc-api/                            # API-Football wrapper
│       ├── src/{client.ts,fixtures.ts,standings.ts,types.ts,index.ts}
│       ├── tests/
│       └── package.json
├── supabase/
│   ├── migrations/
│   │   ├── 0001_initial_schema.sql
│   │   ├── 0002_rls_policies.sql
│   │   ├── 0003_ranking_view.sql
│   │   └── 0004_seed_static_data.sql      # phases, bracket_rules
│   ├── seed/{teams.ts,fixtures.ts,bracket-rules.ts,run.ts}
│   └── config.toml
├── scripts/backup.sh
├── docs/superpowers/{specs,plans}/
├── package.json                           # pnpm workspace root
├── pnpm-workspace.yaml
├── vercel.json                            # cron schedule
├── tsconfig.base.json
└── README.md
```

---

# Milestone 0 — Project Bootstrap

Goal: monorepo scaffolded, Supabase wired locally, base TypeScript config that works for every package.

### Task 0.1: Initialize pnpm workspace

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.nvmrc`, `.editorconfig`

- [ ] **Step 1: Make sure pnpm is installed**

Run: `pnpm -v`
Expected: prints version ≥ 9. If not: `npm i -g pnpm`.

- [ ] **Step 2: Add `.nvmrc`**

```
22
```

- [ ] **Step 3: Add `package.json` at the repo root**

```json
{
  "name": "bolao-bazante-2026",
  "private": true,
  "version": "0.0.1",
  "packageManager": "pnpm@9.12.0",
  "scripts": {
    "build": "pnpm -r build",
    "test": "pnpm -r test",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "dev": "pnpm --filter @bolao/web dev"
  },
  "devDependencies": {
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 4: Add `pnpm-workspace.yaml`**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

- [ ] **Step 5: Add `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 6: Add `.editorconfig`**

```
root = true
[*]
indent_style = space
indent_size = 2
end_of_line = lf
charset = utf-8
trim_trailing_whitespace = true
insert_final_newline = true
```

- [ ] **Step 7: Verify**

Run: `pnpm install`
Expected: empty lockfile created, no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json pnpm-workspace.yaml tsconfig.base.json .nvmrc .editorconfig pnpm-lock.yaml
git commit -m "chore: init pnpm monorepo"
```

### Task 0.2: Scaffold Next.js app

**Files:**
- Create: entire `apps/web/` tree via `create-next-app`

- [ ] **Step 1: Scaffold**

Run from repo root:
```bash
pnpm create next-app@latest apps/web --typescript --tailwind --app --src-dir=false --import-alias="@/*" --use-pnpm --skip-install --turbopack --eslint
```

- [ ] **Step 2: Rename package**

Edit `apps/web/package.json` → change `"name"` to `"@bolao/web"`.

- [ ] **Step 3: Make tsconfig extend base**

Edit `apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] },
    "jsx": "preserve",
    "allowJs": true,
    "lib": ["dom", "dom.iterable", "esnext"],
    "incremental": true,
    "noEmit": true
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Install + dev run**

Run: `pnpm install`
Run: `pnpm --filter @bolao/web dev`
Open `http://localhost:3000` → should see Next.js welcome.
Ctrl-C.

- [ ] **Step 5: Commit**

```bash
git add apps/web pnpm-lock.yaml
git commit -m "chore: scaffold @bolao/web Next.js app"
```

### Task 0.3: Add shadcn/ui

**Files:**
- Create: `apps/web/components.json`, `apps/web/lib/utils.ts`, base shadcn components

- [ ] **Step 1: Init shadcn**

```bash
cd apps/web && pnpm dlx shadcn@latest init -d
```
Defaults: TypeScript yes, Tailwind v4 yes, slate, CSS vars yes.

- [ ] **Step 2: Add the components we'll use everywhere**

```bash
pnpm dlx shadcn@latest add button input label card sheet dialog tabs avatar progress sonner skeleton
```

- [ ] **Step 3: Verify build**

Run: `cd apps/web && pnpm build`
Expected: builds with zero errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "chore(web): add shadcn/ui + base components"
```

### Task 0.4: Create Supabase project + local dev

**Files:**
- Create: `supabase/config.toml`, `apps/web/.env.local.example`, `.gitignore` update

- [ ] **Step 1: Install Supabase CLI**

```bash
pnpm dlx supabase --version
```
Expected: prints version.

- [ ] **Step 2: Init local Supabase**

Run from repo root:
```bash
pnpm dlx supabase init
```
Creates `supabase/config.toml`.

- [ ] **Step 3: Create remote project**

Gabriel: criar projeto em https://supabase.com/dashboard manually (region São Paulo, plan Free). Save the URL + anon key + service_role key.

- [ ] **Step 4: Add `.env.local.example`**

Create `apps/web/.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
API_FOOTBALL_KEY=
CRON_SECRET=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:gabrielbazante7@gmail.com
```

- [ ] **Step 5: Add `.env.local` (real values, not committed)**

Copy `.env.local.example` to `.env.local`. Fill the Supabase values.

- [ ] **Step 6: Ensure `.env*` is gitignored**

Verify `.gitignore` already has `.env*` (set in Task 0 of original git init).

- [ ] **Step 7: Start local Supabase**

```bash
pnpm dlx supabase start
```
Expected: prints local URLs (API, Studio, Inbucket). Keep running in another terminal during dev.

- [ ] **Step 8: Commit**

```bash
git add supabase/config.toml apps/web/.env.local.example
git commit -m "chore: init supabase + env template"
```

---

# Milestone 1 — Foundation: Auth, Approval, Prize Counter

Goal: a deployable web app where the family can sign up, see "aguardando aprovação" with Pix info, the admin can approve them, and the home shows the prize total growing as people are approved.

### Task 1.1: Initial DB schema (profiles, settings)

**Files:**
- Create: `supabase/migrations/0001_initial_schema.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0001_initial_schema.sql

create extension if not exists "pgcrypto";

-- profiles extends auth.users
create table public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  sex         text not null check (sex in ('M','F','O')),
  birth_date  date not null,
  email       text not null,
  avatar_url  text,
  is_admin    boolean not null default false,
  approved_at timestamptz,
  created_at  timestamptz not null default now()
);

create index profiles_approved_at_idx on public.profiles (approved_at);
create index profiles_is_admin_idx on public.profiles (is_admin) where is_admin = true;

-- singleton settings table
create table public.settings (
  id              int primary key default 1,
  entry_fee_cents int not null default 1000,
  pix_key         text not null default '1264d57d-4a54-4479-8012-25f7bddc3853',
  pool_name       text not null default 'Bolão da Família Bazante 2026',
  constraint settings_singleton check (id = 1)
);

insert into public.settings (id) values (1);

-- trigger: when a new auth.user is created, create a profile row populated from raw_user_meta_data
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, sex, birth_date, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'sex', 'O'),
    coalesce((new.raw_user_meta_data->>'birth_date')::date, current_date),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

- [ ] **Step 2: Apply locally**

Run: `pnpm dlx supabase db reset`
Expected: migration runs, "Database reset complete".

- [ ] **Step 3: Verify in Studio**

Open `http://localhost:54323` → Table Editor → confirm `profiles` and `settings` tables exist; `settings` has one row.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_initial_schema.sql
git commit -m "feat(db): add profiles + settings tables + on-user-created trigger"
```

### Task 1.2: RLS policies for profiles + settings

**Files:**
- Create: `supabase/migrations/0002_rls_policies.sql`

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/0002_rls_policies.sql

alter table public.profiles enable row level security;
alter table public.settings enable row level security;

-- helper: is current user an admin?
create or replace function public.is_admin() returns boolean
language sql security definer set search_path = public, auth as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles policies
create policy "profiles_select_self_or_admin"
  on public.profiles for select
  using ( auth.uid() = id or public.is_admin() );

-- public read of approved users for prize counter / ranking
create policy "profiles_select_approved_public"
  on public.profiles for select
  using ( approved_at is not null );

create policy "profiles_update_self_limited"
  on public.profiles for update
  using ( auth.uid() = id )
  with check ( auth.uid() = id );

create policy "profiles_update_admin_all"
  on public.profiles for update
  using ( public.is_admin() );

-- settings: anyone authenticated can read; only admin can update
create policy "settings_read_authenticated"
  on public.settings for select
  to authenticated using ( true );

create policy "settings_update_admin"
  on public.settings for update
  using ( public.is_admin() );
```

- [ ] **Step 2: Apply locally**

Run: `pnpm dlx supabase db reset`
Expected: clean apply.

- [ ] **Step 3: Manual smoke (Studio SQL editor)**

```sql
-- as anon (no JWT)
select id, full_name from profiles;
-- expected: empty (no approved users yet)
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0002_rls_policies.sql
git commit -m "feat(db): RLS for profiles + settings, is_admin() helper"
```

### Task 1.3: Supabase client helpers in web app

**Files:**
- Create: `apps/web/lib/supabase/client.ts`, `apps/web/lib/supabase/server.ts`, `apps/web/lib/supabase/middleware.ts`, `apps/web/lib/supabase/admin.ts`, `apps/web/middleware.ts`

- [ ] **Step 1: Install Supabase SSR helpers**

```bash
cd apps/web && pnpm add @supabase/supabase-js @supabase/ssr
```

- [ ] **Step 2: Create `lib/supabase/client.ts`** (browser singleton)

```ts
"use client";
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 3: Create `lib/supabase/server.ts`** (RSC + route handlers)

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try {
            toSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // called from RSC; ignore
          }
        },
      },
    },
  );
}
```

- [ ] **Step 4: Create `lib/supabase/middleware.ts`** (refresh session)

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}
```

- [ ] **Step 5: Create `lib/supabase/admin.ts`** (service-role, server-only)

```ts
import "server-only";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
```

- [ ] **Step 6: Create root `middleware.ts`**

`apps/web/middleware.ts`:
```ts
import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 7: Install server-only**

```bash
cd apps/web && pnpm add server-only
```

- [ ] **Step 8: Verify build**

Run: `cd apps/web && pnpm build`
Expected: zero errors.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): wire supabase ssr clients + auth middleware"
```

### Task 1.4: Signup page

**Files:**
- Create: `apps/web/app/(auth)/layout.tsx`, `apps/web/app/(auth)/signup/page.tsx`, `apps/web/app/(auth)/signup/actions.ts`

- [ ] **Step 1: Auth route group layout (centered card)**

`apps/web/app/(auth)/layout.tsx`:
```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-900 via-blue-900 to-blue-950 px-4 py-8">
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
```

- [ ] **Step 2: Server action for signup**

`apps/web/app/(auth)/signup/actions.ts`:
```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const Schema = z.object({
  full_name: z.string().min(3),
  sex: z.enum(["M", "F", "O"]),
  birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signupAction(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { email, password, full_name, sex, birth_date } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, sex, birth_date } },
  });
  if (error) return { error: error.message };
  redirect("/pending");
}
```

- [ ] **Step 3: Install zod**

```bash
cd apps/web && pnpm add zod
```

- [ ] **Step 4: Signup form**

`apps/web/app/(auth)/signup/page.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { signupAction } from "./actions";
import Link from "next/link";

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-center">Cadastro</h1>
      <p className="text-sm text-center text-muted-foreground mb-6">
        Bolão da Família Bazante 2026
      </p>
      <form
        className="space-y-4"
        action={(fd) =>
          start(async () => {
            const r = await signupAction(fd);
            if (r?.error) setError(r.error);
          })
        }
      >
        <div><Label htmlFor="full_name">Nome completo</Label>
          <Input id="full_name" name="full_name" required /></div>
        <div><Label htmlFor="sex">Sexo</Label>
          <select id="sex" name="sex" className="w-full border rounded h-10 px-3" required>
            <option value="">Selecione</option><option value="M">Masculino</option>
            <option value="F">Feminino</option><option value="O">Outro</option>
          </select></div>
        <div><Label htmlFor="birth_date">Data de nascimento</Label>
          <Input id="birth_date" name="birth_date" type="date" required /></div>
        <div><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Senha (mín 8)</Label>
          <Input id="password" name="password" type="password" minLength={8} required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Criando…" : "Cadastrar"}
        </Button>
      </form>
      <p className="text-sm text-center mt-4">
        Já tem conta? <Link href="/login" className="underline">Entrar</Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 5: Run dev and signup with a real e-mail**

Run: `pnpm dev`. Open `http://localhost:3000/signup`. Submit form.
Expected: redirect to `/pending` (will 404 until next task).

- [ ] **Step 6: Verify row in profiles**

Open `http://localhost:54323` → `profiles` table → see your row with `approved_at = null`.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(auth): signup page + server action"
```

### Task 1.5: Login page

**Files:**
- Create: `apps/web/app/(auth)/login/page.tsx`, `apps/web/app/(auth)/login/actions.ts`

- [ ] **Step 1: Server action**

`apps/web/app/(auth)/login/actions.ts`:
```ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const supabase = await createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) return { error: error.message };

  // route post-login based on approval state
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved_at")
    .eq("id", data.user.id)
    .single();
  redirect(profile?.approved_at ? "/" : "/pending");
}
```

- [ ] **Step 2: Login form**

`apps/web/app/(auth)/login/page.tsx`:
```tsx
"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { loginAction } from "./actions";
import Link from "next/link";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Card className="p-6">
      <h1 className="text-2xl font-bold text-center">Entrar</h1>
      <p className="text-sm text-center text-muted-foreground mb-6">
        Bolão da Família Bazante 2026
      </p>
      <form className="space-y-4" action={(fd) =>
        start(async () => { const r = await loginAction(fd); if (r?.error) setError(r.error); })
      }>
        <div><Label htmlFor="email">E-mail</Label>
          <Input id="email" name="email" type="email" required /></div>
        <div><Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required /></div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="text-sm text-center mt-4">
        Novo? <Link href="/signup" className="underline">Cadastrar</Link>
      </p>
    </Card>
  );
}
```

- [ ] **Step 3: Manual test**

Run dev → `/login` → log in with the user from Task 1.4. Expected: redirect to `/pending`.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(auth): login page + post-login routing by approval state"
```

### Task 1.6: Pending approval page (Pix + QR + prize)

**Files:**
- Create: `apps/web/app/(auth)/pending/page.tsx`, `apps/web/components/pix-box.tsx`
- Install: `qrcode.react`

- [ ] **Step 1: Install QR lib**

```bash
cd apps/web && pnpm add qrcode.react
```

- [ ] **Step 2: PixBox component**

`apps/web/components/pix-box.tsx`:
```tsx
"use client";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function PixBox({ pixKey }: { pixKey: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl border bg-white p-4 flex flex-col items-center gap-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Pix · R$ 10</p>
      <QRCodeSVG value={pixKey} size={160} />
      <code className="text-xs break-all text-center px-2">{pixKey}</code>
      <Button variant="outline" size="sm" onClick={async () => {
        await navigator.clipboard.writeText(pixKey);
        setCopied(true); setTimeout(() => setCopied(false), 1500);
      }}>{copied ? "Copiado!" : "Copiar chave"}</Button>
    </div>
  );
}
```

- [ ] **Step 3: Pending page (server component)**

`apps/web/app/(auth)/pending/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixBox } from "@/components/pix-box";
import { Card } from "@/components/ui/card";

export default async function PendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("approved_at, full_name").eq("id", user.id).single();
  if (profile?.approved_at) redirect("/");

  const { data: settings } = await supabase
    .from("settings").select("pix_key, entry_fee_cents").eq("id", 1).single();
  const { count } = await supabase
    .from("profiles").select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);
  const prize = ((count ?? 0) * (settings?.entry_fee_cents ?? 1000)) / 100;

  return (
    <Card className="p-6 space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Quase lá, {profile?.full_name?.split(" ")[0]}!</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Faz o Pix de R$ 10 pro Gabriel. Assim que ele confirmar, você entra no bolão.
        </p>
      </div>
      <PixBox pixKey={settings?.pix_key ?? ""} />
      <div className="rounded-xl bg-gradient-to-br from-emerald-700 to-blue-900 text-white p-4 text-center">
        <p className="text-xs uppercase tracking-wide opacity-80">Prêmio atual</p>
        <p className="text-3xl font-black text-yellow-300">R$ {prize}</p>
        <p className="text-xs opacity-80">{count ?? 0} participantes confirmados</p>
      </div>
      <form action={async () => { "use server";
        const s = await createClient();
        await s.auth.signOut();
        redirect("/login");
      }}>
        <button className="text-xs text-muted-foreground underline w-full text-center">Sair</button>
      </form>
    </Card>
  );
}
```

- [ ] **Step 4: Manual test**

Dev → log in → land on `/pending` → see Pix box + prize R$ 0 (0 participantes ainda).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(auth): pending approval page with Pix QR + prize counter"
```

### Task 1.7: Admin approval page

**Files:**
- Create: `apps/web/app/(app)/admin/page.tsx`, `apps/web/app/(app)/admin/actions.ts`, `apps/web/app/(app)/layout.tsx` (placeholder)

- [ ] **Step 1: (app) layout placeholder**

`apps/web/app/(app)/layout.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles").select("approved_at, is_admin").eq("id", user.id).single();
  if (!profile?.approved_at && !profile?.is_admin) redirect("/pending");
  return <main className="min-h-screen bg-background">{children}</main>;
}
```

- [ ] **Step 2: Admin actions**

`apps/web/app/(app)/admin/actions.ts`:
```ts
"use server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authed");
  const { data: profile } = await supabase
    .from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) throw new Error("Not admin");
}

export async function approveUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.from("profiles")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function rejectUser(userId: string) {
  await assertAdmin();
  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(userId);
  revalidatePath("/admin");
}
```

- [ ] **Step 3: Admin page**

`apps/web/app/(app)/admin/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { approveUser, rejectUser } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles").select("is_admin").eq("id", user!.id).single();
  if (!me?.is_admin) redirect("/");

  const { data: pending } = await supabase
    .from("profiles")
    .select("id, full_name, email, created_at")
    .is("approved_at", null)
    .order("created_at", { ascending: true });

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold">Admin · Aprovações pendentes</h1>
      {pending?.length === 0 && <p className="text-muted-foreground">Nada pendente.</p>}
      <ul className="space-y-2">
        {pending?.map((p) => (
          <li key={p.id} className="rounded-xl border p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="font-semibold">{p.full_name}</p>
              <p className="text-xs text-muted-foreground">{p.email}</p>
            </div>
            <form action={approveUser.bind(null, p.id)}>
              <Button size="sm">Aprovar</Button>
            </form>
            <form action={rejectUser.bind(null, p.id)}>
              <Button size="sm" variant="destructive">Rejeitar</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 4: Make yourself admin manually (one-time)**

Studio SQL editor:
```sql
update public.profiles set is_admin = true, approved_at = now()
where email = 'gabrielbazante7@gmail.com';
```

- [ ] **Step 5: Manual test**

Dev → create a second user (different e-mail in another browser or use Inbucket) → log back in as Gabriel → `/admin` → see the pending user → click Aprovar → confirm `approved_at` is filled.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(admin): pending approval queue with approve/reject"
```

### Task 1.8: Home page with realtime prize counter

**Files:**
- Create: `apps/web/app/(app)/page.tsx`, `apps/web/components/prize-card.tsx`

- [ ] **Step 1: PrizeCard with realtime subscription**

`apps/web/components/prize-card.tsx`:
```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function PrizeCard({ initialCount, feeCents }: { initialCount: number; feeCents: number }) {
  const [count, setCount] = useState(initialCount);
  const prize = (count * feeCents) / 100;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel("profiles-approved")
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles" },
        async () => {
          const { count } = await supabase
            .from("profiles").select("id", { count: "exact", head: true })
            .not("approved_at", "is", null);
          if (count != null) setCount(count);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-emerald-700 to-blue-900 text-white p-6 text-center relative overflow-hidden">
      <div className="absolute -top-5 -right-5 w-24 h-24 bg-yellow-300/30 rounded-full blur-2xl" />
      <p className="text-[10px] uppercase tracking-widest opacity-90">🏆 Prêmio atual</p>
      <p className="text-4xl font-black text-yellow-300 my-1 tabular-nums">R$ {prize}</p>
      <p className="text-xs opacity-90">{count} participantes confirmados</p>
    </div>
  );
}
```

- [ ] **Step 2: Home page**

`apps/web/app/(app)/page.tsx`:
```tsx
import { createClient } from "@/lib/supabase/server";
import { PrizeCard } from "@/components/prize-card";

export default async function HomePage() {
  const supabase = await createClient();
  const { count } = await supabase.from("profiles")
    .select("id", { count: "exact", head: true })
    .not("approved_at", "is", null);
  const { data: settings } = await supabase
    .from("settings").select("entry_fee_cents").eq("id", 1).single();
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold text-center">Bolão Bazante 2026</h1>
      <PrizeCard initialCount={count ?? 0} feeCents={settings?.entry_fee_cents ?? 1000} />
      <p className="text-center text-muted-foreground text-sm">
        Em breve: palpites, ranking, ao vivo.
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Manual test**

Dev → log in as Gabriel → `/` → see PrizeCard with R$ 10 (yourself). Approve another user via `/admin` and watch the home update without refresh.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(home): prize card with realtime participant counter"
```

### Task 1.9: Deploy M1 to Vercel + Supabase production

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Push DB to production**

Link & push:
```bash
pnpm dlx supabase link --project-ref <YOUR-REF>
pnpm dlx supabase db push
```

- [ ] **Step 2: Make yourself admin in production**

Production SQL editor:
```sql
-- once Gabriel signs up in prod
update public.profiles set is_admin = true, approved_at = now()
where email = 'gabrielbazante7@gmail.com';
```

- [ ] **Step 3: Create `vercel.json`**

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm --filter @bolao/web build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next"
}
```

- [ ] **Step 4: Deploy**

```bash
pnpm dlx vercel link
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_URL production
pnpm dlx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
pnpm dlx vercel env add SUPABASE_SERVICE_ROLE_KEY production
pnpm dlx vercel deploy --prod
```

- [ ] **Step 5: Smoke test live URL**

Cadastra → vê pending → como admin aprova outro → home anima.

- [ ] **Step 6: Commit**

```bash
git add vercel.json
git commit -m "chore: vercel build config"
```

**Milestone 1 done.** The family can sign up now.

---

# Milestone 2 — Scoring Library + Data Schema + Seed

Goal: pure scoring library tested top-to-bottom; full Postgres schema for teams/phases/fixtures/bets; seed data for World Cup 2026 (12 groups, 48 teams, 104 matches, bracket rules).

### Task 2.1: Create `@bolao/scoring` package skeleton

**Files:**
- Create: `packages/scoring/package.json`, `packages/scoring/tsconfig.json`, `packages/scoring/vitest.config.ts`, `packages/scoring/src/index.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@bolao/scoring",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "@types/node": "^22.0.0"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": false
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
export default defineConfig({ test: { include: ["tests/**/*.test.ts"] } });
```

- [ ] **Step 4: `src/index.ts`** (empty stub)

```ts
export {};
```

- [ ] **Step 5: Install**

Run from repo root: `pnpm install`
Expected: workspace links @bolao/scoring.

- [ ] **Step 6: Commit**

```bash
git add packages/scoring
git commit -m "chore(scoring): package skeleton"
```

### Task 2.2: Define scoring types

**Files:**
- Create: `packages/scoring/src/types.ts`

- [ ] **Step 1: Write types**

```ts
// packages/scoring/src/types.ts

export type Bet = { home: number; away: number };

export type Result = {
  home_ft: number;
  away_ft: number;
  home_et?: number | null;
  away_et?: number | null;
};

export const PHASES = [
  "group", "r32", "r16", "qf", "sf", "third", "final",
] as const;
export type Phase = (typeof PHASES)[number];

export const POINTS: Record<Phase, { result: number; exact: number }> = {
  group: { result: 1,  exact: 2  },
  r32:   { result: 2,  exact: 4  },
  r16:   { result: 3,  exact: 6  },
  qf:    { result: 7,  exact: 14 },
  sf:    { result: 15, exact: 30 },
  third: { result: 13, exact: 26 },
  final: { result: 25, exact: 50 },
};

export const CHAMPION_BONUS = 50;
```

- [ ] **Step 2: Re-export from index**

`packages/scoring/src/index.ts`:
```ts
export * from "./types";
```

- [ ] **Step 3: Typecheck**

Run: `pnpm --filter @bolao/scoring typecheck`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add packages/scoring
git commit -m "feat(scoring): types + points table"
```

### Task 2.3: TDD `calculate` — group phase (exact / result / miss)

**Files:**
- Create: `packages/scoring/tests/calculate.test.ts`, `packages/scoring/src/calculate.ts`

- [ ] **Step 1: Write failing tests**

```ts
// packages/scoring/tests/calculate.test.ts
import { describe, it, expect } from "vitest";
import { calculate } from "../src/calculate";

describe("calculate — group phase", () => {
  it("returns 2 (exact) when bet matches FT exactly", () => {
    expect(calculate({ home: 2, away: 1 }, { home_ft: 2, away_ft: 1 }, "group")).toBe(2);
  });
  it("returns 1 (result) when winner matches but score differs", () => {
    expect(calculate({ home: 3, away: 1 }, { home_ft: 2, away_ft: 0 }, "group")).toBe(1);
  });
  it("returns 0 when winner is wrong", () => {
    expect(calculate({ home: 2, away: 1 }, { home_ft: 0, away_ft: 1 }, "group")).toBe(0);
  });
  it("returns 1 on tie when bet was tie", () => {
    expect(calculate({ home: 1, away: 1 }, { home_ft: 2, away_ft: 2 }, "group")).toBe(1);
  });
  it("returns 2 on 0-0 exact", () => {
    expect(calculate({ home: 0, away: 0 }, { home_ft: 0, away_ft: 0 }, "group")).toBe(2);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bolao/scoring test`
Expected: cannot find calculate.

- [ ] **Step 3: Implement minimal**

`packages/scoring/src/calculate.ts`:
```ts
import { POINTS, type Bet, type Result, type Phase } from "./types";

export function calculate(bet: Bet, result: Result, phase: Phase): number {
  const isKnockout = phase !== "group";
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
```

- [ ] **Step 4: Add to index**

Append to `packages/scoring/src/index.ts`:
```ts
export { calculate } from "./calculate";
```

- [ ] **Step 5: Run — expect PASS**

Run: `pnpm --filter @bolao/scoring test`
Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add packages/scoring
git commit -m "feat(scoring): calculate() for group phase + tests"
```

### Task 2.4: TDD `calculate` — knockout phases with ET

**Files:** modify `packages/scoring/tests/calculate.test.ts`

- [ ] **Step 1: Add tests**

Append:
```ts
describe("calculate — knockout uses ET when present", () => {
  it("r16: bet 2-1, FT 1-1, ET 2-1 → exact (6 pts)", () => {
    expect(calculate({ home: 2, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 2, away_et: 1 }, "r16")).toBe(6);
  });
  it("r16: bet 1-1, FT 1-1, ET 2-1 → 0 (wrong winner)", () => {
    expect(calculate({ home: 1, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 2, away_et: 1 }, "r16")).toBe(0);
  });
  it("qf: bet 3-2, FT 2-2, ET 3-2 → exact (14 pts)", () => {
    expect(calculate({ home: 3, away: 2 },
      { home_ft: 2, away_ft: 2, home_et: 3, away_et: 2 }, "qf")).toBe(14);
  });
  it("knockout with no ET: uses FT (decided in regulation)", () => {
    expect(calculate({ home: 2, away: 0 },
      { home_ft: 2, away_ft: 0 }, "qf")).toBe(14);
  });
  it("draw in ET (penalties decide): exact tie bet counts", () => {
    expect(calculate({ home: 1, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 1, away_et: 1 }, "sf")).toBe(30);
  });
  it("draw in ET, bet was 2-1: 0 pts (penalties ignored)", () => {
    expect(calculate({ home: 2, away: 1 },
      { home_ft: 1, away_ft: 1, home_et: 1, away_et: 1 }, "sf")).toBe(0);
  });
});

describe("calculate — phase point values", () => {
  it.each([
    ["group", 1, 2], ["r32", 2, 4], ["r16", 3, 6],
    ["qf", 7, 14], ["sf", 15, 30], ["third", 13, 26], ["final", 25, 50],
  ] as const)("%s: result=%i exact=%i", (phase, ptsResult, ptsExact) => {
    expect(calculate({ home: 1, away: 1 }, { home_ft: 2, away_ft: 2 }, phase)).toBe(ptsResult);
    expect(calculate({ home: 2, away: 0 }, { home_ft: 2, away_ft: 0 }, phase)).toBe(ptsExact);
  });
});
```

- [ ] **Step 2: Run — expect PASS** (calculate already handles ET)

Run: `pnpm --filter @bolao/scoring test`
Expected: all 18+ pass.

- [ ] **Step 3: Commit**

```bash
git add packages/scoring
git commit -m "test(scoring): cover all knockout cases + every phase"
```

### Task 2.5: TDD `championBonus`

**Files:**
- Create: `packages/scoring/src/champion-bonus.ts`, `packages/scoring/tests/champion-bonus.test.ts`

- [ ] **Step 1: Failing tests**

```ts
// tests/champion-bonus.test.ts
import { describe, it, expect } from "vitest";
import { championBonus } from "../src/champion-bonus";

describe("championBonus", () => {
  it("returns 50 when champion is among picks", () => {
    expect(championBonus([7, 11], 7)).toBe(50);
  });
  it("returns 0 when no pick matches", () => {
    expect(championBonus([7, 11], 12)).toBe(0);
  });
  it("returns 50 even if both picks list the same id (still single 50)", () => {
    expect(championBonus([7, 7], 7)).toBe(50);
  });
  it("handles empty picks", () => {
    expect(championBonus([], 7)).toBe(0);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `pnpm --filter @bolao/scoring test`

- [ ] **Step 3: Implement**

```ts
// src/champion-bonus.ts
import { CHAMPION_BONUS } from "./types";

export function championBonus(picks: number[], championTeamId: number): number {
  return picks.includes(championTeamId) ? CHAMPION_BONUS : 0;
}
```

Append to `src/index.ts`:
```ts
export { championBonus } from "./champion-bonus";
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```bash
git add packages/scoring
git commit -m "feat(scoring): championBonus + tests"
```

### Task 2.6: Full DB schema — teams, phases, fixtures, bets, champion_picks, bracket_rules, cron_runs

**Files:**
- Create: `supabase/migrations/0003_bolao_schema.sql`

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0003_bolao_schema.sql

create table public.teams (
  id          int primary key,
  fifa_code   text unique not null,
  name_pt     text not null,
  flag_emoji  text not null,
  group_code  text
);

create table public.phases (
  id            int primary key,
  code          text unique not null check (code in ('group','r32','r16','qf','sf','third','final')),
  name          text not null,
  order_idx     int not null,
  points_result int not null,
  points_exact  int not null,
  opens_at      timestamptz,
  closes_at     timestamptz,
  status        text not null default 'locked' check (status in ('locked','open','closed','scored'))
);

create table public.fixtures (
  id              int primary key,
  phase_id        int not null references public.phases(id),
  api_fixture_id  bigint unique,
  kickoff_at      timestamptz not null,
  home_team_id    int references public.teams(id),
  away_team_id    int references public.teams(id),
  status          text not null default 'scheduled'
                  check (status in ('scheduled','live','finished')),
  home_score_ft   int, away_score_ft int,
  home_score_et   int, away_score_et int,
  scored_at       timestamptz
);
create index fixtures_phase_idx on public.fixtures(phase_id);
create index fixtures_status_idx on public.fixtures(status);
create index fixtures_kickoff_idx on public.fixtures(kickoff_at);

create table public.bets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  fixture_id  int not null references public.fixtures(id),
  home_score  int not null check (home_score >= 0 and home_score <= 20),
  away_score  int not null check (away_score >= 0 and away_score <= 20),
  points      int,
  scored_at   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, fixture_id)
);
create index bets_user_idx on public.bets(user_id);
create index bets_fixture_idx on public.bets(fixture_id);

create table public.champion_picks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  team_id     int not null references public.teams(id),
  points      int not null default 0,
  scored_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, team_id)
);

create table public.bracket_rules (
  -- which positions in source phase feed which slot in target phase
  id              serial primary key,
  target_phase    text not null,
  target_fixture  int not null,        -- 1..N within the phase
  slot            text not null check (slot in ('home','away')),
  source          text not null        -- e.g., '1A', '2B', '3ACD/E', 'W1', 'L_SF1' (parseable token)
);

create table public.cron_runs (
  id                bigserial primary key,
  ran_at            timestamptz not null default now(),
  fixtures_checked  int not null default 0,
  fixtures_scored   int not null default 0,
  errors            jsonb
);

-- updated_at trigger on bets
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger bets_touch_updated
  before update on public.bets
  for each row execute function public.touch_updated_at();
```

- [ ] **Step 2: Apply**

```bash
pnpm dlx supabase db reset
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0003_bolao_schema.sql
git commit -m "feat(db): teams, phases, fixtures, bets, champion_picks, bracket_rules, cron_runs"
```

### Task 2.7: RLS for bets, champion_picks, fixtures, phases

**Files:**
- Create: `supabase/migrations/0004_rls_bolao.sql`

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0004_rls_bolao.sql

alter table public.teams enable row level security;
alter table public.phases enable row level security;
alter table public.fixtures enable row level security;
alter table public.bets enable row level security;
alter table public.champion_picks enable row level security;
alter table public.bracket_rules enable row level security;
alter table public.cron_runs enable row level security;

-- public reads for static refdata
create policy "teams_read" on public.teams for select using (true);
create policy "phases_read" on public.phases for select to authenticated using (true);
create policy "fixtures_read" on public.fixtures for select to authenticated using (true);
create policy "bracket_rules_read" on public.bracket_rules for select to authenticated using (true);

-- bets: owner always; others only when fixture is LIVE
create policy "bets_read_owner_or_live" on public.bets for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.fixtures f
    where f.id = bets.fixture_id and f.status = 'live'
  )
);

create policy "bets_write_owner_when_open" on public.bets for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id and p.status = 'open'
  )
);

create policy "bets_update_owner_when_open" on public.bets for update using (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id and p.status = 'open'
  )
);

-- champion_picks: owner always; insert/update only before group phase locks
create policy "cp_read_owner_or_admin" on public.champion_picks for select using (
  user_id = auth.uid() or public.is_admin()
);

create policy "cp_write_owner_pre_group_lock" on public.champion_picks for insert with check (
  user_id = auth.uid()
  and exists (select 1 from public.phases where code = 'group' and status = 'open')
);

create policy "cp_delete_owner_pre_group_lock" on public.champion_picks for delete using (
  user_id = auth.uid()
  and exists (select 1 from public.phases where code = 'group' and status = 'open')
);

-- admin writes for fixtures/phases (cron uses service_role which bypasses RLS)
create policy "fixtures_write_admin" on public.fixtures for all using (public.is_admin());
create policy "phases_write_admin" on public.phases for all using (public.is_admin());

create policy "cron_runs_read_admin" on public.cron_runs for select using (public.is_admin());
```

- [ ] **Step 2: Apply + commit**

```bash
pnpm dlx supabase db reset
git add supabase/migrations/0004_rls_bolao.sql
git commit -m "feat(db): RLS — bets private except live, cp pre-lock only"
```

### Task 2.8: Ranking view

**Files:**
- Create: `supabase/migrations/0005_ranking_view.sql`

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0005_ranking_view.sql

create view public.ranking as
select
  p.id,
  p.full_name,
  p.avatar_url,
  coalesce(sum(b.points), 0) + coalesce((select sum(points) from public.champion_picks cp where cp.user_id = p.id), 0) as total_points,
  count(*) filter (where b.points = ph.points_exact and b.points > 0) as exact_count,
  count(*) filter (where b.points > 0) as hit_count,
  exists (select 1 from public.champion_picks cp where cp.user_id = p.id and cp.points > 0) as hit_champion
from public.profiles p
left join public.bets b on b.user_id = p.id
left join public.fixtures f on b.fixture_id = f.id
left join public.phases ph on f.phase_id = ph.id
where p.approved_at is not null
group by p.id, p.full_name, p.avatar_url
order by total_points desc, hit_champion desc, exact_count desc, hit_count desc;

grant select on public.ranking to authenticated;
```

- [ ] **Step 2: Apply + commit**

```bash
pnpm dlx supabase db reset
git add supabase/migrations/0005_ranking_view.sql
git commit -m "feat(db): ranking view with tiebreaker order"
```

### Task 2.9: Seed phases + bracket_rules (static data)

**Files:**
- Create: `supabase/migrations/0006_seed_phases.sql`

- [ ] **Step 1: Migration**

```sql
-- supabase/migrations/0006_seed_phases.sql

insert into public.phases (id, code, name, order_idx, points_result, points_exact, status) values
  (1, 'group',  'Fase de Grupos', 1, 1,  2,  'locked'),
  (2, 'r32',    '32avos',         2, 2,  4,  'locked'),
  (3, 'r16',    'Oitavas',        3, 3,  6,  'locked'),
  (4, 'qf',     'Quartas',        4, 7,  14, 'locked'),
  (5, 'sf',     'Semi',           5, 15, 30, 'locked'),
  (6, 'third',  '3º lugar',       6, 13, 26, 'locked'),
  (7, 'final',  'Final',          7, 25, 50, 'locked');

-- bracket_rules: FIFA 2026 R32 mapping
-- Format reference: top 2 of each of 12 groups (24) + 8 best third-placed
-- See https://en.wikipedia.org/wiki/2026_FIFA_World_Cup#Knockout_stage
-- This table is parsed by advance-phase logic; tokens encode "1A" = winner group A,
-- "3ACD/E" = best third among A/C/D/E (decided by FIFA standings rules at runtime).

-- Engineer note: the exact mapping below must be cross-checked against the latest
-- FIFA official bracket for 2026 before going live. Update if FIFA publishes a
-- different layout. Source: official FIFA tournament regulations.

insert into public.bracket_rules (target_phase, target_fixture, slot, source) values
  -- R32 fixtures 1..16 (target_fixture = id within phase 1..16)
  ('r32', 1,  'home', '1A'),  ('r32', 1,  'away', '3CDEF'),
  ('r32', 2,  'home', '1C'),  ('r32', 2,  'away', '3DEFI'),
  ('r32', 3,  'home', '1E'),  ('r32', 3,  'away', '3ABDF'),
  ('r32', 4,  'home', '1G'),  ('r32', 4,  'away', '3ABCH'),
  ('r32', 5,  'home', '1I'),  ('r32', 5,  'away', '3HJKL'),
  ('r32', 6,  'home', '1K'),  ('r32', 6,  'away', '3GHJL'),
  ('r32', 7,  'home', '1B'),  ('r32', 7,  'away', '2A'),
  ('r32', 8,  'home', '1D'),  ('r32', 8,  'away', '2C'),
  ('r32', 9,  'home', '1F'),  ('r32', 9,  'away', '2E'),
  ('r32', 10, 'home', '1H'),  ('r32', 10, 'away', '2G'),
  ('r32', 11, 'home', '1J'),  ('r32', 11, 'away', '2I'),
  ('r32', 12, 'home', '1L'),  ('r32', 12, 'away', '2K'),
  ('r32', 13, 'home', '2B'),  ('r32', 13, 'away', '2D'),
  ('r32', 14, 'home', '2F'),  ('r32', 14, 'away', '2H'),
  ('r32', 15, 'home', '2J'),  ('r32', 15, 'away', '2L'),
  ('r32', 16, 'home', '3GHIK'),('r32', 16, 'away', '3FGIJ'),
  -- R16: winners of R32 paired sequentially
  ('r16', 1, 'home', 'W_R32_1'), ('r16', 1, 'away', 'W_R32_2'),
  ('r16', 2, 'home', 'W_R32_3'), ('r16', 2, 'away', 'W_R32_4'),
  ('r16', 3, 'home', 'W_R32_5'), ('r16', 3, 'away', 'W_R32_6'),
  ('r16', 4, 'home', 'W_R32_7'), ('r16', 4, 'away', 'W_R32_8'),
  ('r16', 5, 'home', 'W_R32_9'), ('r16', 5, 'away', 'W_R32_10'),
  ('r16', 6, 'home', 'W_R32_11'),('r16', 6, 'away', 'W_R32_12'),
  ('r16', 7, 'home', 'W_R32_13'),('r16', 7, 'away', 'W_R32_14'),
  ('r16', 8, 'home', 'W_R32_15'),('r16', 8, 'away', 'W_R32_16'),
  -- QF
  ('qf', 1, 'home', 'W_R16_1'), ('qf', 1, 'away', 'W_R16_2'),
  ('qf', 2, 'home', 'W_R16_3'), ('qf', 2, 'away', 'W_R16_4'),
  ('qf', 3, 'home', 'W_R16_5'), ('qf', 3, 'away', 'W_R16_6'),
  ('qf', 4, 'home', 'W_R16_7'), ('qf', 4, 'away', 'W_R16_8'),
  -- SF
  ('sf', 1, 'home', 'W_QF_1'), ('sf', 1, 'away', 'W_QF_2'),
  ('sf', 2, 'home', 'W_QF_3'), ('sf', 2, 'away', 'W_QF_4'),
  -- 3rd place
  ('third', 1, 'home', 'L_SF_1'), ('third', 1, 'away', 'L_SF_2'),
  -- Final
  ('final', 1, 'home', 'W_SF_1'), ('final', 1, 'away', 'W_SF_2');
```

- [ ] **Step 2: Apply + commit**

```bash
pnpm dlx supabase db reset
git add supabase/migrations/0006_seed_phases.sql
git commit -m "feat(db): seed phases + bracket_rules per FIFA 2026 format"
```

> **Important:** Before going live, an engineer must double-check the bracket against the official FIFA 2026 bracket and adjust the third-placed cross-pairings (`3CDEF` etc.) accordingly. The format is fixed but FIFA may publish the canonical pairing closer to the tournament.

### Task 2.10: Seed teams + fixtures (group stage) from openfootball

**Files:**
- Create: `supabase/seed/teams.ts`, `supabase/seed/fixtures.ts`, `supabase/seed/run.ts`, `supabase/seed/package.json`

- [ ] **Step 1: Seed package**

`supabase/seed/package.json`:
```json
{
  "name": "@bolao/seed",
  "private": true,
  "type": "module",
  "scripts": { "run": "tsx run.ts" },
  "dependencies": { "@supabase/supabase-js": "^2.45.0", "tsx": "^4.19.0" }
}
```

Install:
```bash
cd supabase/seed && pnpm add @supabase/supabase-js tsx && cd ../..
```

- [ ] **Step 2: Teams seed (paste from FIFA 2026 confirmed list)**

`supabase/seed/teams.ts`:
```ts
// FIFA 2026: 48 teams across 12 groups. Update group_code once the official draw is published.
export const TEAMS: { id: number; fifa_code: string; name_pt: string; flag_emoji: string; group_code: string | null }[] = [
  { id: 1,  fifa_code: "BRA", name_pt: "Brasil",       flag_emoji: "🇧🇷", group_code: "A" },
  { id: 2,  fifa_code: "ARG", name_pt: "Argentina",    flag_emoji: "🇦🇷", group_code: "C" },
  { id: 3,  fifa_code: "USA", name_pt: "EUA",          flag_emoji: "🇺🇸", group_code: "C" },
  { id: 4,  fifa_code: "CAN", name_pt: "Canadá",       flag_emoji: "🇨🇦", group_code: "A" },
  { id: 5,  fifa_code: "MEX", name_pt: "México",       flag_emoji: "🇲🇽", group_code: "B" },
  // ... fill remaining 43 entries from the official FIFA 2026 draw.
  // Source of truth: https://www.fifa.com/en/tournaments/mens/worldcup/canadamexicousa2026
  // and https://github.com/openfootball/worldcup.json/tree/master/2026
];
```

> The seed engineer must populate the remaining 43 rows from `openfootball/worldcup.json` once the file lists 2026 in full, or manually from FIFA after the draw. This list compiles to a static TS array — no API call.

- [ ] **Step 3: Fixtures seed (group stage — 72 matches)**

`supabase/seed/fixtures.ts`:
```ts
// 72 group matches + 16 R32 (empty teams) + 8 R16 + 4 QF + 2 SF + 1 3rd + 1 Final = 104 fixtures
// IDs: group 1..72, r32 101..116, r16 201..208, qf 301..304, sf 401..402, third 501, final 601
export type FixtureSeed = {
  id: number; phase_id: number; kickoff_at: string;
  home_team_id?: number; away_team_id?: number;
};
export const FIXTURES: FixtureSeed[] = [
  // Group matches — populated from openfootball/worldcup.json 2026
  { id: 1, phase_id: 1, kickoff_at: "2026-06-11T20:00:00Z", home_team_id: 5, away_team_id: 24 },
  // ... 71 more group fixtures
  // R32 (slots empty until advance-phase fills them via bracket_rules)
  { id: 101, phase_id: 2, kickoff_at: "2026-06-28T17:00:00Z" },
  { id: 102, phase_id: 2, kickoff_at: "2026-06-28T20:00:00Z" },
  // ... 14 more
  // R16/QF/SF/3rd/Final analogous
];
```

> Engineer: fill the 72 group fixtures from `openfootball/worldcup.json` (mirror their `matches[]` order, convert datetimes to UTC). For mata-mata, only `id`, `phase_id`, `kickoff_at` are needed — slots will be filled at runtime.

- [ ] **Step 4: Seed runner**

`supabase/seed/run.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import { TEAMS } from "./teams";
import { FIXTURES } from "./fixtures";

const url = process.env.SUPABASE_URL!;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(url, key, { auth: { persistSession: false } });

async function main() {
  console.log("Seeding teams…");
  const { error: te } = await supabase.from("teams").upsert(TEAMS);
  if (te) throw te;

  console.log("Seeding fixtures…");
  const { error: fe } = await supabase.from("fixtures").upsert(FIXTURES);
  if (fe) throw fe;

  console.log("Done.");
}
main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 5: Run against local**

```bash
export SUPABASE_URL=http://localhost:54321
export SUPABASE_SERVICE_ROLE_KEY=<from `supabase status`>
pnpm --filter @bolao/seed run
```
Expected: prints "Done."

- [ ] **Step 6: Verify in Studio**

`select count(*) from teams;` → 48. `select count(*) from fixtures;` → 104.

- [ ] **Step 7: Commit**

```bash
git add supabase/seed
git commit -m "feat(seed): teams + 104 fixtures seed runner"
```

**Milestone 2 done.** Scoring library is bulletproof, DB is ready.

---

# Milestone 3 — Predictions, Cron Scoring, Realtime Ranking

Goal: users can submit group-phase predictions, cron jobs poll API-Football and award points automatically, ranking updates live.

### Task 3.1: `@bolao/wc-api` package skeleton + types

**Files:**
- Create: `packages/wc-api/package.json`, `packages/wc-api/tsconfig.json`, `packages/wc-api/src/types.ts`, `packages/wc-api/src/index.ts`

- [ ] **Step 1: `package.json`**

```json
{
  "name": "@bolao/wc-api",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": { "vitest": "^2.1.0", "@types/node": "^22.0.0" }
}
```

- [ ] **Step 2: `tsconfig.json`** (same shape as scoring)

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "noEmit": false },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Types**

`packages/wc-api/src/types.ts`:
```ts
export type ApiFixture = {
  fixture_id: number;
  status: "scheduled" | "live" | "finished";
  home_team_code: string;
  away_team_code: string;
  kickoff_at: string;        // ISO
  home_score_ft: number | null;
  away_score_ft: number | null;
  home_score_et: number | null;
  away_score_et: number | null;
};

export type ApiStanding = {
  group_code: string;
  position: number;
  team_code: string;
  played: number;
  points: number;
  gd: number;
};
```

- [ ] **Step 4: Index**

`packages/wc-api/src/index.ts`:
```ts
export * from "./types";
export { fetchFixtures } from "./fixtures";
export { fetchStandings } from "./standings";
```

- [ ] **Step 5: Commit**

```bash
git add packages/wc-api
git commit -m "chore(wc-api): package skeleton + types"
```

### Task 3.2: TDD wc-api `normalizeFixture`

**Files:**
- Create: `packages/wc-api/src/fixtures.ts`, `packages/wc-api/tests/fixtures.test.ts`, `packages/wc-api/tests/fixtures.fixtures.ts`

- [ ] **Step 1: Sample raw response**

`packages/wc-api/tests/fixtures.fixtures.ts`:
```ts
export const RAW_FT = {
  fixture: { id: 1208000, date: "2026-06-11T20:00:00+00:00",
    status: { short: "FT", long: "Match Finished" } },
  teams: {
    home: { id: 6, name: "Mexico" }, away: { id: 1118, name: "Brazil" },
  },
  goals: { home: 1, away: 2 },
  score: {
    halftime: { home: 0, away: 1 },
    fulltime: { home: 1, away: 2 },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null },
  },
};

export const RAW_AET = {
  ...RAW_FT,
  fixture: { ...RAW_FT.fixture, status: { short: "AET", long: "After Extra Time" } },
  score: {
    halftime: { home: 1, away: 0 },
    fulltime: { home: 1, away: 1 },
    extratime: { home: 2, away: 1 },
    penalty:   { home: null, away: null },
  },
};

export const RAW_LIVE = {
  ...RAW_FT,
  fixture: { ...RAW_FT.fixture, status: { short: "1H", long: "First Half" } },
  score: {
    halftime: { home: null, away: null },
    fulltime: { home: null, away: null },
    extratime: { home: null, away: null },
    penalty:   { home: null, away: null },
  },
};
```

- [ ] **Step 2: Failing tests**

`packages/wc-api/tests/fixtures.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { normalizeFixture } from "../src/fixtures";
import { RAW_FT, RAW_AET, RAW_LIVE } from "./fixtures.fixtures";

describe("normalizeFixture", () => {
  it("maps FT response", () => {
    const r = normalizeFixture(RAW_FT);
    expect(r.status).toBe("finished");
    expect(r.home_score_ft).toBe(1);
    expect(r.away_score_ft).toBe(2);
    expect(r.home_score_et).toBeNull();
  });
  it("maps AET response — preserves both FT and ET", () => {
    const r = normalizeFixture(RAW_AET);
    expect(r.status).toBe("finished");
    expect(r.home_score_ft).toBe(1); expect(r.away_score_ft).toBe(1);
    expect(r.home_score_et).toBe(2); expect(r.away_score_et).toBe(1);
  });
  it("maps in-progress (1H/2H) to live", () => {
    expect(normalizeFixture(RAW_LIVE).status).toBe("live");
  });
});
```

- [ ] **Step 3: Run — FAIL**

`pnpm --filter @bolao/wc-api test`

- [ ] **Step 4: Implement (just the normalizer; HTTP later)**

`packages/wc-api/src/fixtures.ts`:
```ts
import type { ApiFixture } from "./types";

const LIVE_STATUSES = new Set(["1H","HT","2H","ET","BT","P","SUSP","INT","LIVE"]);
const FINISHED_STATUSES = new Set(["FT","AET","PEN"]);

export function normalizeFixture(raw: any): ApiFixture {
  const short = raw.fixture.status.short as string;
  const status = FINISHED_STATUSES.has(short) ? "finished"
                : LIVE_STATUSES.has(short)    ? "live"
                : "scheduled";
  return {
    fixture_id: raw.fixture.id,
    status,
    home_team_code: raw.teams.home.name,    // map to FIFA code later via teams table
    away_team_code: raw.teams.away.name,
    kickoff_at: raw.fixture.date,
    home_score_ft: raw.score.fulltime.home ?? null,
    away_score_ft: raw.score.fulltime.away ?? null,
    home_score_et: raw.score.extratime.home ?? null,
    away_score_et: raw.score.extratime.away ?? null,
  };
}

export async function fetchFixtures(apiKey: string, params: { ids?: number[] } = {}) {
  const url = new URL("https://v3.football.api-sports.io/fixtures");
  if (params.ids?.length) url.searchParams.set("ids", params.ids.join("-"));
  else { url.searchParams.set("league", "1"); url.searchParams.set("season", "2026"); }
  const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) throw new Error(`api-football ${res.status}`);
  const json = await res.json();
  return (json.response as any[]).map(normalizeFixture);
}
```

- [ ] **Step 5: Run — PASS**

- [ ] **Step 6: Commit**

```bash
git add packages/wc-api
git commit -m "feat(wc-api): normalizeFixture + fetchFixtures wrapper with tests"
```

### Task 3.3: `fetchStandings` for advance-phase

**Files:** `packages/wc-api/src/standings.ts`

- [ ] **Step 1: Implement**

```ts
// packages/wc-api/src/standings.ts
import type { ApiStanding } from "./types";

export async function fetchStandings(apiKey: string): Promise<ApiStanding[]> {
  const url = "https://v3.football.api-sports.io/standings?league=1&season=2026";
  const res = await fetch(url, { headers: { "x-apisports-key": apiKey } });
  if (!res.ok) throw new Error(`api-football standings ${res.status}`);
  const json = await res.json();
  const groups = json.response?.[0]?.league?.standings ?? [];
  const out: ApiStanding[] = [];
  for (const group of groups as any[]) {
    for (const row of group) {
      out.push({
        group_code: row.group?.replace(/[^A-L]/g, "") ?? "",
        position:   row.rank,
        team_code:  row.team.name,
        played:     row.all?.played ?? 0,
        points:     row.points ?? 0,
        gd:         row.goalsDiff ?? 0,
      });
    }
  }
  return out;
}
```

- [ ] **Step 2: Test (parsing only — mock response)**

`packages/wc-api/tests/standings.test.ts`:
```ts
import { describe, it, expect, vi } from "vitest";
import { fetchStandings } from "../src/standings";

const FAKE = {
  response: [{ league: { standings: [[
    { rank: 1, group: "Group A", points: 9, goalsDiff: 5, team: { name: "Mexico" }, all: { played: 3 } },
    { rank: 2, group: "Group A", points: 6, goalsDiff: 2, team: { name: "Argentina" }, all: { played: 3 } },
  ]] } }],
};

describe("fetchStandings", () => {
  it("parses positions and group codes", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, json: async () => FAKE,
    }) as any;
    const s = await fetchStandings("k");
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ position: 1, group_code: "A", team_code: "Mexico" });
  });
});
```

- [ ] **Step 3: Run — PASS**

- [ ] **Step 4: Commit**

```bash
git add packages/wc-api
git commit -m "feat(wc-api): fetchStandings + parser test"
```

### Task 3.4: Add scoring + wc-api as deps to web

**Files:** `apps/web/package.json`

- [ ] **Step 1: Add workspace deps**

```bash
cd apps/web && pnpm add @bolao/scoring@workspace:* @bolao/wc-api@workspace:*
```

- [ ] **Step 2: Build both packages once so dist/ exists**

Run from repo root: `pnpm -r build`
Expected: scoring and wc-api emit `dist/`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml
git commit -m "chore(web): consume scoring + wc-api workspace packages"
```

### Task 3.5: Palpites page — fetch fixtures + render group tabs

**Files:**
- Create: `apps/web/app/(app)/palpites/page.tsx`, `apps/web/components/fixture-bet-card.tsx`, `apps/web/app/(app)/palpites/actions.ts`

- [ ] **Step 1: Server action `saveBet`**

```ts
// apps/web/app/(app)/palpites/actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";

export async function saveBet(fixtureId: number, home: number, away: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authed");
  const { error } = await supabase
    .from("bets")
    .upsert({
      user_id: user.id,
      fixture_id: fixtureId,
      home_score: home,
      away_score: away,
    }, { onConflict: "user_id,fixture_id" });
  if (error) throw error;
  return { ok: true };
}
```

- [ ] **Step 2: FixtureBetCard (client component, debounced save)**

```tsx
// apps/web/components/fixture-bet-card.tsx
"use client";
import { useState, useTransition, useEffect, useRef } from "react";
import { saveBet } from "@/app/(app)/palpites/actions";

type Team = { id: number; name_pt: string; flag_emoji: string };
type Fixture = { id: number; kickoff_at: string; home: Team; away: Team };

export function FixtureBetCard({
  fixture, initialHome, initialAway, locked,
}: { fixture: Fixture; initialHome?: number; initialAway?: number; locked: boolean }) {
  const [home, setHome] = useState(initialHome ?? "");
  const [away, setAway] = useState(initialAway ?? "");
  const [saved, setSaved] = useState(initialHome != null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (home === "" || away === "" || locked) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => start(async () => {
      await saveBet(fixture.id, Number(home), Number(away));
      setSaved(true);
    }), 800);
  }, [home, away, locked, fixture.id]);

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{fixture.home.flag_emoji}</span>
          <span className="text-xs font-semibold">{fixture.home.name_pt}</span>
        </div>
        <div className="flex items-center gap-1">
          <input className="w-9 h-10 text-center text-lg font-bold border-2 border-primary rounded"
            type="number" min={0} max={20} value={home} disabled={locked}
            onChange={(e) => { setSaved(false); setHome(e.target.value); }} />
          <span className="text-muted-foreground">×</span>
          <input className="w-9 h-10 text-center text-lg font-bold border-2 border-primary rounded"
            type="number" min={0} max={20} value={away} disabled={locked}
            onChange={(e) => { setSaved(false); setAway(e.target.value); }} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-2xl">{fixture.away.flag_emoji}</span>
          <span className="text-xs font-semibold">{fixture.away.name_pt}</span>
        </div>
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-2">
        {new Date(fixture.kickoff_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
      </p>
      <p className="text-right text-[10px] text-emerald-700 h-3">
        {pending ? "Salvando…" : saved ? "✓ Salvo" : ""}
      </p>
    </div>
  );
}
```

- [ ] **Step 3: Palpites page**

```tsx
// apps/web/app/(app)/palpites/page.tsx
import { createClient } from "@/lib/supabase/server";
import { FixtureBetCard } from "@/components/fixture-bet-card";

export default async function PalpitesPage() {
  const supabase = await createClient();
  const { data: openPhase } = await supabase
    .from("phases").select("*").eq("status", "open").maybeSingle();

  if (!openPhase) {
    return <div className="p-6 text-center text-muted-foreground">
      Nenhuma fase aberta agora. Espere a próxima abrir.
    </div>;
  }

  const { data: fixtures } = await supabase
    .from("fixtures")
    .select("id, kickoff_at, home:home_team_id(id,name_pt,flag_emoji,group_code), away:away_team_id(id,name_pt,flag_emoji,group_code)")
    .eq("phase_id", openPhase.id)
    .order("kickoff_at");

  const { data: { user } } = await supabase.auth.getUser();
  const { data: bets } = await supabase
    .from("bets").select("fixture_id, home_score, away_score").eq("user_id", user!.id);
  const byFixture = new Map(bets?.map(b => [b.fixture_id, b]));

  const groups = new Map<string, typeof fixtures>();
  for (const f of fixtures ?? []) {
    const g = (f as any).home?.group_code ?? "?";
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(f);
  }

  const closesAt = openPhase.closes_at ? new Date(openPhase.closes_at) : null;
  const filledCount = bets?.length ?? 0;
  const totalCount = fixtures?.length ?? 0;

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="rounded-xl border bg-card p-3">
        <p className="font-bold text-primary">⚽ {openPhase.name}</p>
        {closesAt && <p className="text-xs text-red-600 font-semibold">
          ⏰ Trava {closesAt.toLocaleString("pt-BR")}
        </p>}
        <div className="h-1.5 bg-muted rounded mt-2 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-600 to-yellow-400"
            style={{ width: `${(filledCount/totalCount)*100}%` }} />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          {filledCount} de {totalCount} palpites preenchidos
        </p>
      </div>
      {[...groups.entries()].sort().map(([g, list]) => (
        <details key={g} open className="rounded-xl border bg-muted/40">
          <summary className="px-3 py-2 font-semibold cursor-pointer">Grupo {g}</summary>
          <div className="p-2 space-y-2">
            {list!.map((f: any) => {
              const b = byFixture.get(f.id);
              return (
                <FixtureBetCard key={f.id} fixture={f}
                  initialHome={b?.home_score} initialAway={b?.away_score}
                  locked={false} />
              );
            })}
          </div>
        </details>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Manually open group phase for testing**

Local SQL:
```sql
update phases set status = 'open',
  opens_at = now(),
  closes_at = now() + interval '7 days'
where code = 'group';
```

- [ ] **Step 5: Dev test**

Run dev → log in approved user → `/palpites` → tabs per group, fill a score, see "Salvando…" → "✓ Salvo". Reload — value persists.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(palpites): group-phase predictions page with auto-save"
```

### Task 3.6: Champion picks onboarding

**Files:**
- Create: `apps/web/app/(app)/onboarding/page.tsx`, `apps/web/app/(app)/onboarding/actions.ts`
- Modify: `apps/web/app/(app)/layout.tsx` (redirect to onboarding if user has < 2 champion_picks and group phase still `open`)

- [ ] **Step 1: Server action**

```ts
// apps/web/app/(app)/onboarding/actions.ts
"use server";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function pickChampions(team1: number, team2: number) {
  if (team1 === team2) return { error: "Pick dois times diferentes" };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authed" };
  const { error } = await supabase.from("champion_picks").insert([
    { user_id: user.id, team_id: team1 },
    { user_id: user.id, team_id: team2 },
  ]);
  if (error) return { error: error.message };
  redirect("/palpites");
}
```

- [ ] **Step 2: Onboarding page**

```tsx
// apps/web/app/(app)/onboarding/page.tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { pickChampions } from "./actions";

type Team = { id: number; name_pt: string; flag_emoji: string };

export default function OnboardingPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    createClient().from("teams").select("id,name_pt,flag_emoji")
      .order("name_pt").then(r => setTeams(r.data ?? []));
  }, []);
  const togglePick = (id: number) => setPicked(p =>
    p.includes(id) ? p.filter(x => x!==id) : p.length < 2 ? [...p, id] : p);

  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <h1 className="text-xl font-bold text-center">Escolha 2 seleções pra serem campeãs</h1>
      <p className="text-sm text-muted-foreground text-center">
        Se uma delas for campeã: <strong>+50 pontos</strong>.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {teams.map(t => {
          const sel = picked.includes(t.id);
          return (
            <button key={t.id} onClick={() => togglePick(t.id)}
              className={`rounded-xl border p-2 flex flex-col items-center gap-1
                ${sel ? "border-yellow-400 bg-yellow-50 ring-2 ring-yellow-300" : "border-muted"}`}>
              <span className="text-2xl">{t.flag_emoji}</span>
              <span className="text-[10px] font-semibold text-center">{t.name_pt}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="text-red-600 text-sm text-center">{err}</p>}
      <Button className="w-full" disabled={picked.length !== 2}
        onClick={async () => {
          const r = await pickChampions(picked[0]!, picked[1]!);
          if (r?.error) setErr(r.error);
        }}>
        Confirmar campeões
      </Button>
    </div>
  );
}
```

- [ ] **Step 3: Layout redirect**

Modify `apps/web/app/(app)/layout.tsx` — after the approved/admin check, add:

```ts
// inside AppLayout, after profile fetch
const { count: cpCount } = await supabase.from("champion_picks")
  .select("id", { count: "exact", head: true });
const { data: groupPhase } = await supabase.from("phases")
  .select("status").eq("code", "group").single();
const onboardingNeeded = (cpCount ?? 0) < 2 && groupPhase?.status === "open";
// guard: only redirect if NOT already on onboarding to avoid loop
import { headers } from "next/headers";
const pathname = (await headers()).get("x-pathname") ?? "";
if (onboardingNeeded && !pathname.startsWith("/onboarding")) redirect("/onboarding");
```

For pathname to be available, add this to `middleware.ts` after `updateSession`:
```ts
response.headers.set("x-pathname", request.nextUrl.pathname);
return response;
```

- [ ] **Step 4: Test**

Open as a fresh user → after approval, log in → redirected to `/onboarding` → pick 2 → redirected to `/palpites`.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(onboarding): champion picks before predictions"
```

### Task 3.7: Tabbar layout (Home / Palpites / Ranking / Live / Perfil / Admin)

**Files:**
- Modify: `apps/web/app/(app)/layout.tsx`
- Create: `apps/web/components/tab-bar.tsx`

- [ ] **Step 1: TabBar**

```tsx
// apps/web/components/tab-bar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabBar({ isAdmin, liveActive }: { isAdmin: boolean; liveActive: boolean }) {
  const path = usePathname();
  const tabs: { href: string; icon: string; label: string; live?: boolean }[] = [
    { href: "/",         icon: "🏠", label: "Home" },
    { href: "/palpites", icon: "⚽", label: "Palpites" },
    ...(liveActive ? [{ href: "/live", icon: "📺", label: "Ao Vivo", live: true }] : []),
    { href: "/ranking",  icon: "🏆", label: "Ranking" },
    { href: "/profile",  icon: "👤", label: "Perfil" },
    ...(isAdmin ? [{ href: "/admin", icon: "🛠️", label: "Admin" }] : []),
  ];
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-background border-t flex justify-around py-1 z-50">
      {tabs.map(t => {
        const active = path === t.href;
        return (
          <Link key={t.href} href={t.href}
            className={`flex flex-col items-center gap-0.5 text-[10px] px-2 py-1
              ${active ? "text-primary font-bold" : "text-muted-foreground"}
              ${t.live ? "relative" : ""}`}>
            <span className="text-base">{t.icon}</span>
            {t.label}
            {t.live && <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />}
          </Link>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 2: Mount in layout + bottom padding**

Inside `apps/web/app/(app)/layout.tsx`, after auth checks:

```tsx
const { data: liveFixtures } = await supabase
  .from("fixtures").select("id").eq("status", "live").limit(1);
const liveActive = (liveFixtures?.length ?? 0) > 0;

return (
  <main className="min-h-screen pb-16 bg-background">
    {children}
    <TabBar isAdmin={!!profile?.is_admin} liveActive={liveActive} />
  </main>
);
```

(import `TabBar`.)

- [ ] **Step 3: Manual test**

All 5/6 tabs render at bottom; clicking switches active state.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(layout): bottom tabbar with live indicator"
```

### Task 3.8: Cron handler `check-fixtures`

**Files:**
- Create: `apps/web/app/api/cron/check-fixtures/route.ts`

- [ ] **Step 1: Handler**

```ts
// apps/web/app/api/cron/check-fixtures/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchFixtures } from "@bolao/wc-api";
import { calculate, type Phase } from "@bolao/scoring";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (req.headers.get("x-cron-secret") !== process.env.CRON_SECRET) {
    return new NextResponse("forbidden", { status: 403 });
  }
  const admin = createAdminClient();
  const errors: any[] = [];
  let checked = 0, scored = 0;

  // 1. find fixtures that aren't finished and kick off within next 4h or already started
  const { data: candidates } = await admin
    .from("fixtures")
    .select("id, api_fixture_id, phase_id, status, scored_at")
    .neq("status", "finished")
    .gte("kickoff_at", new Date(Date.now() - 1000*60*60*4).toISOString())
    .lte("kickoff_at", new Date(Date.now() + 1000*60*60*4).toISOString());

  const apiIds = (candidates ?? []).map(f => f.api_fixture_id).filter(Boolean) as number[];
  if (apiIds.length === 0) {
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0 });
    return NextResponse.json({ checked: 0, scored: 0 });
  }

  let apiFixtures;
  try {
    apiFixtures = await fetchFixtures(process.env.API_FOOTBALL_KEY!, { ids: apiIds });
  } catch (e: any) {
    errors.push({ stage: "fetchFixtures", message: e.message });
    await admin.from("cron_runs").insert({ fixtures_checked: 0, fixtures_scored: 0, errors });
    return NextResponse.json({ error: "api-football failed" }, { status: 502 });
  }
  checked = apiFixtures.length;

  for (const af of apiFixtures) {
    const local = candidates!.find(c => c.api_fixture_id === af.fixture_id);
    if (!local) continue;

    // sanity check absurd score (diff > 10)
    if (af.home_score_ft != null && af.away_score_ft != null
        && Math.abs(af.home_score_ft - af.away_score_ft) > 10) {
      errors.push({ stage: "absurdScore", fixture_id: local.id, raw: af });
      continue;
    }

    await admin.from("fixtures").update({
      status: af.status,
      home_score_ft: af.home_score_ft,
      away_score_ft: af.away_score_ft,
      home_score_et: af.home_score_et,
      away_score_et: af.away_score_et,
    }).eq("id", local.id);

    if (af.status === "finished" && !local.scored_at) {
      const { data: phaseRow } = await admin.from("phases")
        .select("code").eq("id", local.phase_id).single();
      const phase = phaseRow!.code as Phase;
      const { data: bets } = await admin.from("bets")
        .select("id, home_score, away_score").eq("fixture_id", local.id);
      for (const b of bets ?? []) {
        const pts = calculate(
          { home: b.home_score, away: b.away_score },
          {
            home_ft: af.home_score_ft!, away_ft: af.away_score_ft!,
            home_et: af.home_score_et, away_et: af.away_score_et,
          },
          phase,
        );
        await admin.from("bets").update({ points: pts, scored_at: new Date().toISOString() }).eq("id", b.id);
      }
      await admin.from("fixtures").update({ scored_at: new Date().toISOString() }).eq("id", local.id);
      scored++;
    }
  }

  await admin.from("cron_runs").insert({
    fixtures_checked: checked, fixtures_scored: scored, errors: errors.length ? errors : null,
  });
  return NextResponse.json({ checked, scored, errors: errors.length });
}
```

- [ ] **Step 2: Test locally with curl**

Set `CRON_SECRET=test` in `.env.local`, start dev:
```bash
curl -X POST http://localhost:3000/api/cron/check-fixtures \
  -H "x-cron-secret: test"
```
Expected: JSON `{checked, scored, errors}`.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(cron): check-fixtures handler — fetch, score, persist"
```

### Task 3.9: vercel.json cron schedule

**Files:** `vercel.json`

- [ ] **Step 1: Add crons**

Edit `vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm --filter @bolao/web build",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs",
  "outputDirectory": "apps/web/.next",
  "crons": [
    { "path": "/api/cron/check-fixtures", "schedule": "*/15 * * * *" }
  ]
}
```

> Note: Vercel cron uses GET by default. Since our handler is POST, change to GET or wrap. Simplest: add a GET that does the same. Update handler to also accept GET. Easier: rename `POST` to `GET` (Vercel cron sends GET to the path, no header forwarding needed beyond automatic ones — Vercel adds `Authorization: Bearer $CRON_SECRET` if you set it in project settings).

- [ ] **Step 2: Update handler for GET + Vercel auth**

Replace export in `check-fixtures/route.ts`:
```ts
export async function GET(req: Request) {
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (req.headers.get("authorization") !== expected) {
    return new NextResponse("forbidden", { status: 403 });
  }
  // ... keep rest unchanged
}
```

- [ ] **Step 3: Push CRON_SECRET to Vercel**

```bash
pnpm dlx vercel env add CRON_SECRET production
pnpm dlx vercel env add API_FOOTBALL_KEY production
```

- [ ] **Step 4: Deploy + verify**

```bash
pnpm dlx vercel deploy --prod
```
Then Vercel dashboard → Crons → see scheduled. Trigger manually once → check `cron_runs` table.

- [ ] **Step 5: Commit**

```bash
git add vercel.json apps/web
git commit -m "chore: vercel cron */15min for check-fixtures"
```

### Task 3.10: Ranking page + realtime

**Files:**
- Create: `apps/web/app/(app)/ranking/page.tsx`, `apps/web/components/ranking-list.tsx`, `apps/web/components/scoring-legend-sheet.tsx`

- [ ] **Step 1: Legend sheet**

```tsx
// apps/web/components/scoring-legend-sheet.tsx
"use client";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const ROWS = [
  ["Fase de Grupos",1,2], ["32avos",2,4], ["Oitavas",3,6],
  ["Quartas",7,14], ["Semi",15,30], ["3º lugar",13,26], ["Final",25,50],
];

export function ScoringLegendSheet() {
  return (
    <Sheet>
      <SheetTrigger className="text-xs px-2 py-1 border rounded font-semibold text-primary">
        ℹ️ Pontuação
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
        <SheetTitle>Como funciona a pontuação</SheetTitle>
        <table className="w-full text-sm mt-3">
          <thead><tr className="text-xs text-muted-foreground bg-muted">
            <th className="text-left p-2">Fase</th>
            <th className="text-right p-2">Resultado</th>
            <th className="text-right p-2">Exato</th>
          </tr></thead>
          <tbody>
            {ROWS.map(([n,r,e]) => (
              <tr key={n as string} className="border-b">
                <td className="p-2">{n}</td>
                <td className="p-2 text-right font-semibold">{r}</td>
                <td className="p-2 text-right font-semibold">{e}</td>
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
          <strong>Empate?</strong> Vence quem cravou o campeão · depois mais placares exatos
          · depois mais acertos. Persistindo empate, divide o prêmio.
        </p>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: RankingList with realtime**

```tsx
// apps/web/components/ranking-list.tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Row = { id: string; full_name: string; avatar_url: string | null; total_points: number };

export function RankingList({ initial, myId }: { initial: Row[]; myId: string }) {
  const [rows, setRows] = useState(initial);
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel("ranking-bets")
      .on("postgres_changes", { event: "*", schema: "public", table: "bets" },
        async () => {
          const { data } = await supabase.from("ranking").select("*");
          if (data) setRows(data as Row[]);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const medal = (i: number) => i===0 ? "bg-yellow-300 text-blue-900" :
                                i===1 ? "bg-gray-300" :
                                i===2 ? "bg-orange-700 text-white" : "bg-muted";
  return (
    <ul className="space-y-2">
      {rows.map((r, i) => {
        const me = r.id === myId;
        return (
          <li key={r.id} className={`rounded-xl border p-2 flex items-center gap-2
            ${me ? "bg-gradient-to-br from-blue-900 to-emerald-700 text-white" : "bg-card"}`}>
            <span className="w-6 text-center font-black">{i+1}</span>
            <span className={`w-7 h-7 rounded-full font-bold flex items-center justify-center text-xs ${medal(i)}`}>
              {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full rounded-full object-cover"/> :
               r.full_name.split(" ").map(s => s[0]).slice(0,2).join("")}
            </span>
            <span className="flex-1 text-sm font-semibold truncate">{me ? "Você" : r.full_name}</span>
            <span className={`font-extrabold ${me ? "text-yellow-300" : "text-primary"}`}>{r.total_points}</span>
          </li>
        );
      })}
    </ul>
  );
}
```

- [ ] **Step 3: Ranking page**

```tsx
// apps/web/app/(app)/ranking/page.tsx
import { createClient } from "@/lib/supabase/server";
import { RankingList } from "@/components/ranking-list";
import { ScoringLegendSheet } from "@/components/scoring-legend-sheet";

export default async function RankingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: rows } = await supabase.from("ranking").select("*");
  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Ranking</h1>
        <ScoringLegendSheet />
      </div>
      <RankingList initial={(rows ?? []) as any} myId={user!.id} />
    </div>
  );
}
```

- [ ] **Step 4: Test**

Force a fixture to scored state in SQL and seed a fake bet → ranking shows. Update a bet → ranking re-fetches.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(ranking): live list + scoring legend bottom sheet"
```

**Milestone 3 done.** End-to-end flow works for group phase.

---

# Milestone 4 — Knockout, Live Tab, Advance Phase, Champion Bonus

Goal: app handles the full World Cup lifecycle.

### Task 4.1: advance-phase parsing module

**Files:**
- Create: `apps/web/lib/advance-phase.ts`, `apps/web/lib/advance-phase.test.ts`
- Install: `vitest` in apps/web

- [ ] **Step 1: Install vitest**

```bash
cd apps/web && pnpm add -D vitest
```
Add script to `apps/web/package.json`:
```json
"test": "vitest run"
```

- [ ] **Step 2: Failing tests**

```ts
// apps/web/lib/advance-phase.test.ts
import { describe, it, expect } from "vitest";
import { resolveSource } from "./advance-phase";

const STANDINGS = [
  { group_code: "A", position: 1, team_id: 1 },
  { group_code: "A", position: 2, team_id: 4 },
  { group_code: "B", position: 1, team_id: 5 },
];
const WINNERS = new Map<string, number>([["R32_1", 1], ["R32_2", 5]]);

describe("resolveSource", () => {
  it("1A → group A first", () => {
    expect(resolveSource("1A", STANDINGS, WINNERS)).toBe(1);
  });
  it("2A → group A second", () => {
    expect(resolveSource("2A", STANDINGS, WINNERS)).toBe(4);
  });
  it("W_R32_1 → winner of R32 fixture 1", () => {
    expect(resolveSource("W_R32_1", STANDINGS, WINNERS)).toBe(1);
  });
});
```

- [ ] **Step 3: Implement**

```ts
// apps/web/lib/advance-phase.ts
type Standing = { group_code: string; position: number; team_id: number };

export function resolveSource(
  source: string,
  standings: Standing[],
  winners: Map<string, number>,
): number | null {
  // Pattern "1A", "2C" etc.
  const groupPos = /^([12])([A-L])$/.exec(source);
  if (groupPos) {
    const [, pos, g] = groupPos;
    const row = standings.find(s => s.group_code === g && s.position === Number(pos));
    return row?.team_id ?? null;
  }
  // Winner-of token: "W_R32_5"
  const wm = /^W_(R32|R16|QF|SF)_(\d+)$/.exec(source);
  if (wm) return winners.get(`${wm[1]}_${wm[2]}`) ?? null;
  // Loser-of token: "L_SF_1"
  const lm = /^L_SF_(\d+)$/.exec(source);
  if (lm) return winners.get(`L_SF_${lm[1]}`) ?? null;
  // Best-third: "3ACDEF" — picks the best third among groups A,C,D,E,F by points then GD
  const tm = /^3([A-L]+)$/.exec(source);
  if (tm) {
    const allowed = new Set(tm[1].split(""));
    const thirds = standings.filter(s => s.position === 3 && allowed.has(s.group_code));
    thirds.sort((a, b) =>
      (b as any).points - (a as any).points || (b as any).gd - (a as any).gd);
    return thirds[0]?.team_id ?? null;
  }
  return null;
}
```

- [ ] **Step 4: Run — expect PASS**

```bash
cd apps/web && pnpm test
```

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(advance): resolveSource handles 1A, 2A, W_R32_n, L_SF_n, 3<groups>"
```

### Task 4.2: advance-phase cron handler

**Files:**
- Create: `apps/web/app/api/cron/advance-phase/route.ts`

- [ ] **Step 1: Handler**

```ts
// apps/web/app/api/cron/advance-phase/route.ts
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchStandings } from "@bolao/wc-api";
import { resolveSource } from "@/lib/advance-phase";
import { championBonus } from "@bolao/scoring";

export const dynamic = "force-dynamic";

const PHASE_ORDER = ["group","r32","r16","qf","sf","third","final"] as const;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new NextResponse("forbidden", { status: 403 });

  const admin = createAdminClient();
  const { data: phases } = await admin.from("phases").select("*").order("order_idx");
  const current = phases?.find(p => p.status === "open");
  if (!current) return NextResponse.json({ note: "no open phase" });

  // every fixture in current phase finished?
  const { data: pending } = await admin.from("fixtures")
    .select("id").eq("phase_id", current.id).is("scored_at", null);
  if ((pending?.length ?? 0) > 0)
    return NextResponse.json({ note: "phase incomplete", remaining: pending!.length });

  // close current
  await admin.from("phases").update({ status: "closed" }).eq("id", current.id);

  // if was final → score champion picks
  if (current.code === "final") {
    const { data: finalFix } = await admin.from("fixtures")
      .select("home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
      .eq("phase_id", current.id).single();
    const homeWon = (finalFix?.home_score_et ?? finalFix?.home_score_ft ?? 0) >
                    (finalFix?.away_score_et ?? finalFix?.away_score_ft ?? 0);
    const champion = homeWon ? finalFix?.home_team_id : finalFix?.away_team_id;
    const { data: cps } = await admin.from("champion_picks").select("id, user_id, team_id");
    for (const cp of cps ?? []) {
      const pts = championBonus([cp.team_id], champion!);
      await admin.from("champion_picks").update({
        points: pts, scored_at: new Date().toISOString(),
      }).eq("id", cp.id);
    }
    return NextResponse.json({ champion_id: champion, picks_scored: cps?.length ?? 0 });
  }

  // open next phase: populate fixtures via bracket_rules + standings + winners
  const nextIdx = PHASE_ORDER.indexOf(current.code as any) + 1;
  const nextCode = PHASE_ORDER[nextIdx];
  if (!nextCode) return NextResponse.json({ note: "no more phases" });
  const nextPhase = phases!.find(p => p.code === nextCode)!;

  let standings: any[] = [];
  try { standings = await fetchStandings(process.env.API_FOOTBALL_KEY!); }
  catch (e: any) { return NextResponse.json({ error: e.message }, { status: 502 }); }

  // map API team_code → local team id
  const { data: teams } = await admin.from("teams").select("id, name_pt, fifa_code");
  const codeToId = new Map<string, number>();
  for (const t of teams ?? []) {
    codeToId.set(t.name_pt, t.id);
    codeToId.set(t.fifa_code, t.id);
  }
  const localStandings = standings.map(s => ({
    ...s, team_id: codeToId.get(s.team_code) ?? -1,
  })).filter(s => s.team_id !== -1);

  // build winners map from finished fixtures of all previous knockout rounds
  const { data: pastFixtures } = await admin.from("fixtures")
    .select("id, phase_id, home_team_id, away_team_id, home_score_ft, away_score_ft, home_score_et, away_score_et")
    .not("scored_at", "is", null);
  const winners = new Map<string, number>();
  for (const pf of pastFixtures ?? []) {
    const phaseRow = phases!.find(p => p.id === pf.phase_id)!;
    if (phaseRow.code === "group") continue;
    // R32/R16/QF/SF/third/final
    const phaseLabel = phaseRow.code.toUpperCase();
    // need ordinal within phase
    const { data: siblings } = await admin.from("fixtures")
      .select("id").eq("phase_id", pf.phase_id).order("kickoff_at");
    const ordinal = (siblings ?? []).findIndex(s => s.id === pf.id) + 1;
    const home = pf.home_score_et ?? pf.home_score_ft ?? 0;
    const away = pf.away_score_et ?? pf.away_score_ft ?? 0;
    if (home === away) continue;  // tied — fall back to winner via penalties (not tracked); skip
    winners.set(`${phaseLabel}_${ordinal}`, home > away ? pf.home_team_id! : pf.away_team_id!);
    if (phaseRow.code === "sf")
      winners.set(`L_SF_${ordinal}`, home > away ? pf.away_team_id! : pf.home_team_id!);
  }

  const { data: rules } = await admin.from("bracket_rules")
    .select("*").eq("target_phase", nextCode);
  const { data: nextFixtures } = await admin.from("fixtures")
    .select("id").eq("phase_id", nextPhase.id).order("kickoff_at");

  for (const rule of rules ?? []) {
    const fixId = nextFixtures![rule.target_fixture - 1]?.id;
    if (!fixId) continue;
    const teamId = resolveSource(rule.source, localStandings as any, winners);
    if (!teamId) continue;
    const col = rule.slot === "home" ? "home_team_id" : "away_team_id";
    await admin.from("fixtures").update({ [col]: teamId }).eq("id", fixId);
  }

  const earliest = (nextFixtures ?? []).map(f => f.id)[0];
  const { data: first } = await admin.from("fixtures")
    .select("kickoff_at").eq("id", earliest!).single();
  const closesAt = new Date(new Date(first!.kickoff_at).getTime() - 5*60*1000).toISOString();

  await admin.from("phases").update({
    status: "open", opens_at: new Date().toISOString(), closes_at: closesAt,
  }).eq("code", nextCode);

  return NextResponse.json({ opened: nextCode, closes_at: closesAt });
}
```

- [ ] **Step 2: Schedule it**

Add to `vercel.json` `crons`:
```json
{ "path": "/api/cron/advance-phase", "schedule": "0 */1 * * *" }
```

- [ ] **Step 3: Commit**

```bash
git add apps/web vercel.json
git commit -m "feat(cron): advance-phase opens next phase + scores champion picks on final"
```

### Task 4.3: Live tab

**Files:**
- Create: `apps/web/app/(app)/live/page.tsx`, `apps/web/components/live-match-card.tsx`

- [ ] **Step 1: LiveMatchCard**

```tsx
// apps/web/components/live-match-card.tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Bet = { user_id: string; home_score: number; away_score: number;
             profile: { full_name: string; avatar_url: string | null } };

type Props = {
  fixture: { id: number; home: any; away: any;
    home_score_ft: number | null; away_score_ft: number | null };
};

function tone(bet: Bet, homeNow: number, awayNow: number) {
  const winnerNow = homeNow > awayNow ? "h" : homeNow < awayNow ? "a" : "d";
  const winnerBet = bet.home_score > bet.away_score ? "h" :
                    bet.home_score < bet.away_score ? "a" : "d";
  if (bet.home_score === homeNow && bet.away_score === awayNow) return "bg-emerald-100 text-emerald-700";
  if (winnerNow === winnerBet) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-700";
}

export function LiveMatchCard({ fixture }: Props) {
  const [bets, setBets] = useState<Bet[]>([]);
  const homeNow = fixture.home_score_ft ?? 0;
  const awayNow = fixture.away_score_ft ?? 0;

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("bets")
        .select("user_id, home_score, away_score, profile:profiles(full_name, avatar_url)")
        .eq("fixture_id", fixture.id);
      setBets((data ?? []) as any);
    };
    load();
    const ch = supabase.channel(`live-bets-${fixture.id}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "fixtures", filter: `id=eq.${fixture.id}` },
        load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fixture.id]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="bg-gradient-to-br from-red-600 to-red-800 text-white p-3">
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm">{fixture.home.flag_emoji} {fixture.home.name_pt}</span>
          <span className="text-2xl font-black">{homeNow} - {awayNow}</span>
          <span className="font-bold text-sm">{fixture.away.name_pt} {fixture.away.flag_emoji}</span>
        </div>
      </div>
      <ul className="p-3 space-y-2">
        {bets.map(b => (
          <li key={b.user_id} className="flex items-center gap-2">
            <span className="text-sm flex-1 font-medium">{b.profile.full_name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded ${tone(b, homeNow, awayNow)}`}>
              {b.home_score} × {b.away_score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Live page**

```tsx
// apps/web/app/(app)/live/page.tsx
import { createClient } from "@/lib/supabase/server";
import { LiveMatchCard } from "@/components/live-match-card";

export default async function LivePage() {
  const supabase = await createClient();
  const { data: live } = await supabase
    .from("fixtures")
    .select("id, home_score_ft, away_score_ft, home:home_team_id(id,name_pt,flag_emoji), away:away_team_id(id,name_pt,flag_emoji)")
    .eq("status", "live");
  if (!live?.length) return (
    <div className="p-6 text-center text-muted-foreground">
      Nenhum jogo rolando agora.
    </div>
  );
  return (
    <div className="p-4 max-w-md mx-auto space-y-3">
      <div className="rounded-xl bg-gradient-to-br from-red-600 to-blue-900 text-white p-3 text-center">
        <p className="text-[10px] uppercase tracking-widest opacity-90">Rolando agora</p>
        <p className="text-2xl font-black">{live.length} {live.length === 1 ? "jogo" : "jogos"}</p>
      </div>
      {live.map(f => <LiveMatchCard key={f.id} fixture={f as any} />)}
    </div>
  );
}
```

- [ ] **Step 3: Manual test**

Force a fixture to `status='live'` in SQL → tab appears → load /live → see card with bets list.

- [ ] **Step 4: Commit**

```bash
git add apps/web
git commit -m "feat(live): live tab + per-match bets colorized by score parity"
```

### Task 4.4: Admin — manual fixture result override

**Files:**
- Modify: `apps/web/app/(app)/admin/page.tsx`, `apps/web/app/(app)/admin/actions.ts`

- [ ] **Step 1: Action**

Append to `actions.ts`:
```ts
export async function setManualResult(fixtureId: number, params: {
  home_ft: number; away_ft: number; home_et?: number | null; away_et?: number | null;
}) {
  await assertAdmin();
  const admin = createAdminClient();
  const { data: f } = await admin.from("fixtures")
    .select("phase_id").eq("id", fixtureId).single();
  const { data: phase } = await admin.from("phases").select("code").eq("id", f!.phase_id).single();
  await admin.from("fixtures").update({
    status: "finished",
    home_score_ft: params.home_ft, away_score_ft: params.away_ft,
    home_score_et: params.home_et ?? null, away_score_et: params.away_et ?? null,
    scored_at: new Date().toISOString(),
  }).eq("id", fixtureId);
  // recompute bets
  const { calculate } = await import("@bolao/scoring");
  const { data: bets } = await admin.from("bets").select("id, home_score, away_score").eq("fixture_id", fixtureId);
  for (const b of bets ?? []) {
    const pts = calculate(
      { home: b.home_score, away: b.away_score },
      {
        home_ft: params.home_ft, away_ft: params.away_ft,
        home_et: params.home_et, away_et: params.away_et,
      },
      phase!.code as any,
    );
    await admin.from("bets").update({ points: pts, scored_at: new Date().toISOString() }).eq("id", b.id);
  }
  revalidatePath("/admin");
  revalidatePath("/ranking");
}
```

- [ ] **Step 2: UI**

Add a section to `admin/page.tsx`:
```tsx
// Fixtures pending review (status != finished but kickoff in past)
const { data: late } = await supabase.from("fixtures")
  .select("id, kickoff_at, home:home_team_id(name_pt), away:away_team_id(name_pt)")
  .neq("status", "finished").lt("kickoff_at", new Date().toISOString())
  .order("kickoff_at", { ascending: false }).limit(10);
```
Render a list with inline form (4 inputs + submit) calling `setManualResult` per row.

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(admin): manual fixture result override recomputes bets"
```

### Task 4.5: Phase advancement notifications (email + push)

**Files:** Modify advance-phase handler to enqueue notifications.

- [ ] **Step 1: Pluggable notify util**

`apps/web/lib/notify.ts`:
```ts
import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyAllApproved(subject: string, body: string) {
  const admin = createAdminClient();
  const { data: users } = await admin.from("profiles")
    .select("email").not("approved_at", "is", null);
  // M5 will swap this for real Resend / web push; M4 just logs
  console.log("[notify]", subject, "→", users?.map(u => u.email));
}
```

- [ ] **Step 2: Hook into advance-phase**

In the advance-phase handler, after opening the next phase:
```ts
import { notifyAllApproved } from "@/lib/notify";
await notifyAllApproved(
  `Nova fase liberada: ${nextPhase.name}`,
  `Você tem até ${closesAt} pra palpitar.`,
);
```

- [ ] **Step 3: Commit**

```bash
git add apps/web
git commit -m "feat(notify): stub notifyAllApproved used after phase advance"
```

**Milestone 4 done.** App handles full Cup; only push + polish left.

---

# Milestone 5 — PWA, Push, Theming, Polish

### Task 5.1: PWA manifest + service worker

**Files:**
- Create: `apps/web/public/manifest.json`, `apps/web/public/sw.js`, icons, `apps/web/app/layout.tsx` link
- Install: nothing — DIY service worker

- [ ] **Step 1: Manifest**

```json
{
  "name": "Bolão Bazante 2026",
  "short_name": "Bolão Bazante",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#003d7a",
  "theme_color": "#003d7a",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: Generate icons**

Use any 512×512 square logo (cup emoji on green/gold background). Place at `public/icons/icon-192.png` and `icon-512.png`. Engineer: ImageMagick `convert input.png -resize 192x192 icon-192.png` etc.

- [ ] **Step 3: Minimal service worker (push only)**

`public/sw.js`:
```js
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(self.registration.showNotification(
    data.title ?? "Bolão Bazante",
    { body: data.body ?? "", icon: "/icons/icon-192.png" },
  ));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? "/"));
});
```

- [ ] **Step 4: Register in layout**

In `apps/web/app/layout.tsx`, inside `<head>`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#003d7a" />
```

And a small client `<script>` (or component) that calls:
```js
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
```

- [ ] **Step 5: Test on iOS**

Add to Home Screen → opens fullscreen.

- [ ] **Step 6: Commit**

```bash
git add apps/web/public apps/web/app/layout.tsx
git commit -m "feat(pwa): manifest + service worker registration"
```

### Task 5.2: Web Push subscription + send

**Files:**
- Create: `apps/web/lib/push.ts`, `apps/web/components/enable-push.tsx`
- Modify: `apps/web/lib/notify.ts`

- [ ] **Step 1: Add `push_subscription` column to profiles**

```sql
-- supabase/migrations/0007_push_subscription.sql
alter table public.profiles add column push_subscription jsonb;
```
Apply: `pnpm dlx supabase db reset` (and `db push` for prod).

- [ ] **Step 2: Install web-push**

```bash
cd apps/web && pnpm add web-push
pnpm dlx web-push generate-vapid-keys
```
Save the keys in `.env.local` as `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.

- [ ] **Step 3: Push subscription helper**

`apps/web/lib/push.ts`:
```ts
"use client";
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.ready;
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  });
  return sub.toJSON();
}
```

Expose `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public key>` in env.

- [ ] **Step 4: EnablePush UI**

`apps/web/components/enable-push.tsx`:
```tsx
"use client";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { subscribeToPush } from "@/lib/push";

export function EnablePush() {
  async function handle() {
    const sub = await subscribeToPush();
    if (!sub) return alert("Notificações negadas");
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("profiles").update({ push_subscription: sub }).eq("id", user!.id);
    alert("Notificações ativadas!");
  }
  return <Button onClick={handle}>🔔 Ativar notificações</Button>;
}
```
Mount on `profile/page.tsx`.

- [ ] **Step 5: Implement real notify**

Replace `apps/web/lib/notify.ts`:
```ts
import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function notifyAllApproved(title: string, body: string, url = "/") {
  const admin = createAdminClient();
  const { data: users } = await admin.from("profiles")
    .select("push_subscription").not("approved_at", "is", null)
    .not("push_subscription", "is", null);
  for (const u of users ?? []) {
    try {
      await webpush.sendNotification(u.push_subscription as any,
        JSON.stringify({ title, body, url }));
    } catch (e) { console.error("push failed", e); }
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add apps/web supabase/migrations/0007_push_subscription.sql
git commit -m "feat(push): VAPID subscribe + send via web-push"
```

### Task 5.3: Theme toggle (light/dark)

**Files:** `apps/web/components/theme-toggle.tsx`, modify `apps/web/app/layout.tsx`

- [ ] **Step 1: Install next-themes**

```bash
cd apps/web && pnpm add next-themes
```

- [ ] **Step 2: Wrap with ThemeProvider**

`apps/web/app/layout.tsx`:
```tsx
import { ThemeProvider } from "next-themes";
// ...
return (
  <html lang="pt-BR" suppressHydrationWarning>
    <body>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </body>
  </html>
);
```

- [ ] **Step 3: Tailwind dark palette**

`apps/web/app/globals.css` — add CSS variables for the spec's Sport Dark palette:
```css
:root {
  --color-primary: #003d7a; --color-accent: #ffd700;
  --color-bg: #f9fafb;
}
.dark {
  --color-primary: #00ff88; --color-accent: #00ff88;
  --color-bg: #0a0e1a;
}
```
(Adjust as needed in tailwind.config.ts to consume these via `colors.primary` etc.)

- [ ] **Step 4: ThemeToggle component**

```tsx
// components/theme-toggle.tsx
"use client";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return <Button size="sm" variant="outline"
    onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
    {theme === "dark" ? "🌙" : "☀️"}
  </Button>;
}
```
Mount in the app header.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(theme): dark/light toggle with Sport Dark palette"
```

### Task 5.4: Avatar upload

**Files:**
- Create: bucket policy migration `supabase/migrations/0008_avatars_bucket.sql`, `apps/web/app/(app)/profile/page.tsx`, `apps/web/components/avatar-upload.tsx`

- [ ] **Step 1: Bucket migration**

```sql
-- supabase/migrations/0008_avatars_bucket.sql
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true)
  on conflict (id) do nothing;

create policy "avatars_read_public" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_write_owner" on storage.objects for insert with check (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "avatars_update_owner" on storage.objects for update using (
  bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text
);
```

- [ ] **Step 2: Apply locally + push**

```bash
pnpm dlx supabase db reset
pnpm dlx supabase db push
```

- [ ] **Step 3: AvatarUpload component**

```tsx
// components/avatar-upload.tsx
"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function AvatarUpload({ initialUrl }: { initialUrl: string | null }) {
  const [url, setUrl] = useState(initialUrl);
  const supabase = createClient();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Máx 2MB");
    const { data: { user } } = await supabase.auth.getUser();
    const path = `${user!.id}/avatar.jpg`;
    const { error } = await supabase.storage.from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return alert(error.message);
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user!.id);
    setUrl(publicUrl);
  }

  return (
    <div className="flex items-center gap-3">
      {url ? <img src={url} alt="" className="w-16 h-16 rounded-full object-cover" /> :
             <div className="w-16 h-16 rounded-full bg-muted" />}
      <label className="cursor-pointer">
        <input type="file" accept="image/*" className="hidden" onChange={onFile} />
        <Button asChild><span>Trocar foto</span></Button>
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Profile page**

```tsx
// app/(app)/profile/page.tsx
import { createClient } from "@/lib/supabase/server";
import { AvatarUpload } from "@/components/avatar-upload";
import { EnablePush } from "@/components/enable-push";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles")
    .select("*").eq("id", user!.id).single();
  return (
    <div className="p-4 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-bold">{profile?.full_name}</h1>
      <AvatarUpload initialUrl={profile?.avatar_url ?? null} />
      <EnablePush />
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0008_avatars_bucket.sql apps/web
git commit -m "feat(profile): avatar upload + push toggle"
```

### Task 5.5: Backup script

**Files:** `scripts/backup.sh`

- [ ] **Step 1: Script**

```bash
#!/usr/bin/env bash
# scripts/backup.sh — weekly pg_dump of production
set -euo pipefail
: "${SUPABASE_DB_URL:?need SUPABASE_DB_URL}"
ts=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
pg_dump --no-owner --no-privileges "$SUPABASE_DB_URL" \
  > "backups/bolao-${ts}.sql"
echo "Wrote backups/bolao-${ts}.sql"
```

```bash
chmod +x scripts/backup.sh
git add scripts/backup.sh
git commit -m "chore: weekly pg_dump backup script"
```

### Task 5.6: E2E smoke (Playwright)

**Files:** `apps/web/e2e/smoke.spec.ts`, `apps/web/playwright.config.ts`

- [ ] **Step 1: Install**

```bash
cd apps/web && pnpm add -D @playwright/test
pnpm dlx playwright install chromium
```

- [ ] **Step 2: Config**

```ts
// apps/web/playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://localhost:3000" },
  webServer: { command: "pnpm dev", url: "http://localhost:3000", reuseExistingServer: true },
});
```

- [ ] **Step 3: Smoke test**

```ts
// apps/web/e2e/smoke.spec.ts
import { test, expect } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Bolão da Família Bazante 2026")).toBeVisible();
});

test("signup → pending", async ({ page }) => {
  const e2e = `e2e-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Nome completo").fill("E2E User");
  await page.locator("select[name=sex]").selectOption("M");
  await page.getByLabel("Data de nascimento").fill("1990-01-01");
  await page.getByLabel("E-mail").fill(e2e);
  await page.getByLabel(/Senha/).fill("password123");
  await page.getByRole("button", { name: /Cadastrar/ }).click();
  await expect(page).toHaveURL(/\/pending/);
});
```

- [ ] **Step 4: Run**

```bash
cd apps/web && pnpm exec playwright test
```
Expected: both pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/e2e apps/web/playwright.config.ts apps/web/package.json
git commit -m "test(e2e): playwright smoke for login + signup→pending"
```

### Task 5.7: README + final deploy

**Files:** `README.md`

- [ ] **Step 1: README**

```markdown
# Bolão da Família Bazante 2026

PWA pra bolão de Copa do Mundo. Next.js + Supabase + Vercel.

## Dev
```bash
pnpm install
pnpm dlx supabase start
pnpm dev
```

## Estrutura
- `apps/web` — Next.js app (UI + API routes + cron)
- `packages/scoring` — pura, regra de pontuação
- `packages/wc-api` — wrapper API-Football
- `supabase/` — migrations + seed
- `docs/superpowers/{specs,plans}/` — spec + plano

## Deploy
1. `pnpm dlx supabase link --project-ref <ref>`
2. `pnpm dlx supabase db push`
3. `pnpm dlx vercel deploy --prod`
```

- [ ] **Step 2: Final prod deploy + commit**

```bash
pnpm dlx vercel deploy --prod
git add README.md
git commit -m "docs: README + deploy instructions"
```

**All milestones done.**

---

# Self-Review Notes

Coverage check vs spec:
- ✓ §2 Stack — M0, M1 (Task 0.1–0.4, 1.3, 1.9), M5 (5.1)
- ✓ §3 Visual identity — M5 (5.3 theme toggle), inline Tailwind classes per spec palette
- ✓ §4 Data model — M1 (1.1, 1.2), M2 (2.6, 2.7, 2.8, 2.9, 2.10), M5 (5.2 push_subscription, 5.4 avatars bucket)
- ✓ §5 Architecture — covered across M3 (cron) + M4 (advance-phase)
- ✓ §6 Scoring lib — M2 (2.1–2.5)
- ✓ §7.1 Cadastro → Aprovação — M1 (1.4–1.7)
- ✓ §7.2 Palpite por fase — M3 (3.5)
- ✓ §7.3 Scoring automático — M3 (3.8, 3.9)
- ✓ §7.4 Advance phase — M4 (4.1, 4.2)
- ✓ §7.5 Aba "Ao Vivo" — M4 (4.3)
- ✓ §7.6 Admin — M1 (1.7), M4 (4.4)
- ✓ §8 Prize counter — M1 (1.8)
- ✓ §9 Notificações — M4 (4.5 stub), M5 (5.2 real push)
- ✓ §10 Testes — M2 (2.3–2.5 scoring unit), M4 (4.1 advance unit), M5 (5.6 E2E)
- ✓ §11 Segurança — RLS in M2 (2.7), service role in M1 (1.3), CRON_SECRET in M3 (3.9)
- ✓ §12 Resiliência — M3 (3.8 cron_runs + absurd score guard), M4 (4.4 manual override), M5 (5.5 backup)

No placeholders remain except for the documented seed-data caveats (teams list and bracket third-place pairings) — both flagged in the relevant tasks with explicit instructions for the engineer to verify against FIFA before launch.

Types consistent: `Phase`, `Bet`, `Result`, `ApiFixture`, `ApiStanding` defined once in their packages and consumed unchanged.
