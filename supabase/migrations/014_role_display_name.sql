-- Driving School App (v1) - Optional custom role display label

alter table public.profiles
add column if not exists role_display_name text null;

create or replace function public.set_my_role_display_name(new_role_display_name text)
returns void
language plpgsql
security definer
set search_path = public
set row_security = off
as $$
declare
  resolved_name text;
  my_role text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select role
  into my_role
  from public.profiles
  where id = auth.uid();

  if my_role not in ('owner', 'admin') then
    raise exception 'not_authorized';
  end if;

  resolved_name := trim(coalesce(new_role_display_name, ''));

  if resolved_name = '' then
    resolved_name := null;
  elsif char_length(resolved_name) > 40 then
    raise exception 'role_display_name_too_long';
  end if;

  update public.profiles
  set role_display_name = resolved_name
  where id = auth.uid();
end;
$$;

grant execute on function public.set_my_role_display_name(text) to authenticated;
