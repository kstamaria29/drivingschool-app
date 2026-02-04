-- Fix RLS recursion on public.profiles by moving self-lookups into SECURITY DEFINER helpers.

create or replace function public.current_user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select organization_id
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

drop policy if exists "profiles_select_own_or_owner_org" on public.profiles;
create policy "profiles_select_own_or_owner_org"
on public.profiles
for select
using (
  id = auth.uid()
  or (
    public.current_user_role() = 'owner'
    and organization_id = public.current_user_organization_id()
  )
);

drop policy if exists "profiles_update_owner_org" on public.profiles;
create policy "profiles_update_owner_org"
on public.profiles
for update
using (
  public.current_user_role() = 'owner'
  and organization_id = public.current_user_organization_id()
)
with check (
  public.current_user_role() = 'owner'
  and organization_id = public.current_user_organization_id()
);

-- Ensure onboarding RPC continues to work even with RLS enabled (bypass within function).
create or replace function public.create_organization_for_owner(
  organization_name text,
  owner_display_name text
)
returns uuid
language plpgsql
security definer
set search_path = public
set row_security = off
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

