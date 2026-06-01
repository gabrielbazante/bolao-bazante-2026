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
  id              serial primary key,
  target_phase    text not null,
  target_fixture  int not null,
  slot            text not null check (slot in ('home','away')),
  source          text not null
);

create table public.cron_runs (
  id                bigserial primary key,
  ran_at            timestamptz not null default now(),
  fixtures_checked  int not null default 0,
  fixtures_scored   int not null default 0,
  errors            jsonb
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger bets_touch_updated
  before update on public.bets
  for each row execute function public.touch_updated_at();
