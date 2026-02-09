-- Driving School App (v1) - Student reminders
-- Table: student_reminders
-- RLS: owner/admin full within org; instructor only their reminders

create or replace function public.student_reminder_offsets_are_valid(offsets int[])
returns boolean
language sql
immutable
as $$
  select
    coalesce(array_length(offsets, 1), 0) > 0
    and not exists (
      select 1
      from unnest(offsets) as offset_value
      where offset_value <= 0 or offset_value > 10080
    );
$$;

create table if not exists public.student_reminders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  instructor_id uuid not null references public.profiles(id) on delete restrict,

  title text not null
    check (char_length(btrim(title)) between 1 and 120),
  reminder_date date not null,
  notification_offsets_minutes int[] not null default '{}'::int[]
    check (public.student_reminder_offsets_are_valid(notification_offsets_minutes)),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_reminders_organization_reminder_date_idx
on public.student_reminders (organization_id, reminder_date);

create index if not exists student_reminders_student_reminder_date_idx
on public.student_reminders (student_id, reminder_date);

create index if not exists student_reminders_instructor_reminder_date_idx
on public.student_reminders (instructor_id, reminder_date);

drop trigger if exists set_student_reminders_updated_at on public.student_reminders;
create trigger set_student_reminders_updated_at
before update on public.student_reminders
for each row
execute function public.set_updated_at();

alter table public.student_reminders enable row level security;

drop policy if exists "student_reminders_select_owner_or_instructor" on public.student_reminders;
create policy "student_reminders_select_owner_or_instructor"
on public.student_reminders
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);

drop policy if exists "student_reminders_insert_owner_or_self" on public.student_reminders;
create policy "student_reminders_insert_owner_or_self"
on public.student_reminders
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and public.student_is_in_organization(student_id, organization_id)
  and public.student_assigned_to_instructor(student_id, instructor_id)
  and (
    public.current_user_is_owner_or_admin()
    or (public.current_user_role() = 'instructor' and instructor_id = auth.uid())
  )
);

drop policy if exists "student_reminders_update_owner_or_instructor" on public.student_reminders;
create policy "student_reminders_update_owner_or_instructor"
on public.student_reminders
for update
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
)
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and public.student_is_in_organization(student_id, organization_id)
  and public.student_assigned_to_instructor(student_id, instructor_id)
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);

drop policy if exists "student_reminders_delete_owner_or_instructor" on public.student_reminders;
create policy "student_reminders_delete_owner_or_instructor"
on public.student_reminders
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);
