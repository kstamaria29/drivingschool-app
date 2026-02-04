-- Driving School App - Assessments (Driving Assessment v1)
-- Table: assessments
-- RLS: owner full within org; instructor only their assessments

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  assessment_type text not null check (assessment_type in ('driving_assessment', 'second_assessment', 'third_assessment')),
  assessment_date date null,
  total_score int null,
  form_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assessments_org_type_date_idx
on public.assessments (organization_id, assessment_type, assessment_date);

create index if not exists assessments_student_id_idx on public.assessments (student_id);
create index if not exists assessments_instructor_id_idx on public.assessments (instructor_id);

drop trigger if exists set_assessments_updated_at on public.assessments;
create trigger set_assessments_updated_at
before update on public.assessments
for each row
execute function public.set_updated_at();

alter table public.assessments enable row level security;

drop policy if exists "assessments_select_owner_or_instructor" on public.assessments;
create policy "assessments_select_owner_or_instructor"
on public.assessments
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

drop policy if exists "assessments_insert_owner_or_self" on public.assessments;
create policy "assessments_insert_owner_or_self"
on public.assessments
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

drop policy if exists "assessments_update_owner_or_instructor" on public.assessments;
create policy "assessments_update_owner_or_instructor"
on public.assessments
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

