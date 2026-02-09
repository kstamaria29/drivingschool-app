# PROJECT_LOG.md

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile second-visit clipping fix (ScrollView flex)
- **Summary:**
  - Removed `flex-1` container sizing from Student Profile scroll layout to prevent Android ScrollView content mis-measurement on revisit.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile focus reset + kebab 12x12
- **Summary:**
  - Updated the Student Profile kebab trigger to `h-12 w-12`.
  - Fixed the second-visit action-row clipping pattern by resetting Student Detail transient UI state and scroll position every time the screen regains focus.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab resize + second-visit action layout stabilization
- **Summary:**
  - Resized the Student Profile kebab trigger to `h-10 w-10` as requested.
  - Stabilized second-visit action button rendering by resetting Student Detail scroll/transient UI state on `studentId` changes and reducing badge row stacking side effects.

---

- **Date:** 2026-02-09 (Pacific/Auckland)
- **Task:** Student Profile kebab button square sizing
- **Summary:**
  - Updated the Student Profile top-right kebab action trigger to use square dimensions for both tablet and compact layouts.

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

---

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
