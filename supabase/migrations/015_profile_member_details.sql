-- Driving School App (v1) - Member profile details
--
-- Adds profile contact fields for all members and a secure self-service RPC for
-- updating profile details used by Settings -> Edit details.

alter table public.profiles
add column if not exists email text null;

alter table public.profiles
add column if not exists contact_no text null;

alter table public.profiles
add column if not exists address text null;

update public.profiles p
set email = lower(trim(u.email))
from auth.users u
where u.id = p.id
  and u.email is not null
  and (p.email is null or trim(p.email) = '');

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
  resolved_email text;
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

  select lower(trim(coalesce(u.email, '')))
  into resolved_email
  from auth.users u
  where u.id = auth.uid();

  if resolved_email = '' then
    resolved_email := null;
  end if;

  insert into public.organizations (name)
  values (organization_name)
  returning id into new_org_id;

  insert into public.profiles (id, organization_id, role, display_name, email)
  values (auth.uid(), new_org_id, 'owner', owner_display_name, resolved_email);

  insert into public.organization_settings (organization_id, logo_url)
  values (new_org_id, null)
  on conflict (organization_id) do nothing;

  return new_org_id;
end;
$$;

grant execute on function public.create_organization_for_owner(text, text) to authenticated;

create or replace function public.set_my_profile_details(
  first_name text,
  last_name text,
  email text,
  contact_no text,
  address text
)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  resolved_first text;
  resolved_last text;
  resolved_email text;
  resolved_contact text;
  resolved_address text;
  resolved_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  resolved_first := trim(coalesce(first_name, ''));
  resolved_last := trim(coalesce(last_name, ''));
  resolved_email := lower(trim(coalesce(email, '')));
  resolved_contact := trim(coalesce(contact_no, ''));
  resolved_address := trim(coalesce(address, ''));

  if resolved_first = '' then
    raise exception 'first_name_required';
  end if;

  if resolved_last = '' then
    raise exception 'last_name_required';
  end if;

  if resolved_email = '' then
    raise exception 'email_required';
  end if;

  if position('@' in resolved_email) < 2 then
    raise exception 'email_invalid';
  end if;

  if resolved_contact = '' then
    resolved_contact := null;
  end if;

  if resolved_address = '' then
    resolved_address := null;
  end if;

  resolved_display := trim(concat_ws(' ', resolved_first, resolved_last));

  update public.profiles
  set
    first_name = resolved_first,
    last_name = resolved_last,
    display_name = resolved_display,
    email = resolved_email,
    contact_no = resolved_contact,
    address = resolved_address
  where id = auth.uid();
end;
$$;

grant execute on function public.set_my_profile_details(text, text, text, text, text) to authenticated;
