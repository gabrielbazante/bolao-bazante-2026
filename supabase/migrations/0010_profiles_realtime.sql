-- Enable Supabase Realtime broadcasts for profiles UPDATEs so the /pending
-- page can detect admin approval instantly (no manual refresh).
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;
