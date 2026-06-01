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
