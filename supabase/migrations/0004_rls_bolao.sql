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

-- champion_picks
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

create policy "fixtures_write_admin" on public.fixtures for all using (public.is_admin());
create policy "phases_write_admin" on public.phases for all using (public.is_admin());

create policy "cron_runs_read_admin" on public.cron_runs for select using (public.is_admin());
