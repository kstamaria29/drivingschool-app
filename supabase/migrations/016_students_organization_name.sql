-- Driving School App (v1) - Student organization label
-- Adds organization_name to students for filtering/grouping in app UI.

alter table public.students
add column if not exists organization_name text;

update public.students
set organization_name = 'Private'
where organization_name is null
   or btrim(organization_name) = '';

alter table public.students
alter column organization_name set default 'Private';

alter table public.students
alter column organization_name set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'students_organization_name_not_blank'
  ) then
    alter table public.students
    add constraint students_organization_name_not_blank
    check (length(btrim(organization_name)) > 0);
  end if;
end;
$$;

create index if not exists students_org_organization_name_idx
on public.students (organization_id, organization_name);
