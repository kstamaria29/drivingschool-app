# PROJECT_LOG.md

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

---

- **Date:** 2026-02-10 (Pacific/Auckland)
- **Task:** Assessment PDF header/logo styling
- **Summary:**
  - Added organization logo + student name to generated assessment PDFs (Driving Assessment, Restricted mock test, Full License mock test).
  - Standardized section borders across assessment PDFs to match the scoring guide style (darker border, square corners).

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab archive/delete true bold fix
- **Summary:**
  - Switched kebab `Archive/Unarchive` and `Delete` label rendering to `AppText` `button` variant (semibold font family) because utility `font-semibold` is overridden by the component-level font family on `body` variant.
  - Kept `Delete` label red and `Archive/Unarchive` green with the corrected bold rendering.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab archive/delete text emphasis
- **Summary:**
  - Updated kebab menu `Delete` label to explicit red text and made both `Archive/Unarchive` and `Delete` labels bold for stronger visual emphasis.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab menu hide zero badges
- **Summary:**
  - Updated Student Profile kebab menu badge rendering so Sessions, Reminders, and Assessments badges are hidden when the count is `0`.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab menu counts + reminders action polish
- **Summary:**
  - Added `Reminders` to the Student Profile kebab menu between Sessions and Assessments, renamed `Edit` to `Edit details`, and added right-side count badges for Sessions, Reminders, and Assessments.
  - Styled kebab `Archive/Unarchive` action text/icon green and updated the main profile action button to green `Set Reminders`.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab sizing consolidation + label/icon polish
- **Summary:**
  - Consolidated repetitive kebab-size adjustments into one record and finalized the trigger at `55px` square (`h-[55px] w-[55px]`) with a larger `30px` icon.
  - Increased the organization name text under the student title from `23px` to `24px`.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile second-visit clipping fix (ScrollView flex)
- **Summary:**
  - Removed `flex-1` container sizing from Student Profile scroll layout to prevent Android ScrollView content mis-measurement on revisit.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile focus reset for revisit stability
- **Summary:**
  - Fixed the second-visit action-row clipping pattern by resetting Student Detail transient UI state and scroll position every time the screen regains focus.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile second-visit action layout stabilization
- **Summary:**
  - Stabilized second-visit action button rendering by resetting Student Detail scroll/transient UI state on `studentId` changes and reducing badge row stacking side effects.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab action menu + remove bottom archive row
- **Summary:**
  - Replaced the top-right edit icon with a taller kebab action button and added a dropdown-style modal menu for Edit, Sessions, Assessments, Archive/Unarchive, and Delete.
  - Removed the bottom Archive/Delete buttons from Student Profile to simplify layout and avoid the intermittent action-row UI overlap state.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile badge overlap fix
- **Summary:**
  - Adjusted `AppButton` label-badge positioning and stacking so Student Profile count badges don't clip/overlap adjacent buttons.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Lessons editor UX + history badge fix
- **Summary:**
  - Fixed Student Profile history/reminder count badges so they position correctly on tablet portrait buttons.
  - Updated Lesson Create/Edit screens to use search-only student results, hide student selection on edit, hide instructor selection when no instructors exist, and exclude admin accounts.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Mobile portrait compact spacing pass
- **Summary:**
  - Reduced global card and picker modal padding for compact/mobile screens to fit more content per view.
  - Updated remaining screens to use compact gaps/modal padding while keeping tablet layouts unchanged.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Mobile portrait layout polish
- **Summary:**
  - Reduced mobile (compact) screen padding/spacing to fit more content without cramped cards.
  - Tightened key screens (Home quick-actions + titles, Student Detail header, and compact form spacing) while keeping tablet layouts unchanged.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Tablet landscape layouts + collapsed sidebar default
- **Summary:**
  - Improved tablet-landscape layouts across key screens (Home, Settings, Assessments, Student Detail, Lesson Edit) while keeping tablet-portrait unchanged.
  - Set the permanent sidebar to start collapsed in tablet-landscape and removed landscape max-width constraints to eliminate side whitespace.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Theme coverage for recent UI updates
- **Summary:**
  - Fixed missing theme classes for primary/border tokens in badges, dividers, avatars, and assessment history chips.
  - Updated a few icon color fallbacks to respect dark-mode palette variants.
