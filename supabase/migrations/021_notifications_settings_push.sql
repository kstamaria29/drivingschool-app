-- Driving School App (v1) - Notifications settings + Expo push tokens
-- Tables:
--   - notification_settings (per-profile notification preferences)
--   - push_tokens (per-device Expo push tokens)
--   - lesson_notification_deliveries (dedupe upcoming-lesson notifications)
--   - daily_digest_deliveries (dedupe daily digest notifications)
--
-- Notes:
-- - Settings are per profile (auth user) and tenant-scoped via organization_id.
-- - Deliveries tables are intended for server-side (service role) usage.

create or replace function public.lesson_reminder_offsets_are_valid(offsets int[])
returns boolean
language sql
immutable
as $$
  select
    coalesce(array_length(offsets, 1), 0) > 0
    and not exists (
      select 1
      from unnest(offsets) as offset_value
      where offset_value not in (30, 60, 180, 300, 1440, 2880)
    );
$$;

create table if not exists public.notification_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  downloads_sound_enabled boolean not null default true,
  downloads_vibration_enabled boolean not null default true,

  student_reminders_sound_enabled boolean not null default true,
  student_reminders_vibration_enabled boolean not null default true,

  lesson_reminders_enabled boolean not null default true,
  lesson_reminder_offsets_minutes int[] not null default '{60}'::int[]
    check (public.lesson_reminder_offsets_are_valid(lesson_reminder_offsets_minutes)),
  lesson_reminders_sound_enabled boolean not null default true,
  lesson_reminders_vibration_enabled boolean not null default true,

  daily_digest_enabled boolean not null default false,
  daily_digest_time time not null default '07:00:00',
  daily_digest_sound_enabled boolean not null default false,
  daily_digest_vibration_enabled boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notification_settings_organization_id_idx
on public.notification_settings (organization_id);

drop trigger if exists set_notification_settings_updated_at on public.notification_settings;
create trigger set_notification_settings_updated_at
before update on public.notification_settings
for each row
execute function public.set_updated_at();

alter table public.notification_settings enable row level security;

drop policy if exists "notification_settings_select_own" on public.notification_settings;
create policy "notification_settings_select_own"
on public.notification_settings
for select
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "notification_settings_insert_own" on public.notification_settings;
create policy "notification_settings_insert_own"
on public.notification_settings
for insert
with check (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "notification_settings_update_own" on public.notification_settings;
create policy "notification_settings_update_own"
on public.notification_settings
for update
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
)
with check (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "notification_settings_delete_own" on public.notification_settings;
create policy "notification_settings_delete_own"
on public.notification_settings
for delete
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  expo_push_token text not null check (char_length(btrim(expo_push_token)) between 10 and 255),
  platform text not null check (platform in ('ios', 'android')),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, expo_push_token)
);

create index if not exists push_tokens_profile_id_idx on public.push_tokens (profile_id);

drop trigger if exists set_push_tokens_updated_at on public.push_tokens;
create trigger set_push_tokens_updated_at
before update on public.push_tokens
for each row
execute function public.set_updated_at();

alter table public.push_tokens enable row level security;

drop policy if exists "push_tokens_select_own" on public.push_tokens;
create policy "push_tokens_select_own"
on public.push_tokens
for select
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "push_tokens_insert_own" on public.push_tokens;
create policy "push_tokens_insert_own"
on public.push_tokens
for insert
with check (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "push_tokens_update_own" on public.push_tokens;
create policy "push_tokens_update_own"
on public.push_tokens
for update
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
)
with check (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "push_tokens_delete_own" on public.push_tokens;
create policy "push_tokens_delete_own"
on public.push_tokens
for delete
using (
  profile_id = auth.uid()
  and organization_id = public.current_user_organization_id()
);

create table if not exists public.lesson_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  offset_minutes int not null check (offset_minutes > 0),
  delivered_at timestamptz not null default now(),
  unique (profile_id, lesson_id, offset_minutes)
);

create index if not exists lesson_notification_deliveries_profile_idx
on public.lesson_notification_deliveries (profile_id, delivered_at desc);

alter table public.lesson_notification_deliveries enable row level security;

create table if not exists public.daily_digest_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  digest_date date not null,
  delivered_at timestamptz not null default now(),
  unique (profile_id, digest_date)
);

create index if not exists daily_digest_deliveries_profile_idx
on public.daily_digest_deliveries (profile_id, delivered_at desc);

alter table public.daily_digest_deliveries enable row level security;

-- Server helpers (used by Edge Functions; service role bypasses RLS).

create or replace function public.get_due_lesson_reminder_events(
  window_start timestamptz,
  window_end timestamptz
)
returns table (
  organization_id uuid,
  profile_id uuid,
  lesson_id uuid,
  offset_minutes int,
  start_time timestamptz,
  student_first_name text,
  student_last_name text,
  location text,
  sound_enabled boolean,
  vibration_enabled boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    s.organization_id,
    s.profile_id,
    l.id as lesson_id,
    offset_minutes,
    l.start_time,
    st.first_name,
    st.last_name,
    l.location,
    s.lesson_reminders_sound_enabled as sound_enabled,
    s.lesson_reminders_vibration_enabled as vibration_enabled
  from public.notification_settings s
  join public.lessons l
    on l.organization_id = s.organization_id
    and l.instructor_id = s.profile_id
    and l.status = 'scheduled'
  join public.students st on st.id = l.student_id
  join unnest(s.lesson_reminder_offsets_minutes) as offset_minutes on true
  where
    s.lesson_reminders_enabled = true
    and (l.start_time - make_interval(mins => offset_minutes)) >= window_start
    and (l.start_time - make_interval(mins => offset_minutes)) < window_end
    and not exists (
      select 1
      from public.lesson_notification_deliveries d
      where d.profile_id = s.profile_id
        and d.lesson_id = l.id
        and d.offset_minutes = offset_minutes
    );
$$;

create or replace function public.get_due_daily_digest_profiles(
  window_start timestamptz
)
returns table (
  organization_id uuid,
  profile_id uuid,
  timezone text,
  local_date date,
  digest_time time,
  sound_enabled boolean,
  vibration_enabled boolean
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  with base as (
    select
      s.organization_id,
      s.profile_id,
      o.timezone,
      (window_start at time zone o.timezone) as local_now,
      s.daily_digest_time as digest_time,
      s.daily_digest_sound_enabled as sound_enabled,
      s.daily_digest_vibration_enabled as vibration_enabled
    from public.notification_settings s
    join public.organizations o on o.id = s.organization_id
    where s.daily_digest_enabled = true
  )
  select
    b.organization_id,
    b.profile_id,
    b.timezone,
    (b.local_now)::date as local_date,
    b.digest_time,
    b.sound_enabled,
    b.vibration_enabled
  from base b
  where
    b.local_now >= ((b.local_now)::date + b.digest_time)
    and b.local_now < ((b.local_now)::date + b.digest_time + interval '30 minutes')
    and not exists (
      select 1
      from public.daily_digest_deliveries d
      where d.profile_id = b.profile_id
        and d.digest_date = (b.local_now)::date
    );
$$;

create or replace function public.get_lessons_for_local_date(
  p_profile_id uuid,
  p_local_date date
)
returns table (
  lesson_id uuid,
  start_time timestamptz,
  end_time timestamptz,
  student_first_name text,
  student_last_name text,
  location text
)
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select
    l.id as lesson_id,
    l.start_time,
    l.end_time,
    st.first_name,
    st.last_name,
    l.location
  from public.lessons l
  join public.profiles p on p.id = l.instructor_id
  join public.organizations o on o.id = p.organization_id
  join public.students st on st.id = l.student_id
  where
    l.instructor_id = p_profile_id
    and l.status = 'scheduled'
    and ((l.start_time at time zone o.timezone)::date) = p_local_date
  order by l.start_time asc;
$$;

