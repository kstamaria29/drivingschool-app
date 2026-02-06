-- Driving School App (v1) - Add admin role (owner-equivalent permissions)

alter table public.profiles
drop constraint if exists profiles_role_check;

alter table public.profiles
add constraint profiles_role_check
check (role in ('owner', 'admin', 'instructor'));

create or replace function public.current_user_is_owner_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
set row_security = off
as $$
  select coalesce(
    (
      select p.role in ('owner', 'admin')
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

drop policy if exists "organizations_update_owner" on public.organizations;
create policy "organizations_update_owner"
on public.organizations
for update
using (
  id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
)
with check (
  id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
);

drop policy if exists "organizations_delete_owner" on public.organizations;
create policy "organizations_delete_owner"
on public.organizations
for delete
using (
  id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
);

drop policy if exists "profiles_select_own_or_owner_org" on public.profiles;
create policy "profiles_select_own_or_owner_org"
on public.profiles
for select
using (
  id = auth.uid()
  or (
    public.current_user_is_owner_or_admin()
    and organization_id = public.current_user_organization_id()
  )
);

drop policy if exists "profiles_update_owner_org" on public.profiles;
create policy "profiles_update_owner_org"
on public.profiles
for update
using (
  public.current_user_is_owner_or_admin()
  and organization_id = public.current_user_organization_id()
)
with check (
  public.current_user_is_owner_or_admin()
  and organization_id = public.current_user_organization_id()
);

drop policy if exists "organization_settings_insert_owner" on public.organization_settings;
create policy "organization_settings_insert_owner"
on public.organization_settings
for insert
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
);

drop policy if exists "organization_settings_update_owner" on public.organization_settings;
create policy "organization_settings_update_owner"
on public.organization_settings
for update
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
)
with check (
  organization_id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
);

drop policy if exists "organization_settings_delete_owner" on public.organization_settings;
create policy "organization_settings_delete_owner"
on public.organization_settings
for delete
using (
  organization_id = public.current_user_organization_id()
  and public.current_user_is_owner_or_admin()
);

drop policy if exists "students_select_owner_or_assigned" on public.students;
create policy "students_select_owner_or_assigned"
on public.students
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
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
    public.current_user_is_owner_or_admin()
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
    public.current_user_is_owner_or_admin()
    or assigned_instructor_id = auth.uid()
  )
)
with check (
  organization_id = public.current_user_organization_id()
  and public.profile_is_in_organization(assigned_instructor_id, organization_id)
  and (
    public.current_user_is_owner_or_admin()
    or assigned_instructor_id = auth.uid()
  )
);

drop policy if exists "lessons_select_owner_or_instructor" on public.lessons;
create policy "lessons_select_owner_or_instructor"
on public.lessons
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
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
    public.current_user_is_owner_or_admin()
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

drop policy if exists "assessments_select_owner_or_instructor" on public.assessments;
create policy "assessments_select_owner_or_instructor"
on public.assessments
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
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
    public.current_user_is_owner_or_admin()
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

drop policy if exists "assessments_delete_owner_or_instructor" on public.assessments;
create policy "assessments_delete_owner_or_instructor"
on public.assessments
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);

drop policy if exists "student_sessions_select_owner_or_instructor" on public.student_sessions;
create policy "student_sessions_select_owner_or_instructor"
on public.student_sessions
for select
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
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
    public.current_user_is_owner_or_admin()
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

drop policy if exists "student_sessions_delete_owner_or_instructor" on public.student_sessions;
create policy "student_sessions_delete_owner_or_instructor"
on public.student_sessions
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);

drop policy if exists "org_logos_write_owner" on storage.objects;
create policy "org_logos_write_owner"
on storage.objects
for insert
with check (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.organization_id::text = split_part(name, '/', 1)
  )
);

drop policy if exists "org_logos_update_owner" on storage.objects;
create policy "org_logos_update_owner"
on storage.objects
for update
using (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.organization_id::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.organization_id::text = split_part(name, '/', 1)
  )
);

drop policy if exists "org_logos_delete_owner" on storage.objects;
create policy "org_logos_delete_owner"
on storage.objects
for delete
using (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('owner', 'admin')
      and p.organization_id::text = split_part(name, '/', 1)
  )
);
