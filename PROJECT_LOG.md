# PROJECT_LOG.md

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Full badge orange + compact logging system
- **Summary:**
  - Changed the Students screen `Full` licence badge color from green to orange.
  - Replaced the heavy log format with compact `Date/Task/Summary` entries and reduced archive size significantly.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Students list organization label + licence badge styling update
- **Summary:**
  - Replaced the Students table row text next to the licence badge from licence type labels to the student `organization_name`.
  - Renamed the right-side column header from `Licence` to `Organization` while keeping the L/R/F circular badge visible.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Organization picker modal UX + left-aligned selected value
- **Summary:**
  - Updated `New/Edit student` Organization field to show selected value left-aligned in the trigger button (e.g., `Private`).
  - Replaced inline organization dropdown expansion with a modal action-sheet style picker (matching the photo options modal pattern).

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Student delete warning + history cascade cleanup + licence photo UI polish
- **Summary:**
  - Updated student delete API flow to remove related `student_sessions` and `assessments` records before deleting the student row.
  - Kept storage cleanup on delete and now removes all files under `student-licenses/<organization_id>/<student_id>/` as part of the delete flow...

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Delete student licence files on student delete + crop-label feasibility check
- **Summary:**
  - Updated student delete flow to first fetch the student's `organization_id`, delete all files under `student-licenses/<organization_id>/<stud...
  - This ensures licence front/back images are removed from Supabase Storage when a student is deleted.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Reset Students filters on revisit + student photo options UX polish
- **Summary:**
  - Updated `Students` screen focus behavior so every re-entry resets controls to defaults: `Status=Active`, `Sort=Recent`, `By organization=Off...
  - Updated `Edit student` assignable instructor list to always exclude `admin` role entries.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Refine student licence photo management + add date of birth
- **Summary:**
  - Added `students.date_of_birth` support end-to-end (migration `018`, Supabase types, Add/Edit form field with date picker, save/update mappin...
  - Updated Student Profile to display `Address: <value>` inline, show date of birth and computed age, and capitalize licence type labels (`Lear...

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Add student licence front/back photo upload + profile gallery viewer
- **Summary:**
  - Added student licence photo upload support in the student feature API/query layer with storage upload + signed URL persistence (`license_fro...
  - Added Supabase migration `017_students_license_images.sql` and storage policy script for private `student-licenses` bucket paths (`<organiza...

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Refine student assignment dropdown + organization show-all order + profile action placement
- **Summary:**
  - Updated `New student` owner/admin assignment UX to use an instructor dropdown instead of listing all instructor buttons.
  - Added a left-aligned trigger button label (`Assign new student to an Instructor`) with centered dropdown choices and centered selected state...

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Add student organization field + list filtering
- **Summary:**
  - Added `Organization` input to `New/Edit student` directly below Address, with quick-pick options (`Private`, `UMMA Trust`, `Renaissance`, `L...
  - Persisted `organization_name` in students CRUD payloads and added schema/type support across form validation and Supabase table typings.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** App-wide tablet keyboard avoidance for bottom-half inputs
- **Summary:**
  - Updated shared `Screen` keyboard behavior so tablet portrait keyboard avoidance now applies to both scroll and non-scroll screens.
  - Lowered tablet detection threshold from `768` to `600` width to cover common Android tablet sizes.

---

- **Date:** 2026-02-08 (Pacific/Auckland)
- **Task:** Google Maps pin color categories + configurable defaults
- **Summary:**
  - Added marker color categories on Google Maps so pins are visually differentiated for active students, other instructor's students, custom pi...
  - Added a Pin colors editor in the top Google Maps panel with color swatches, plus a Reset action.

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Students pagination, assessment dropdown picker, optional driving scoring UX, and lesson/profile cou...
- **Summary:**
  - Added a new reusable assessment student dropdown with search and scrollable list behavior, showing up to 6 visible rows, alphabetized with t...
  - Replaced the old button-list student selectors in all three assessment start screens with the dropdown flow.

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Group other instructors' students in assessment pickers
- **Summary:**
  - Updated `Driving Assessment`, `Mock Test - Restricted Licence`, and `Mock Test - Full License` student pickers so owner/admin `Show` mode no...
  - Added grouped picker layout in `Show` mode: `Your students` block first, followed by separate instructor blocks below, each labeled with the...

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Assessments student filtering toggle + full mock optional spoken fields
- **Summary:**
  - Updated all three assessment student selectors (`Driving Assessment`, `Mock Test - Restricted Licence`, `Mock Test - Full License`) so owner...
  - Added a right-aligned `Other Instructor's Students` segmented toggle (`Hide`/`Show`) on the same row as the `Student` heading in those three...

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Refactor Batch 2+3: query invalidation helpers + shared async UI states
- **Summary:**
  - Added `invalidateQueriesByKey` helper to centralize parallel React Query cache invalidation calls and reduced duplicated invalidation blocks...
  - Added reusable async-state UI primitives (`CenteredLoadingState`, `ErrorStateCard`, `EmptyStateCard`) for consistent loading/error/empty ren...

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Batch 1 refactor: dead code cleanup + type safety hardening
- **Summary:**
  - Removed unreachable navigation/screen code (`MainTabsNavigator`, `EditNameScreen`) and related unused account name-update schema/query/api p...
  - Replaced remaining real `any` usages with typed alternatives in weather parsing and driving-assessment RHF field-path wiring.

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Add drawer sign-out with confirmation
- **Summary:**
  - Added a `Sign out` action in the sidebar menu above the bottom divider/settings block.
  - Added a confirmation alert (`Cancel` / `Sign out`) before signing out.

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Add delete actions and save confirmations for students/lessons
- **Summary:**
  - Excluded `admin` from assignable instructor options on `New student` and `New lesson` screens.
  - Added save confirmations for `Edit student` and for both `New lesson`/`Edit lesson` submissions.

---

- **Date:** 2026-02-07 (Pacific/Auckland)
- **Task:** Refactor AGENTS.md using full project log history
- **Summary:**
  - Reviewed all entries in `PROJECT_LOG.md` and `docs/logs/PROJECT_LOG_ARCHIVE.md` to align instructions with current implemented behavior.
  - Replaced the oversized spec-style `AGENTS.md` with a concise operations guide focused on current app reality and durable working rules.
