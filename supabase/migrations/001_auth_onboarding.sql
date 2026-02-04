-- Driving School App (v1) — Auth + Onboarding schema
-- Tables: organizations, profiles, organization_settings
-- RLS: organizations, profiles, organization_settings

create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  timezone text not null default 'Pacific/Auckland',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  role text not null check (role in ('owner', 'instructor')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists profiles_organization_id_idx on public.profiles (organization_id);

create table if not exists public.organization_settings (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  logo_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_organization_settings_updated_at on public.organization_settings;
create trigger set_organization_settings_updated_at
before update on public.organization_settings
for each row
execute function public.set_updated_at();

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_settings enable row level security;

drop policy if exists "organizations_select_own_org" on public.organizations;
create policy "organizations_select_own_org"
on public.organizations
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organizations.id
  )
);

drop policy if exists "organizations_update_owner" on public.organizations;
create policy "organizations_update_owner"
on public.organizations
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organizations.id
      and p.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organizations.id
      and p.role = 'owner'
  )
);

drop policy if exists "organizations_delete_owner" on public.organizations;
create policy "organizations_delete_owner"
on public.organizations
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organizations.id
      and p.role = 'owner'
  )
);

drop policy if exists "profiles_select_own_or_owner_org" on public.profiles;
create policy "profiles_select_own_or_owner_org"
on public.profiles
for select
using (
  id = auth.uid()
  or exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = profiles.organization_id
      and p.role = 'owner'
  )
);

drop policy if exists "profiles_update_owner_org" on public.profiles;
create policy "profiles_update_owner_org"
on public.profiles
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = profiles.organization_id
      and p.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = profiles.organization_id
      and p.role = 'owner'
  )
);

drop policy if exists "organization_settings_select_own_org" on public.organization_settings;
create policy "organization_settings_select_own_org"
on public.organization_settings
for select
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organization_settings.organization_id
  )
);

drop policy if exists "organization_settings_insert_owner" on public.organization_settings;
create policy "organization_settings_insert_owner"
on public.organization_settings
for insert
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organization_settings.organization_id
      and p.role = 'owner'
  )
);

drop policy if exists "organization_settings_update_owner" on public.organization_settings;
create policy "organization_settings_update_owner"
on public.organization_settings
for update
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organization_settings.organization_id
      and p.role = 'owner'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organization_settings.organization_id
      and p.role = 'owner'
  )
);

drop policy if exists "organization_settings_delete_owner" on public.organization_settings;
create policy "organization_settings_delete_owner"
on public.organization_settings
for delete
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id = organization_settings.organization_id
      and p.role = 'owner'
  )
);

create or replace function public.create_organization_for_owner(
  organization_name text,
  owner_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if trim(coalesce(organization_name, '')) = '' then
    raise exception 'organization_name_required';
  end if;

  if trim(coalesce(owner_display_name, '')) = '' then
    raise exception 'owner_display_name_required';
  end if;

  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'profile_already_exists';
  end if;

  insert into public.organizations (name)
  values (organization_name)
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, role, display_name)
  values (auth.uid(), new_org_id, 'owner', owner_display_name);

  insert into public.organization_settings (organization_id, logo_url)
  values (new_org_id, null)
  on conflict (organization_id) do nothing;

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_for_owner(text, text) to authenticated;

