-- Supabase Storage bucket + policies for org logos.
--
-- Bucket: org-logos
-- Path convention: <organization_id>/logo.<ext>
--
-- Create the bucket in the Supabase Dashboard first:
-- Storage -> New bucket -> name: org-logos (private)
--
-- Then run the policies below in the SQL Editor.

-- Read: any authenticated user in the org can read.
drop policy if exists "org_logos_read_own_org" on storage.objects;
create policy "org_logos_read_own_org"
on storage.objects
for select
using (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.organization_id::text = split_part(name, '/', 1)
  )
);

-- Upload/replace: owners only (same org as the folder).
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
      and p.role = 'owner'
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
      and p.role = 'owner'
      and p.organization_id::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'org-logos'
  and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'owner'
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
      and p.role = 'owner'
      and p.organization_id::text = split_part(name, '/', 1)
  )
);

