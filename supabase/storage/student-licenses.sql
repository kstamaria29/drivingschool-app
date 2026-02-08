-- Supabase Storage bucket + policies for student licence card images.
--
-- Bucket: student-licenses
-- Path convention: <organization_id>/<student_id>/<front|back>.<ext>
--
-- Create the bucket in the Supabase Dashboard first:
-- Storage -> New bucket -> name: student-licenses (private)
--
-- Then run the policies below in the SQL Editor.

-- Read: owner/admin can read within org; instructor can read for assigned students.
drop policy if exists "student_licenses_read_allowed" on storage.objects;
create policy "student_licenses_read_allowed"
on storage.objects
for select
using (
  bucket_id = 'student-licenses'
  and split_part(split_part(name, '/', 3), '.', 1) in ('front', 'back')
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(name, '/', 2)
      and s.organization_id = public.current_user_organization_id()
      and s.organization_id::text = split_part(name, '/', 1)
      and (
        public.current_user_is_owner_or_admin()
        or s.assigned_instructor_id = auth.uid()
      )
  )
);

-- Upload/replace/delete: owner/admin can manage all org student licence images.
-- Assigned instructors can manage only their assigned students.
drop policy if exists "student_licenses_insert_allowed" on storage.objects;
create policy "student_licenses_insert_allowed"
on storage.objects
for insert
with check (
  bucket_id = 'student-licenses'
  and split_part(split_part(name, '/', 3), '.', 1) in ('front', 'back')
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(name, '/', 2)
      and s.organization_id = public.current_user_organization_id()
      and s.organization_id::text = split_part(name, '/', 1)
      and (
        public.current_user_is_owner_or_admin()
        or s.assigned_instructor_id = auth.uid()
      )
  )
);

drop policy if exists "student_licenses_update_allowed" on storage.objects;
create policy "student_licenses_update_allowed"
on storage.objects
for update
using (
  bucket_id = 'student-licenses'
  and split_part(split_part(name, '/', 3), '.', 1) in ('front', 'back')
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(name, '/', 2)
      and s.organization_id = public.current_user_organization_id()
      and s.organization_id::text = split_part(name, '/', 1)
      and (
        public.current_user_is_owner_or_admin()
        or s.assigned_instructor_id = auth.uid()
      )
  )
)
with check (
  bucket_id = 'student-licenses'
  and split_part(split_part(name, '/', 3), '.', 1) in ('front', 'back')
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(name, '/', 2)
      and s.organization_id = public.current_user_organization_id()
      and s.organization_id::text = split_part(name, '/', 1)
      and (
        public.current_user_is_owner_or_admin()
        or s.assigned_instructor_id = auth.uid()
      )
  )
);

drop policy if exists "student_licenses_delete_allowed" on storage.objects;
create policy "student_licenses_delete_allowed"
on storage.objects
for delete
using (
  bucket_id = 'student-licenses'
  and split_part(split_part(name, '/', 3), '.', 1) in ('front', 'back')
  and exists (
    select 1
    from public.students s
    where s.id::text = split_part(name, '/', 2)
      and s.organization_id = public.current_user_organization_id()
      and s.organization_id::text = split_part(name, '/', 1)
      and (
        public.current_user_is_owner_or_admin()
        or s.assigned_instructor_id = auth.uid()
      )
  )
);
