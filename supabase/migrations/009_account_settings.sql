-- Driving School App (v1) - Account settings + first-login password change
--
-- Adds first/last name fields and a "must_change_password" flag for instructor accounts
-- created by an owner. Also adds narrow SECURITY DEFINER RPCs for self-service updates.

alter table public.profiles
add column if not exists first_name text null;

alter table public.profiles
add column if not exists last_name text null;

alter table public.profiles
add column if not exists must_change_password boolean not null default false;

alter table public.profiles
add column if not exists password_changed_at timestamptz null;

create or replace function public.set_my_name(first_name text, last_name text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  resolved_first text;
  resolved_last text;
  resolved_display text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  resolved_first := trim(coalesce(first_name, ''));
  resolved_last := trim(coalesce(last_name, ''));

  if resolved_first = '' then
    raise exception 'first_name_required';
  end if;

  if resolved_last = '' then
    raise exception 'last_name_required';
  end if;

  resolved_display := trim(concat_ws(' ', resolved_first, resolved_last));

  update public.profiles
  set
    first_name = resolved_first,
    last_name = resolved_last,
    display_name = resolved_display
  where id = auth.uid();
end;
$$;

grant execute on function public.set_my_name(text, text) to authenticated;

create or replace function public.clear_my_avatar_url()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set avatar_url = null
  where id = auth.uid();
end;
$$;

grant execute on function public.clear_my_avatar_url() to authenticated;

create or replace function public.clear_my_must_change_password()
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set
    must_change_password = false,
    password_changed_at = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.clear_my_must_change_password() to authenticated;

