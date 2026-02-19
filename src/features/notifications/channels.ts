import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import type { NotificationCategory } from "./preferences";

const ANDROID_VIBRATION_PATTERN = [0, 250, 250, 250];

function baseCategoryId(category: NotificationCategory) {
  if (category === "downloads") return "downloads";
  if (category === "student_reminders") return "student-reminders";
  if (category === "lesson_reminders") return "lesson-reminders";
  return "daily-digest";
}

export function getAndroidNotificationChannelId(input: {
  category: NotificationCategory;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}) {
  const base = baseCategoryId(input.category);
  const soundTag = input.soundEnabled ? "sound" : "nosound";
  const vibrateTag = input.vibrationEnabled ? "vibrate" : "novibrate";
  return `${base}-${soundTag}-${vibrateTag}`;
}

function channelName(category: NotificationCategory, soundEnabled: boolean, vibrationEnabled: boolean) {
  const categoryLabel =
    category === "downloads"
      ? "Downloads"
      : category === "student_reminders"
        ? "Student reminders"
        : category === "lesson_reminders"
          ? "Upcoming lessons"
          : "Daily digest";

  const soundLabel = soundEnabled ? "Sound" : "No sound";
  const vibrationLabel = vibrationEnabled ? "Vibrate" : "No vibrate";
  return `${categoryLabel} (${soundLabel}, ${vibrationLabel})`;
}

export async function ensureAndroidNotificationChannels() {
  if (Platform.OS !== "android") return;

  const categories: NotificationCategory[] = [
    "downloads",
    "student_reminders",
    "lesson_reminders",
    "daily_digest",
  ];
  const combos = [
    { soundEnabled: true, vibrationEnabled: true },
    { soundEnabled: true, vibrationEnabled: false },
    { soundEnabled: false, vibrationEnabled: true },
    { soundEnabled: false, vibrationEnabled: false },
  ] as const;

  for (const category of categories) {
    for (const combo of combos) {
      const id = getAndroidNotificationChannelId({
        category,
        soundEnabled: combo.soundEnabled,
        vibrationEnabled: combo.vibrationEnabled,
      });

      await Notifications.setNotificationChannelAsync(id, {
        name: channelName(category, combo.soundEnabled, combo.vibrationEnabled),
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: combo.soundEnabled ? "default" : null,
        enableVibrate: combo.vibrationEnabled,
        vibrationPattern: combo.vibrationEnabled ? ANDROID_VIBRATION_PATTERN : null,
        showBadge: false,
      });
    }
  }
}

