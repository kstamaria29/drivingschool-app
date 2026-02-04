-- Driving School App (v1) - Profile avatars
-- Adds profiles.avatar_url and a narrow RPC for users to update their own avatar URL.

alter table public.profiles
add column if not exists avatar_url text null;

create or replace function public.set_my_avatar_url(new_avatar_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  update public.profiles
  set avatar_url = new_avatar_url
  where id = auth.uid();
end;
$$;

grant execute on function public.set_my_avatar_url(text) to authenticated;

