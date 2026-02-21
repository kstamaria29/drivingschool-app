# PROJECT_LOG.md

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Restricted history feedback ordering
- **Summary:**
  - Moved General feedback + Improvement(s) needed cards to sit directly under Overview for restricted mock tests.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Restricted mock test PDF page break + suggestion auto-open
- **Summary:**
  - Auto-opened suggestions when tapping into task errors and feedback textboxes, and renamed Improvement needed to Improvement(s) needed across UI/history/PDF.
  - Adjusted Restricted PDF layout so feedback stays on page 1 and Stage 1/2 start on page 2.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Restricted mock test repetition errors + modal polish
- **Summary:**
  - Saved task Critical/Immediate errors per repetition (snapshotted on Record Repetition) and updated History + PDF to render Repetition #N sections.
  - Redesigned the task modal (90% height, full-width card) and improved suggestion UX (tap outside to hide, auto-hide on record).

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Restricted mock test feedback + task errors
- **Summary:**
  - Replaced per-task notes with Critical/Immediate error fields (multi-select suggestions) and saved them per task.
  - Replaced global Critical/Immediate blocks with General feedback/Improvement needed and updated history + PDF output.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Notifications test buttons for all roles
- **Summary:**
  - Made “Send test notification” buttons visible for owners and instructors (not admin-only).

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Notifications screen spacing + push button polish
- **Summary:**
  - Removed the extra gap between section titles and captions and ensured Upcoming lessons defaults to a 1-hour notify offset.
  - Made the push "Register this device" button green when this device is not registered and disabled it when already registered.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Notifications settings simplify toggles
- **Summary:**
  - Simplified notification category settings to On/Off segmented controls only (removed Sound/Vibration UI and defaulted both to On when enabled).
  - Disabling Downloads/Student reminders now prevents local notifications and clears scheduled reminder alerts on the device.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Notifications screen compact toggles
- **Summary:**
  - Switched notification settings to larger blue/grey toggle switches and combined section title, enable, sound, and vibration controls into a single row.
  - Reduced whitespace with a two-column layout: title + enable on the left, sound/vibration controls right-aligned on the right.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Notifications screen toggle switches
- **Summary:**
  - Replaced On/Off segmented controls with right-aligned toggle switches and slightly larger labels.
  - Restricted "Send test notification" buttons to `admin` users only.

---

- **Date:** 2026-02-21 (Pacific/Auckland)
- **Task:** Android FCM setup for push notifications
- **Summary:**
  - Added Expo Android `googleServicesFile` config so Android devices can register for push notifications.
  - Documented the required Firebase/EAS FCM credential setup steps for Android push delivery.

---

- **Date:** 2026-02-19 (Pacific/Auckland)
- **Task:** Notifications preferences + lesson alerts
- **Summary:**
  - Added per-category sound/vibration preferences, test notifications, and push-token registration for cross-device alerts.
  - Added upcoming-lesson offsets + daily digest settings, plus Supabase tables/Edge Functions for scheduled push delivery.

---

- **Date:** 2026-02-19 (Pacific/Auckland)
- **Task:** Settings notifications screen
- **Summary:**
  - Added a `Notifications` button above `Themes` in Settings.
  - Added a Notifications screen to show permission status and open/request device notification permissions.

---

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
