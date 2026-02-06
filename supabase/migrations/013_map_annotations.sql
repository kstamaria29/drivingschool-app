-- Driving School App (v1) - Map annotations (anchored vectors + snapshots)
-- Table: map_annotations
-- RLS: owner/admin full within org; instructors can manage own rows and view assigned-student rows

create table if not exists public.map_annotations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  map_pin_id uuid null references public.map_pins(id) on delete cascade,
  student_id uuid null references public.students(id) on delete set null,
  instructor_id uuid not null references public.profiles(id) on delete restrict,
  annotation_type text not null check (annotation_type in ('anchored_vector', 'snapshot')),
  title text not null,
  notes text null,
  vector_strokes jsonb null,
  snapshot_image_base64 text null,
  snapshot_strokes jsonb null,
  snapshot_width int null check (snapshot_width is null or snapshot_width > 0),
  snapshot_height int null check (snapshot_height is null or snapshot_height > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint map_annotations_payload_shape_check check (
    (
      annotation_type = 'anchored_vector'
      and vector_strokes is not null
      and snapshot_image_base64 is null
      and snapshot_width is null
      and snapshot_height is null
    )
    or (
      annotation_type = 'snapshot'
      and vector_strokes is null
      and snapshot_image_base64 is not null
      and snapshot_width is not null
      and snapshot_height is not null
    )
  )
);

create index if not exists map_annotations_org_created_at_idx
on public.map_annotations (organization_id, created_at desc);

create index if not exists map_annotations_map_pin_id_idx
on public.map_annotations (map_pin_id);

create index if not exists map_annotations_student_id_idx
on public.map_annotations (student_id);

create index if not exists map_annotations_instructor_id_idx
on public.map_annotations (instructor_id);

drop trigger if exists set_map_annotations_updated_at on public.map_annotations;
create trigger set_map_annotations_updated_at
before update on public.map_annotations
for each row
execute function public.set_updated_at();

create or replace function public.map_pin_is_in_organization(target_map_pin_id uuid, org_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select exists (
    select 1
    from public.map_pins p
    where p.id = target_map_pin_id
      and p.organization_id = org_id
  );
$$;

alter table public.map_annotations enable row level security;

drop policy if exists "map_annotations_select_owner_admin_or_assigned" on public.map_annotations;
create policy "map_annotations_select_owner_admin_or_assigned"
on public.map_annotations
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

drop policy if exists "map_annotations_insert_owner_admin_or_self" on public.map_annotations;
create policy "map_annotations_insert_owner_admin_or_self"
on public.map_annotations
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(instructor_id, organization_id)
  and (
    map_pin_id is null
    or public.map_pin_is_in_organization(map_pin_id, organization_id)
  )
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

drop policy if exists "map_annotations_update_owner_admin_or_self" on public.map_annotations;
create policy "map_annotations_update_owner_admin_or_self"
on public.map_annotations
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
    map_pin_id is null
    or public.map_pin_is_in_organization(map_pin_id, organization_id)
  )
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

drop policy if exists "map_annotations_delete_owner_admin_or_self" on public.map_annotations;
create policy "map_annotations_delete_owner_admin_or_self"
on public.map_annotations
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);
