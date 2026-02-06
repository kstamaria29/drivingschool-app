# Driving School App (Mobile, v1)

Expo React Native app with Supabase auth + onboarding (organization creation + optional logo upload).

Out of scope in this repo task: Google Calendar sync.

## 1) Prerequisites

- Node.js 20+
- A Supabase project (cloud)
- Expo Go on a device OR an Android/iOS simulator

## 2) Create Supabase project

1. Create a new Supabase project.
2. In the Supabase Dashboard, go to `SQL Editor` and run:
   - `supabase/migrations/001_auth_onboarding.sql`
   - `supabase/migrations/002_fix_profiles_rls.sql`
   - `supabase/migrations/003_students.sql`
   - `supabase/migrations/004_lessons.sql`
   - `supabase/migrations/005_profile_avatars.sql`
   - `supabase/migrations/006_assessments.sql`
3. Create the Storage bucket:
   - Go to `Storage` -> `New bucket`
   - Name: `org-logos`
   - Keep it `private`
4. Create the Storage bucket:
   - Go to `Storage` -> `New bucket`
   - Name: `avatars`
   - Keep it `private`
5. In `SQL Editor`, run the storage policies:
   - `supabase/storage/org-logos.sql`
   - `supabase/storage/avatars.sql`
6. Get your API keys:
   - Go to `Project Settings` -> `API`
   - Copy the `Project URL`
   - Copy the `anon` key

## 3) Configure environment variables

1. Create a local `.env` file from `.env.example`
2. Set:

```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

### EAS builds (APK / AAB)

EAS builds do not automatically use your local `.env` (it is gitignored). You must set the same variables in EAS:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Then rebuild (for example): `eas build -p android --profile preview`

## 4) Run the app

```
npm install
npm run start
```

Then press `a` for Android (or scan the QR code with Expo Go).

## 5) What's implemented

- NativeWind styling + shared UI primitives (`src/components/*`)
- React Navigation `AuthStack` + responsive sidebar/drawer navigation with an auth gate (`src/navigation/RootNavigation.tsx`)
- Supabase client for Expo/React Native (`src/supabase/client.ts`)
- Email/password auth (sign in + sign up)
- Onboarding for first-time users (creates `organizations`, `profiles`, `organization_settings`, optional logo upload to `org-logos/<org_id>/logo.<ext>`)
- Students v1 (create/edit/archive + owner/instructor permissions via RLS)
- Lessons v1 (Today / This Week list + create/edit + calendar view)
- Assessments v1 (Driving Assessment: score criteria + save + export PDF)

## 6) Repo notes

- Screens do not call Supabase directly; they use `features/*/api.ts` + React Query hooks.
