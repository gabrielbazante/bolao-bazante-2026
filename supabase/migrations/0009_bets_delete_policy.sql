-- Allow users to delete their own bets while the phase is still open.
-- Without this policy, RLS silently rejects deletes (no error, 0 rows affected).

create policy "bets_delete_owner_when_open" on public.bets for delete using (
  user_id = auth.uid()
  and exists (
    select 1 from public.fixtures f
    join public.phases p on p.id = f.phase_id
    where f.id = bets.fixture_id and p.status = 'open'
  )
);
