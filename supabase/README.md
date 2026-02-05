# Supabase setup (Driving School App v1)

## Apply migrations

In the Supabase Dashboard:

1. Go to `SQL Editor`
2. Run migrations in order:
   - `supabase/migrations/001_auth_onboarding.sql`
   - `supabase/migrations/002_fix_profiles_rls.sql`
   - `supabase/migrations/003_students.sql`
   - `supabase/migrations/004_lessons.sql`
   - `supabase/migrations/005_profile_avatars.sql`
   - `supabase/migrations/006_assessments.sql`
   - `supabase/migrations/007_assessments_delete.sql`
   - `supabase/migrations/008_student_sessions.sql`

## Storage buckets + policies

Create buckets (Dashboard → `Storage` → `New bucket`):

- `org-logos` (private)
- `avatars` (private)

Then apply policies (Dashboard → `SQL Editor`):

- `supabase/storage/org-logos.sql`
- `supabase/storage/avatars.sql`

## Verify RLS + permissions

Create 2 users in the same org:

- `owner` user (onboarding creates this)
- `instructor` user (create a `profiles` row with role `instructor`)

Checks:

- `owner` can read/write org data within org (students, lessons, organization_settings).
- `instructor` can only read/write their own assigned students + lessons (per existing RLS policies).
- `instructor` can only read/write their own assessments (assessments must match the student's assigned instructor).
- `instructor` can only read/write their own student sessions (session history).
- `instructor` cannot upload/replace `org-logos/*` (Storage policy should reject).
- Both `owner` and `instructor` can upload/update only their own `avatars/<auth.uid()>/avatar.*`.
- Users can read avatars of other users in the same org (drawer/header avatar display).
