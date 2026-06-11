-- Tighten bets RLS: writes are blocked once the phase's closes_at has passed,
-- even if status is still 'open'. The 'open' status is now decoupled from
-- "betting is allowed" — advance-phase still uses 'open' to know which phase
-- to process, but no client can mutate bets after the cutoff.

drop policy if exists "bets_write_owner_when_open" on public.bets;
drop policy if exists "bets_update_owner_when_open" on public.bets;
drop policy if exists "bets_delete_owner_when_open" on public.bets;

create policy "bets_write_owner_when_open" on public.bets for insert with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  )
);

create policy "bets_update_owner_when_open" on public.bets for update using (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  )
);

create policy "bets_delete_owner_when_open" on public.bets for delete using (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id
      and p.status = 'open'
      and (p.closes_at is null or p.closes_at > now())
  )
);
