-- Driving School App (v1) — Students (CRUD + archive)
-- Table: students
-- RLS: owner full within org; instructor only assigned students

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  assigned_instructor_id uuid not null references public.profiles(id) on delete restrict,

  first_name text not null,
  last_name text not null,

  email text null,
  phone text null,
  address text null,

  license_type text null check (license_type in ('learner', 'restricted', 'full')),
  license_number text null,
  license_version text null,
  class_held text null,
  issue_date date null,
  expiry_date date null,

  notes text null,
  archived_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_organization_id_idx on public.students (organization_id);
create index if not exists students_org_archived_at_idx on public.students (organization_id, archived_at);
create index if not exists students_assigned_instructor_id_idx on public.students (assigned_instructor_id);

drop trigger if exists set_students_updated_at on public.students;
create trigger set_students_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

-- SECURITY DEFINER helper used by RLS checks (avoid relying on caller's profile select permissions).
create or replace function public.profile_is_in_organization(profile_id uuid, org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = profile_id
      and p.organization_id = org_id
  );
$$;

alter table public.students enable row level security;

drop policy if exists "students_select_owner_or_assigned" on public.students;
create policy "students_select_owner_or_assigned"
on public.students
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or assigned_instructor_id = auth.uid()
  )
);

drop policy if exists "students_insert_owner_or_self" on public.students;
create policy "students_insert_owner_or_self"
on public.students
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(assigned_instructor_id, organization_id)
  and (
    public.current_user_role() = 'owner'
    or (public.current_user_role() = 'instructor' and assigned_instructor_id = auth.uid())
  )
);

drop policy if exists "students_update_owner_or_assigned" on public.students;
create policy "students_update_owner_or_assigned"
on public.students
for update
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or assigned_instructor_id = auth.uid()
  )
)
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(assigned_instructor_id, organization_id)
  and (
    public.current_user_role() = 'owner'
    or assigned_instructor_id = auth.uid()
  )
);

