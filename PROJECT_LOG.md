# PROJECT_LOG.md

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Admin-only Feature Testing drawer screen
- **Summary:**
  - Added a new `Feature Testing` drawer destination above `Settings`, visible only to `admin` users.
  - Added a blank `Feature Testing` screen with a `Back` button and non-admin access guard messaging.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Assessments recent card route preselect + back flow
- **Summary:**
  - Tapping a card in `Last 5 Assessments` now opens `StudentAssessmentHistory` inside the Assessments stack with the tapped assessment type tab preselected.
  - Back from that history screen now returns to the Assessments screen rather than switching to the Students area.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Assessments recents card limit, org label, and history navigation
- **Summary:**
  - Updated the Assessments picker recents panel to show `Last 5 Assessments` instead of 3 and include each student's organization in brackets.
  - Made each recent assessment card navigable to that student's `StudentAssessmentHistory` screen.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Assessments screen recent history panel
- **Summary:**
  - Added a `Last 3 Assessments` section to the Assessments picker screen with latest entries, student names, assessment types, dates, and result/score summaries.
  - Added recent-assessments query support with student-name joins in the assessments API/query layer.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Session History button icon and label update
- **Summary:**
  - Updated the Session History header action from `Add new` to `New Session`.
  - Added a leading Lucide session-style clock icon to the `New Session` button.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Session icon and button-label capitalization polish
- **Summary:**
  - Replaced the Sessions `New Session` button plus icon with a session-style clock icon.
  - Updated Lessons and Students list action labels to `New Lesson` and `New Student`.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Sessions button label and icon update
- **Summary:**
  - Renamed the Sessions screen header action button from `Add new` to `New Session`.
  - Added a leading plus icon to the `New Session` button.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Sessions recents list set to 5
- **Summary:**
  - Updated the Sessions hub latest list query limit from `10` to `5`.
  - Renamed the Sessions subtitle text from `Latest 10 sessions` to `Last 5 sessions`.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Sessions hub with latest sessions and create modal
- **Summary:**
  - Added a new drawer + Home-accessible Sessions area with a latest-10 sessions list and tap-through into Student Session History while preserving back-to-sessions flow.
  - Added create-session from the Sessions screen using the Add Session History modal structure plus student autocomplete, and wired shared sessions query invalidation for recents/history sync.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Launch screen minimum duration set to 3 seconds
- **Summary:**
  - Increased `MIN_LAUNCH_DURATION_MS` from `900ms` to `3000ms` so the custom animated launch screen stays visible longer.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Custom animated launch screen + splash handoff
- **Summary:**
  - Added a branded animated React Native launch screen and startup state machine (fonts, boot readiness, minimum duration, failsafe timeout).
  - Wired `RootNavigation` boot-ready callback and native splash control using `expo-splash-screen` to reduce startup flicker.

---

- **Date:** 2026-02-11 (Pacific/Auckland)
- **Task:** Licence upload width set to 500px
- **Summary:**
  - Updated automatic licence card image resize width from `400px` to `500px` for Front/Back uploads.

---

- **Date:** 2026-02-11 (Pacific/Auckland)
- **Task:** Licence compression width + Stage 2 roundabout task
- **Summary:**
  - Updated licence card upload compression to use a max width of `400px` (from `580px`).
  - Added `Left turn at roundabout` (4 reps) to Restricted Stage 2 so assessment entry, history, and PDF use the same updated task set.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Compress licence card images on upload
- **Summary:**
  - Added `react-native-compressor` resizing/compression so Front/Back licence card uploads are reduced before storage.
  - Enforced a max width of `580px` for licence card images.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Assessment picker row + restricted history label cleanup
- **Summary:**
  - Updated the shared assessment student picker so selected student name and `Change student` appear on the same row.
  - Standardized Restricted Assessment History labels to `Mock Test - Restricted Licence`.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Student + assessment UX refinements
- **Summary:**
  - Improved student experience (swipeable licence photo viewer, clearer archive indicator, and kebab menu styling tweaks).
  - Refined assessments UX (integrated student search picker, Restricted history ordering, weather severity styling, and Restricted PDF session overview layout).

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test history + PDF refresh
- **Summary:**
  - Updated Assessment History + Restricted PDF output to reflect the new repetitions/fault counting model (including per-fault counts).
  - Ensured Stage 2 recorded items still render even when Stage 2 was not enabled (legacy/edge-case safety).

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test fault totals per repetition
- **Summary:**
  - Fixed fault totals so recording multiple repetitions increments Faults/Total Faults correctly (even when the same fault is selected again).
  - Updated the Turning movement fault label text.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test stage titles
- **Summary:**
  - Updated Stage 1 and Stage 2 section titles to simplified wording (duration-only) as requested.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test Stage 2 tasks + reps label styling
- **Summary:**
  - Restored the detailed Stage 2 task list with hard-coded reps targets per task (and kept Stage 1 targets).
  - Updated the task-list reps target text styling to match the task title (same weight/color).

---
