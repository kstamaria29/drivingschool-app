-- Driving School App (v1) - Google Maps pins
-- Table: map_pins
-- RLS: owner/admin full within org; instructors can manage own pins and view assigned-student pins

create table if not exists public.map_pins (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  student_id uuid null references public.students(id) on delete set null,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  title text not null,
  notes text null,
  latitude double precision not null check (latitude >= -90 and latitude <= 90),
  longitude double precision not null check (longitude >= -180 and longitude <= 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists map_pins_org_created_at_idx
on public.map_pins (organization_id, created_at desc);

create index if not exists map_pins_student_id_idx
on public.map_pins (student_id);

create index if not exists map_pins_instructor_id_idx
on public.map_pins (instructor_id);

drop trigger if exists set_map_pins_updated_at on public.map_pins;
create trigger set_map_pins_updated_at
before update on public.map_pins
for each row
execute function public.set_updated_at();

alter table public.map_pins enable row level security;

drop policy if exists "map_pins_select_owner_admin_or_assigned" on public.map_pins;
create policy "map_pins_select_owner_admin_or_assigned"
on public.map_pins
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
    or (
      student_id is not null
      and public.student_assigned_to_instructor(student_id, auth.uid())
    )
  )
);

drop policy if exists "map_pins_insert_owner_admin_or_self" on public.map_pins;
create policy "map_pins_insert_owner_admin_or_self"
on public.map_pins
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and (
    student_id is null
    or (
      public.student_is_in_organization(student_id, organization_id)
      and public.student_assigned_to_instructor(student_id, instructor_id)
    )
  )
  and (
    public.current_user_is_owner_or_admin()
    or (public.current_user_role() = 'instructor' and instructor_id = auth.uid())
  )
);

drop policy if exists "map_pins_update_owner_admin_or_self" on public.map_pins;
create policy "map_pins_update_owner_admin_or_self"
on public.map_pins
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
  and (
    student_id is null
    or (
      public.student_is_in_organization(student_id, organization_id)
      and public.student_assigned_to_instructor(student_id, instructor_id)
    )
  )
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);

drop policy if exists "map_pins_delete_owner_admin_or_self" on public.map_pins;
create policy "map_pins_delete_owner_admin_or_self"
on public.map_pins
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);
