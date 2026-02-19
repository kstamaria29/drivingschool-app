import { useEffect } from "react";
import * as Notifications from "expo-notifications";

import { ensureAndroidNotificationChannels } from "./channels";
import { getCategoryPreferences, loadNotificationPreferences, type NotificationCategory } from "./preferences";

const ALLOWED_CATEGORIES: NotificationCategory[] = [
  "downloads",
  "student_reminders",
  "lesson_reminders",
  "daily_digest",
];

Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const rawCategory = notification.request.content.data?.category;
    const category =
      typeof rawCategory === "string" && ALLOWED_CATEGORIES.includes(rawCategory as NotificationCategory)
        ? (rawCategory as NotificationCategory)
        : null;

    const prefs = await loadNotificationPreferences();
    const soundEnabled = category ? getCategoryPreferences(prefs, category).soundEnabled : false;

    return {
      shouldPlaySound: soundEnabled,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

export function useConfigureNotifications() {
  useEffect(() => {
    void loadNotificationPreferences();
    void ensureAndroidNotificationChannels();
  }, []);
}

