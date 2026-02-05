-- Driving School App (v1) — Student sessions (Session History)
-- Table: student_sessions
-- RLS: owner full within org; instructor only their sessions

create table if not exists public.student_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,

  session_at timestamptz not null default now(),
  duration_minutes int null check (duration_minutes is null or (duration_minutes >= 15 and duration_minutes <= 8 * 60)),
  tasks text[] not null default '{}'::text[],
  next_focus text null,
  notes text null,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_sessions_organization_session_at_idx
on public.student_sessions (organization_id, session_at);

create index if not exists student_sessions_student_session_at_idx
on public.student_sessions (student_id, session_at);

create index if not exists student_sessions_instructor_session_at_idx
on public.student_sessions (instructor_id, session_at);

drop trigger if exists set_student_sessions_updated_at on public.student_sessions;
create trigger set_student_sessions_updated_at
before update on public.student_sessions
for each row
execute function public.set_updated_at();

alter table public.student_sessions enable row level security;

drop policy if exists "student_sessions_select_owner_or_instructor" on public.student_sessions;
create policy "student_sessions_select_owner_or_instructor"
on public.student_sessions
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

drop policy if exists "student_sessions_insert_owner_or_self" on public.student_sessions;
create policy "student_sessions_insert_owner_or_self"
on public.student_sessions
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and public.student_is_in_organization(student_id, organization_id)
  and public.student_assigned_to_instructor(student_id, instructor_id)
  and (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'instructor' and instructor_id = auth.uid())
  )
);

drop policy if exists "student_sessions_update_owner_or_instructor" on public.student_sessions;
create policy "student_sessions_update_owner_or_instructor"
on public.student_sessions
for update
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
)
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and public.student_is_in_organization(student_id, organization_id)
  and public.student_assigned_to_instructor(student_id, instructor_id)
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

drop policy if exists "student_sessions_delete_owner_or_instructor" on public.student_sessions;
create policy "student_sessions_delete_owner_or_instructor"
on public.student_sessions
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

