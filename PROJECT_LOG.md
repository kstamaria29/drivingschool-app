# PROJECT_LOG.md

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

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test task list targets
- **Summary:**
  - Simplified Stage 1 and Stage 2 task list names and removed the 3-point turn item.
  - Added a right-aligned static reps target label per task in the task list.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test active border priority fix
- **Summary:**
  - Ensured expanded section borders (blue/orange/red) always override the "has values" darker border styling.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test section borders + overview badge styling
- **Summary:**
  - Updated Critical/Immediate active section borders to orange/red and added a darker border state for any section with recorded values.
  - Improved Session overview badges (Stage Reps/Faults with blue/red text, visible Critical/Immediate borders) and made gap taps collapse the active section reliably.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test overview badges + submit confirm styling
- **Summary:**
  - Made the submit confirmation modal show `Submit` in blue (and kept `Submit and Generate PDF` dark green) across all assessments.
  - Reworked the Restricted mock test Session overview badges (right-aligned Critical/Immediate badges + conditional borders) and slightly increased the student name size.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test Stage 2 lock + submit confirm modal
- **Summary:**
  - Styled Stage 2 `Locked` status in green and hid Stage 2 totals while locked.
  - Replaced submit confirmation alerts with a styled modal across all assessments and made the `Submit and Generate PDF` action dark green.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Mock test + student menu blue styling
- **Summary:**
  - Re-applied important blue/red highlight utilities so active borders and Repetitions/Faults stats render reliably, including kebab Start Assessment.
  - Added background-tap collapse support for the Restricted mock test and added a visual gap in the student kebab menu.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Student detail actions menu + background collapse
- **Summary:**
  - Moved Student Detail primary actions into the kebab menu (Start Assessment top, inline green badges, orange Archive) and removed the action buttons panel.
  - Updated Restricted Mock Test section collapse to also trigger when tapping the app background outside the centered container.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test section collapse + stat colors
- **Summary:**
  - Restored blue Repetitions/red Faults text and active-section blue borders for the Stage/Error sections.
  - Added tap-outside-to-collapse behavior and darkened the Session overview border with a larger student name.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test error totals placement + overview border
- **Summary:**
  - Moved Critical/Immediate totals under their headings as `Total Errors: x` (orange/red) and removed the top-right `x recorded` label.
  - Darkened the Session overview card border for stronger visual separation.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test stat color specificity fix
- **Summary:**
  - Forced Repetitions/Faults text colors (blue/red) using `!text-*` utilities so they are not overridden by base text classes.
  - Forced active-section blue borders using `!border-*` utilities so expanded section blocks visibly highlight as expected.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test repetition colors + active borders
- **Summary:**
  - Forced Repetitions (blue) and Faults (red) styling via text color styles so they render correctly across themes.
  - Restored active-section highlighting with a thicker blue border when a section is expanded.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test repetitions/faults header styling
- **Summary:**
  - Moved faults counts into the same line as repetitions for Stage headers, task cards, and the task modal (blue Repetitions, red Faults).
  - Swapped the Record Repetition icon to a Save icon and simplified modal header details.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test modal + overview polish
- **Summary:**
  - Updated task modal header (green Record Repetition with icon) and reset faults after recording a repetition.
  - Made sections accordion-style (only one open), added active-section blue borders, highlighted tasks with repetitions in orange, and compacted Session overview to 4 badges with student name.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test task modal spacing polish
- **Summary:**
  - Adjusted task modal scroll sizing so the modal shrinks to its content (removing excess whitespace while staying centered).
  - Updated the restricted mock test first-time guide to match the task popup workflow and repetition button placement.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test task modal + pre-drive grid
- **Summary:**
  - Arranged pre-drive fields into two-column rows (Date/Time, Vehicle/Route) for tablet-friendly data entry.
  - Replaced task dropdown cards with task buttons that open a modal (faults, location, notes), and moved Record repetition into the modal header.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** First-time guide for restricted mock test
- **Summary:**
  - Added a plain-language step-by-step guide for instructors using Mock Test - Restricted Licence for the first time.
  - Included workflow coverage for stages, faults, repetitions, error sections, submit options, and history/PDF follow-up.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test default collapse + show/hide colors
- **Summary:**
  - Set Stage 1, Critical errors, and Immediate failure errors to be collapsed by default when the Restricted mock test is initiated.
  - Added per-section Show/Hide color rules: blue/red for stage+error sections and lighter blue/red for task cards.

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Restricted mock test repetitions + UI polish
- **Summary:**
  - Added per-task repetition recording (with confirmation) and displayed repetition totals per task/stage in the Restricted mock test.
  - Kept the Restricted mock test header/student/overview sticky, redesigned fault selection as 2-column buttons, added collapsible errors, and included repetitions in PDF + assessment history.
