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
