# AGENTS.md — Driving School App (Mobile, v1)

This file tells Codex CLI how to build the Driving School App v1. Follow this spec strictly.

---

## 0) Product goal (non-negotiable)

Build a **mobile app (not web)** for a driving instructor to:

1. **Authenticate**: user must sign in when app loads
2. **Student management**: add / edit / archive (soft delete)
3. **Lessons**: schedule lessons (date/time, location, notes, status)

> NOTE: Assessments/mock tests are intentionally planned later. Do not implement any assessment features in v1.

### Explicitly out of scope for v1

- **No Google Calendar sync**
- No payments/subscriptions
- No advanced analytics/reporting
- No offline-first requirement (basic caching is fine)

---

## 1) Tech stack decisions

### Mobile

- Expo React Native + TypeScript
- NativeWind for styling (Tailwind-like classes)
- React Navigation for navigation
- TanStack Query for server state (Supabase data) + caching
- Zustand for light local UI state only (filters, UI toggles)
- React Hook Form + Zod for forms + validation
- Day.js for date/time formatting & calculations

### Backend

- Supabase (fresh database)
  - Auth
  - Postgres
  - Row Level Security (RLS) for multi-tenancy
  - Storage (required for org logo upload)

---

## 2) Principles and constraints

### v1 focus

- Ship a reliable “daily use” app for a single instructor/school.
- Still design as a **template product**: multi-tenant schema from day 1.

### Multi-tenant requirement

Every tenant-owned table MUST include `organization_id`.  
Access MUST be restricted via RLS to the user’s organization.

### Data deletion

Prefer soft-delete (archiving), not hard delete.  
Use `archived_at timestamptz null` for Students at minimum.

---

## 3) Roles & permissions (v1)

We have two roles in `profiles.role`:

### owner

- Full access to all data within their organization
- Can create/assign students to instructors
- Can archive/unarchive any student
- Can upload/update the organization logo

### instructor

- Can only CRUD **their own students** (students assigned to them)
- Can only archive/unarchive **their own students**
- Lessons are assigned to a specific instructor; instructors can only access their own lessons
- Cannot upload/update the organization logo

**Important:** v1 assumes instructors can see only what’s assigned to them. Owners can see everything in the org.

---

## 4) Supabase schema (v1)

Create a new Supabase project and build migrations for the following.

### Tables

#### 1) `organizations`

- `id uuid primary key default gen_random_uuid()`
- `name text not null`
- `timezone text not null default 'Pacific/Auckland'`
- `created_at timestamptz not null default now()`

#### 2) `profiles`

- `id uuid primary key` (matches `auth.users.id`)
- `organization_id uuid not null references organizations(id) on delete cascade`
- `role text not null` (v1: `'owner' | 'instructor'`)
- `display_name text not null`
- `created_at timestamptz not null default now()`

#### 3) `organization_settings`

Stores branding and org settings.

- `organization_id uuid primary key references organizations(id) on delete cascade`
- `logo_url text null` (URL to stored logo)
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

#### 4) `students`

Students are soft-deleted via `archived_at` (archiving sets a timestamp; unarchiving sets it back to NULL).

In v1, each student is **assigned to one instructor**. This powers permissions (“instructors can only CRUD their own students”).

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `assigned_instructor_id uuid not null references profiles(id) on delete restrict`

**Identity**

- `first_name text not null`
- `last_name text not null`

**Contact**

- `email text null`
- `phone text null`
- `address text null`

**Licence details**

- `license_type text null` (allowed: `'learner' | 'restricted' | 'full'`)
- `license_number text null`
- `license_version text null`
- `class_held text null`
- `issue_date date null`
- `expiry_date date null`

**Other**

- `notes text null`
- `archived_at timestamptz null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- check constraint for `license_type` to only allow learner/restricted/full (or null)
- validate email/phone primarily in app with Zod

#### 5) `lessons`

Lessons are assigned to a specific instructor (enforced by `instructor_id`).

- `id uuid primary key default gen_random_uuid()`
- `organization_id uuid not null references organizations(id) on delete cascade`
- `student_id uuid not null references students(id) on delete restrict`
- `instructor_id uuid not null references profiles(id) on delete restrict`
- `start_time timestamptz not null`
- `end_time timestamptz not null`
- `location text null`
- `status text not null` (allowed: `'scheduled' | 'completed' | 'cancelled'`)
- `notes text null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Recommended constraints:

- `end_time > start_time`

### Indexes (minimum)

- students: `(organization_id)`, `(organization_id, archived_at)`, `(assigned_instructor_id)`
- lessons: `(organization_id, start_time)`, `(student_id)`, `(instructor_id)`
- profiles: `(organization_id)`

### Timestamps

Use a trigger to update `updated_at` on update for:

- `students`, `lessons`, `organization_settings`

---

## 5) Supabase Storage (org logo)

### Bucket

- Create a bucket named: `org-logos`

### File path convention

Store one logo per org at:

- `org-logos/<organization_id>/logo.<ext>`

### Access rules

- All authenticated users in the same org can read the logo
- Only **owners** can upload/replace the logo

---

## 6) Supabase Auth + onboarding flow (v1)

### Authentication

- Email/password is sufficient for v1
- App must require sign-in on load

### Organization creation (required in v1)

**Yes:** first-time signup creates an organization and owner profile.

On first signup (user has no `profiles` row):

1. Collect:
   - driving school name (`organizations.name`)
   - owner display name (`profiles.display_name`)
   - organization logo (optional in v1)
2. Create `organizations` row
3. Create `profiles` row:
   - `id = auth.users.id`
   - `organization_id = organizations.id`
   - `role = 'owner'`
   - `display_name` from onboarding
4. If logo provided:
   - upload to Storage bucket `org-logos` at `/<organization_id>/logo.<ext>`
   - store resulting URL in `organization_settings.logo_url` (upsert)
5. Navigate to `LessonsListScreen` (Today)

After onboarding:

- Owner can create instructor users and assign students to them (implementation can be planned later; keep v1 simple).

---

## 7) RLS policies (mandatory)

Enable RLS on all tenant tables:

- `profiles`, `organization_settings`, `students`, `lessons`

### Policy intent (must match roles & permissions)

#### Owner access

A user with `profiles.role = 'owner'` can:

- read/write all rows within their `organization_id`

#### Instructor access

A user with `profiles.role = 'instructor'` can:

- `students`: read/write only rows where `assigned_instructor_id = auth.uid()`
- `lessons`: read/write only rows where `instructor_id = auth.uid()`
- `organization_settings`: read-only for their org
- `profiles`: read-only for their own profile (minimum)

### Implementation guidance (for Codex)

Policies should be written using `EXISTS` checks against `profiles`:

- confirm the authenticated user has a profile
- confirm org matches (`profiles.organization_id = row.organization_id`)
- then enforce:
  - role is owner, OR
  - role is instructor AND row is assigned to them (`assigned_instructor_id` / `instructor_id`)

**Never ship without RLS enabled and tested with both roles.**

---

## 8) UI target devices & layout priority (v1)

This app will be used primarily on a **tablet in portrait orientation**.

### Priority order (design + QA)

1. **Tablet — Portrait (primary)**
2. **Tablet — Landscape (secondary)**
3. **Mobile (tertiary)**

### Layout rules

- All screens must look and feel **excellent on tablet portrait** first.
- Tablet portrait should use a **comfortable reading width**:
  - avoid full-bleed, edge-to-edge text/forms
  - use a centered content container with a max width
- Tablet landscape should remain usable without redesign:
  - allow content to expand, but keep readable margins
- Mobile layouts may simplify (stack vertically), but must remain functional.

### Navigation implications

- Prefer a **tab-based** main navigation that works well on tablets.
- Use consistent headers, generous spacing, and large touch targets suitable for tablet use.

### Implementation guidance (NativeWind)

Create a shared layout primitive used by all screens:

- `Screen` should:
  - include Safe Area
  - center content
  - apply responsive padding
  - enforce a max content width on tablet portrait

### QA checklist per screen

- Tablet portrait: no cramped columns, no tiny buttons, no overly wide text lines
- Tablet landscape: content remains readable, no awkward empty space
- Mobile: no clipped content, forms usable, navigation reachable

---

## 9) UI styling rules (NativeWind)

We use **NativeWind** (Tailwind-style classes). To avoid inconsistent “tailwind soup”, follow these rules:

### Rule: screens MUST use shared primitives

Do **not** repeatedly style raw `Pressable`, `TextInput`, `Text`, `View` directly inside screens. Build and reuse primitives:

- `Screen` (safe area + standard padding + max width container)
- `AppText` (variants: title, heading, body, caption)
- `AppButton` (variants: primary, secondary, ghost; sizes)
- `AppInput` (label + error + text input)
- `AppCard`
- `AppRow` / `AppStack`
- `AppBadge` (for lesson status chips)
- `AppDivider`

### Rule: no hardcoded hex colors in screens

Do not use hex values (e.g. `#123456`) in screens.  
Use a central `theme.ts` mapping + semantic styling through primitives.

---

## 10) App navigation (React Navigation)

### Structure

Use the following navigation structure:

- `AuthStack`
  - `LoginScreen`
  - `SignupScreen` (optional)
  - `OnboardingCreateOrgScreen` (required for first-time signup)
- `MainTabs`
  - `LessonsStack`
    - `LessonsListScreen` (Today default)
    - `LessonEditScreen`
  - `StudentsStack`
    - `StudentsListScreen`
    - `StudentDetailScreen`
    - `StudentEditScreen`
  - (Optional) `SettingsScreen` (v1 can place this behind a menu)

> NOTE: Remove `AssessmentsStack` from navigation in v1.

### Auth gate

On app load:

- check Supabase session
- if no session → show `AuthStack`
- if session → show `MainTabs`

---

## 11) Post-login experience (v1)

### What the user sees after login

After a successful login, the user is taken to the **Main App** (`MainTabs`).

**Default landing tab:** `Lessons`  
**Default landing screen:** `LessonsListScreen` showing **Today’s lessons**.

### Lessons (Today) home screen requirements

On load:

- show a header: **Today** + the current date
- show a list of today’s lessons (time, student name, location, status chip)
- provide primary actions:
  - **+ New Lesson**
  - **+ New Student**
- include a simple filter (optional v1):
  - Today | This Week (start with Today if needed)

#### Empty states

- If there are no lessons today:
  - show a friendly empty state message
  - show **+ New Lesson** prominently
- If the user is an instructor and has no assigned lessons:
  - message should imply they may not be assigned lessons yet

### Returning users

Returning users skip onboarding and go directly to `LessonsListScreen` (Today).

### Permissions effect

- Owners see all lessons for the organization (v1 default).
- Instructors see only their assigned lessons (`lessons.instructor_id = auth.uid()`).

---

## 12) Data access pattern (Supabase + TanStack Query)

### Requirements

- All reads/writes go through a **single typed API layer**
- Screens must **never** call Supabase directly

### Pattern

- `features/<domain>/api.ts` exports query + mutation functions
- `features/<domain>/queries.ts` exports TanStack Query hooks
- Use consistent query keys, e.g.:
  - `['students', { archived: false }]`
  - `['student', studentId]`
  - `['lessons', { dateISO }]`

### Mutations

After mutation success, invalidate the correct keys so the UI refreshes automatically.

---

## 13) Forms (React Hook Form + Zod)

### Rules

- Every form has a **Zod schema**
- Validate on submit and show friendly error messages
- Reuse schema types in API calls

### Forms needed in v1

- Student create/edit
- Lesson create/edit
- Onboarding create org (name + logo + display name)

---

## 14) Date/time (Day.js)

### Rules

- Store times in DB as `timestamptz`
- Display times in local time in the app
- Lesson creation default:
  - `end_time = start_time + 60 minutes` (user can adjust)
- Use Day.js for formatting and calculations

---

## 15) Suggested repo structure

Use a real markdown code block in the repository (this section is plain text layout guidance):

src/
app/
navigation/
providers/
core/
supabase/
theme/
components/ # shared primitives
utils/
features/
auth/
students/
lessons/
types/

---

## 16) Quality gates

### Lint/format

- ESLint + Prettier
- TypeScript strict mode

### Testing (light for v1)

Unit tests for:

- key utils (date helpers)
- Zod schemas for student/lesson forms

### Error handling

- All network calls must show:
  - loading state
  - error state with retry
- Avoid silent failures

---

## 17) Codex CLI instructions (how to work)

### Mandatory: read project context first

At the start of EVERY task, Codex MUST:

1. Open and read `AGENTS.md`
2. Open and read `PROJECT_LOG.md`

Codex must use these files as the source of truth for decisions, structure, and what has already been done.

### Mandatory: use MCPs for stack-specific work

Whenever you are working with (or writing code involving) any of the following technologies, you MUST use the correct MCP to fetch the most current docs and best practices **before** generating code:

#### Use **Context7 MCP** for:

- Expo React Native
- NativeWind
- React Navigation
- TanStack Query (React Query)
- Zustand
- React Hook Form
- Zod
- Day.js

#### Use **Supabase MCP** for:

- Supabase Auth
- Postgres schema design
- SQL migrations
- Row Level Security (RLS) policies
- Storage buckets + storage policies
- Applying/verifying migrations (Dashboard SQL Editor / CLI guidance)

**Rule:** Prefer MCP guidance over assumptions.  
**Conflict resolution:** For anything Supabase-related, **Supabase MCP wins**. For everything else, **Context7 MCP wins**.

---

### Supabase migrations requirements (mandatory)

When creating/editing Supabase database work:

1. Store migrations in `/supabase/migrations` as numbered `.sql` files
2. Include in migrations where applicable:
   - required extensions (e.g., `pgcrypto` for UUID helpers if needed)
   - table definitions + constraints
   - indexes
   - `updated_at` trigger/function for tables that need it
   - enable RLS + create policies for each table in scope
3. Migrations should be reasonably idempotent:
   - use `if not exists` where supported
   - otherwise clearly `drop and recreate` with comments

Codex must also maintain a `/supabase/README.md` explaining exactly how to:

- apply migrations
- create the `org-logos` storage bucket
- set bucket access rules/policies
- verify RLS works for `owner` vs `instructor`

---

### General coding rules

When generating code:

1. Keep changes small and coherent per task
2. Follow the structure and patterns in this document
3. Prefer composition and shared primitives over duplicated styling
4. Add types everywhere (`any` only as a last resort)
5. Don’t add new libraries unless necessary; propose alternatives first

---

### Output expectations (build order)

Implement feature-by-feature:

1. Auth gate + login + onboarding (org + logo)
2. Students CRUD + archive + assign instructor
3. Lessons scheduling (Today view + edit)

---

### End-of-task checklist (mandatory)

At the end of EVERY task, before responding, Codex MUST:

1. Update `PROJECT_LOG.md` (append a new entry)
2. Provide a suggested git commit message (Conventional Commits)
3. Provide quick verification steps (how to test what changed)

If any checklist item cannot be completed, Codex must explicitly state:

- which item failed
- why it failed
- what is needed to complete it

---

## Project log (mandatory)

Codex MUST maintain a running project log file at:

- `PROJECT_LOG.md`

### Rules

1. At the start of EVERY task, Codex must:
   - open and read `PROJECT_LOG.md`
   - use it to understand the current state before making changes

2. At the end of EVERY task (after code changes), Codex must update `PROJECT_LOG.md` with:
   - **Date/time (Pacific/Auckland)** and a short task title
   - **What changed** (high-level summary)
   - **Files added/edited** (list)
   - **Commands run** (if any)
   - **How to verify** (steps to test)
   - **Notes / follow-ups** (any TODOs or risks)

3. Keep entries short and skimmable. Prefer bullet points.

### Template for each entry

Append entries to the bottom using:

- **Date:** YYYY-MM-DD (Pacific/Auckland)
- **Task:** <short title>
- **Summary:**
  - ...
- **Files changed:**
  - ...
- **Commands run:**
  - ...
- **Verification:**
  - ...
- **Notes/TODO:**
  - ...

---

## Commit message suggestion (mandatory)

After completing EVERY task, Codex must propose **one** high-quality git commit message.

### Rules

- Use **Conventional Commits** format:
  - `feat: ...`, `fix: ...`, `chore: ...`, `refactor: ...`, `docs: ...`, `test: ...`
- Message must be **imperative**, concise, and describe the main outcome.
- If the task touches multiple areas, mention the primary one and keep it short.
- Include a short optional body (2–5 bullet points) when helpful.

---

## Required response footer (mandatory)

Every task response MUST end with this exact footer format:

**PROJECT_LOG.md:** ✅ updated (or ❌ not updated — explain why)  
**Suggested commit message:** `<type>: <summary>`  
**Verification:**

- ...

---

## 18) Notes about future features

Explicitly later (not v1):

- Assessments/mock tests
- Google Calendar sync
- Push notifications
- Payments/subscriptions
- Multi-instructor advanced roles/permissions beyond owner/instructor
- Offline-first sync engine

Do not design v1 in a way that blocks these later.
