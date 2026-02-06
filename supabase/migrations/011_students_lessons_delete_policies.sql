-- Driving School App (v1) - Add delete policies for students and lessons

drop policy if exists "students_delete_owner_or_assigned" on public.students;
create policy "students_delete_owner_or_assigned"
on public.students
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or assigned_instructor_id = auth.uid()
  )
);

drop policy if exists "lessons_delete_owner_or_instructor" on public.lessons;
create policy "lessons_delete_owner_or_instructor"
on public.lessons
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_is_owner_or_admin()
    or instructor_id = auth.uid()
  )
);
