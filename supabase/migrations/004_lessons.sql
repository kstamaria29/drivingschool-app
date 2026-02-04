-- Driving School App (v1) — Lessons (schedule + status)
-- Table: lessons
-- RLS: owner full within org; instructor only their lessons

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text null,
  status text not null check (status in ('scheduled', 'completed', 'cancelled')),
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_end_after_start check (end_time > start_time)
);

create index if not exists lessons_organization_start_time_idx on public.lessons (organization_id, start_time);
create index if not exists lessons_student_id_idx on public.lessons (student_id);
create index if not exists lessons_instructor_id_idx on public.lessons (instructor_id);

drop trigger if exists set_lessons_updated_at on public.lessons;
create trigger set_lessons_updated_at
before update on public.lessons
for each row
execute function public.set_updated_at();

-- SECURITY DEFINER helpers used by RLS checks (avoid relying on caller's select permissions).
create or replace function public.student_is_in_organization(student_id uuid, org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.organization_id = org_id
  );
$$;

create or replace function public.student_assigned_to_instructor(student_id uuid, instructor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.students s
    where s.id = student_id
      and s.assigned_instructor_id = instructor_id
  );
$$;

alter table public.lessons enable row level security;

drop policy if exists "lessons_select_owner_or_instructor" on public.lessons;
create policy "lessons_select_owner_or_instructor"
on public.lessons
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

drop policy if exists "lessons_insert_owner_or_self" on public.lessons;
create policy "lessons_insert_owner_or_self"
on public.lessons
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

drop policy if exists "lessons_update_owner_or_instructor" on public.lessons;
create policy "lessons_update_owner_or_instructor"
on public.lessons
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

