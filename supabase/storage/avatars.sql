-- Supabase Storage bucket + policies for user avatars.
--
-- Bucket: avatars
-- Path convention: <user_id>/avatar.<ext>
--
-- Create the bucket in the Supabase Dashboard first:
-- Storage -> New bucket -> name: avatars (private)
--
-- Then run the policies below in the SQL Editor.

-- Read: any authenticated user in the same organization can read.
drop policy if exists "avatars_read_own_org" on storage.objects;
create policy "avatars_read_own_org"
on storage.objects
for select
using (
  bucket_id = 'avatars'
  and exists (
    select 1
    from public.profiles viewer
    join public.profiles owner_profile
      on owner_profile.id::text = split_part(name, '/', 1)
    where viewer.id = auth.uid()
      and viewer.organization_id = owner_profile.organization_id
  )
);

-- Upload/replace/delete: users can manage only their own avatar folder.
drop policy if exists "avatars_write_own" on storage.objects;
create policy "avatars_write_own"
on storage.objects
for insert
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
on storage.objects
for update
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
on storage.objects
for delete
using (
  bucket_id = 'avatars'
  and split_part(name, '/', 1) = auth.uid()::text
);

