# PROJECT_LOG.md

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Lessons reminders show student name
- **Summary:**
  - Updated Lessons selected-day Reminders list to show student name above reminder title.
  - Joined student names in the reminders date-range query used by the Lessons calendar.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Lessons agenda title + upcoming reminders student label
- **Summary:**
  - Added a Lessons section title in the Lessons agenda card for visual consistency with Reminders.
  - Updated Home Upcoming Reminders to show the student name more clearly.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Session History edit flow + Lessons agenda reminders
- **Summary:**
  - Defaulted Session History task suggestions to show and added an edit/update action for session entries.
  - Updated the Lessons agenda to list reminders for the selected day and removed the duplicate New button.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Lessons calendar reminder markers + legend
- **Summary:**
  - Replaced the Lessons calendar today dot with a circled day highlight and added reminder markers with a legend.
  - Updated the weekly strip to show lesson vs reminder markers consistently.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Assessment blank screen scroll fix
- **Summary:**
  - Fixed assessment screens rendering blank until you scroll by forcing the ScrollView to reset to top on focus and after student/test resets.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Assessment submit options + upcoming reminders
- **Summary:**
  - Added `Submit` vs `Submit and Generate PDF` options across assessments and hardened navigation/state resets so each new assessment starts cl...
  - Added Home `Upcoming Reminders` (5 soonest) and sorted reminders by reminder date/time for consistent ordering.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Reminders modal time hint sync + assessment student switch fix
- **Summary:**
  - Updated Add Reminder modal title to `Add New Reminder` and made the notification helper text dynamically reflect the currently selected remi...
  - Fixed assessment submit/start navigation so completed assessment screens are popped to `AssessmentsMain` on submit, preventing stale student...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Reminders screen modal create flow + simplified layout
- **Summary:**
  - Removed the top Reminders summary container and switched `Add new` to a full modal create flow with `Title`, input, `Date`, `Time`, and `Not...
  - Added a `2 days before` notification option and wired reminder `Time` through DB + notification scheduling while keeping the requested helpe...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Assessment submit return-to-profile flow + driving suggestion priority
- **Summary:**
  - Updated all assessment submit flows to return to `StudentDetail` when launched from Student Profile, instead of dropping users on the Assess...
  - Moved the "Smoother Steering Control - Avoid oversteering..." improvement suggestion to the top of the Driving Assessment suggestions list.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student reminders feature + Student Profile action-row redesign
- **Summary:**
  - Added a new student Reminders flow: dedicated screen, reminder list, create/delete actions, reminder date, and notification lead-time option...
  - Updated Student Profile actions by replacing top-right `Add session` with icon-only Edit and replacing the lower `Edit` button with `Reminde...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile organization size, dark-green archive buttons, and safer bottom-action spacing
- **Summary:**
  - Updated Student Profile organization subtitle text under the student name to `23px` and changed Archive/Unarchive buttons to dark green.
  - Added a minimum spacer before Archive/Delete actions so destructive buttons are consistently lower and require scroll access on tighter prof...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student profile style tweaks + active assessment back confirmation
- **Summary:**
  - Updated Student Profile organization text under the student name to `25px` and set Archive/Unarchive actions to green styling.
  - Added a shared assessment leave-guard across Driving, Restricted, and Full mock test screens to confirm before leaving once a test is in pro...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile history badge placement and 2-digit badge fix
- **Summary:**
  - Updated Student Profile `Session History` and `Assessment History` buttons so count badges sit at the top-right of the label text instead of...
  - Hardened badge pill sizing/text behavior to keep multi-digit counts on one line.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Global back button beside header menu with Home fallback
- **Summary:**
  - Added a shared header-left menu+back control across main app stacks so screens include both hamburger and back buttons, while Home keeps no....
  - Back action now uses stack `goBack()` when possible and falls back to drawer navigation to `HomeDashboard` as the final destination.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Lessons calendar square connected date cells
- **Summary:**
  - Updated the Lessons month calendar date cells to remove rounded corners and remove spacing so cells connect as a continuous grid.
  - Updated the weekly date strip in the Lessons agenda card to use square, connected date boxes for consistent calendar styling.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Students drawer reset + Student Profile bottom action grid
- **Summary:**
  - Updated sidebar `Students` navigation to always open `StudentsList` instead of returning to previously viewed student profile screens.
  - Reworked Student Profile bottom actions into 2-column rows with requested order and styling, including blue `Start Assessment` with icon and...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student profile address layout stabilization + assessment picker collapse
- **Summary:**
  - Refactored Student Profile detail-field sizing so full-width Address renders consistently inside the Contact card and reduced organization n...
  - Updated assessment student dropdown behavior to auto-collapse when a student is pre-selected (including launches from Student Profile `Start...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student assessment launch modal + mock-test start modals
- **Summary:**
  - Set Student Profile organization text to `25px`, added a `Start Assessment` action button, and added an assessment-type modal that deep-link...
  - Updated Driving Assessment modal wording to `You are about to start assessing ...` and added equivalent start-confirmation modals to Restric...

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Maps pin-panel redesign + assessment picker and start-flow updates
- **Summary:**
  - Removed Google Maps top `Pin colors` panel, redesigned selected-pin actions/details (icon-only delete, color picker button, tip + right-alig...
  - Updated assessment student picker behavior to only show results after typing search text, switched Driving Assessment start confirmation to....

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student profile detail-card layout refresh
- **Summary:**
  - Restyled Student Profile Contact and Licence details into left-aligned boxed fields that match the licence photo action button visual style.
  - Reordered Contact/Licence rows to the requested 2-column structure, moved organization under the student name with an icon, and pushed Archi...
