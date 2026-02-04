-- Driving School App - Assessments delete policy (v1)
-- Allows owners to delete within org; instructors can delete their own assessments.

alter table public.assessments enable row level security;

drop policy if exists "assessments_delete_owner_or_instructor" on public.assessments;
create policy "assessments_delete_owner_or_instructor"
on public.assessments
for delete
using (
  organization_id = public.current_user_organization_id()
  and (
    public.current_user_role() = 'owner'
    or instructor_id = auth.uid()
  )
);

