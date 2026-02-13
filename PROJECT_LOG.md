# PROJECT_LOG.md

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Fix ThemedBackdrop hook order crash
- **Summary:**
  - Removed conditional hook execution in `ThemedBackdrop` by making `useRef` and `useEffect` run on every render.
  - Fixed runtime hook-order errors when switching between themes with and without premium backdrops.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Themes screen free/premium sections + premium fonts
- **Summary:**
  - Split Themes screen into collapsible Free vs Premium blocks and auto-collapsed the non-selected group.
  - Added per-premium-theme typography via Google Fonts remote font loading so premium selections update the app font.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Premium themes + textured backdrops
- **Summary:**
  - Added 10 new premium theme presets (5 light, 5 dark) and surfaced premium labeling in the Themes list.
  - Added themed backdrop textures/gradients so premium themes feel materially different beyond color alone.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Theme selection first-update navbar color fix
- **Summary:**
  - Updated theme setter actions to apply theme colors synchronously before state updates so navigation reads fresh palette values immediately.
  - Fixed first theme selection in `Themes` screen not updating navbar/header colors until a later interaction.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Themes screen list-style selector
- **Summary:**
  - Replaced the Themes screen style dropdown with an always-visible list of theme presets.
  - Kept selected-theme highlighting and tap-to-select behavior for the active light/dark mode.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Move themes UI to dedicated screen
- **Summary:**
  - Added a new `Themes` screen in Settings stack and moved the full theme selector UI there.
  - Replaced the Settings page theme block with a top-level `Themes` navigation button above `Organization`.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Settings cards keep identity details when collapsed
- **Summary:**
  - Updated Settings collapsible behavior so `Organization` and `Account Settings` always show logo/avatar and summary text.
  - Restricted Show/Hide to control only the action buttons inside each card.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Settings organization/account collapsible sections
- **Summary:**
  - Made `Organization` and `Account Settings` cards collapsed by default with top-right `Show` controls.
  - Added toggle behavior so tapping `Show` expands card actions and switches the control to red `Hide`.

---

- **Date:** 2026-02-13 (Pacific/Auckland)
- **Task:** Navigation header theme preset reactivity fix
- **Summary:**
  - Updated all stack and drawer navigator theme option memos to depend on `themeKey` so header/drawer colors refresh when a theme preset is selected.
  - Fixed the top navbar color surface (hamburger/back/avatar row) not updating until scheme changes.

---

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
