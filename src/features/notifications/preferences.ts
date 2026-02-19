import AsyncStorage from "@react-native-async-storage/async-storage";

import type { NotificationSettingsRow } from "./settings";

export type NotificationCategory = "downloads" | "student_reminders" | "lesson_reminders" | "daily_digest";

export type NotificationCategoryPreferences = {
  soundEnabled: boolean;
  vibrationEnabled: boolean;
};

export type NotificationPreferences = {
  downloads: NotificationCategoryPreferences;
  studentReminders: NotificationCategoryPreferences;
  lessonReminders: NotificationCategoryPreferences & {
    enabled: boolean;
    offsetsMinutes: number[];
  };
  dailyDigest: NotificationCategoryPreferences & {
    enabled: boolean;
    time: string; // HH:mm:ss
  };
};

const STORAGE_KEY = "drivingschool.notifications.preferences.v1";

const DEFAULT_PREFERENCES: NotificationPreferences = {
  downloads: { soundEnabled: true, vibrationEnabled: true },
  studentReminders: { soundEnabled: true, vibrationEnabled: true },
  lessonReminders: { enabled: true, soundEnabled: true, vibrationEnabled: true, offsetsMinutes: [60] },
  dailyDigest: { enabled: false, soundEnabled: false, vibrationEnabled: false, time: "07:00:00" },
};

let cached: NotificationPreferences | null = null;

function normalizeOffsets(offsets: number[]) {
  const allowed = new Set([30, 60, 180, 300, 1440, 2880]);
  const unique = [...new Set(offsets.filter((m) => Number.isFinite(m) && allowed.has(m)))];
  unique.sort((a, b) => a - b);
  return unique;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.length > 0) return value;
  return fallback;
}

function toNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => (typeof v === "number" ? v : Number(v))).filter((n) => Number.isFinite(n));
}

function fromUnknown(raw: unknown): NotificationPreferences {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFERENCES;
  const record = raw as Record<string, unknown>;
  const downloads = (record.downloads ?? {}) as Record<string, unknown>;
  const studentReminders = (record.studentReminders ?? {}) as Record<string, unknown>;
  const lessonReminders = (record.lessonReminders ?? {}) as Record<string, unknown>;
  const dailyDigest = (record.dailyDigest ?? {}) as Record<string, unknown>;

  return {
    downloads: {
      soundEnabled: toBoolean(downloads.soundEnabled, DEFAULT_PREFERENCES.downloads.soundEnabled),
      vibrationEnabled: toBoolean(
        downloads.vibrationEnabled,
        DEFAULT_PREFERENCES.downloads.vibrationEnabled,
      ),
    },
    studentReminders: {
      soundEnabled: toBoolean(
        studentReminders.soundEnabled,
        DEFAULT_PREFERENCES.studentReminders.soundEnabled,
      ),
      vibrationEnabled: toBoolean(
        studentReminders.vibrationEnabled,
        DEFAULT_PREFERENCES.studentReminders.vibrationEnabled,
      ),
    },
    lessonReminders: {
      enabled: toBoolean(lessonReminders.enabled, DEFAULT_PREFERENCES.lessonReminders.enabled),
      soundEnabled: toBoolean(
        lessonReminders.soundEnabled,
        DEFAULT_PREFERENCES.lessonReminders.soundEnabled,
      ),
      vibrationEnabled: toBoolean(
        lessonReminders.vibrationEnabled,
        DEFAULT_PREFERENCES.lessonReminders.vibrationEnabled,
      ),
      offsetsMinutes: normalizeOffsets(
        toNumberArray(lessonReminders.offsetsMinutes).length
          ? toNumberArray(lessonReminders.offsetsMinutes)
          : DEFAULT_PREFERENCES.lessonReminders.offsetsMinutes,
      ),
    },
    dailyDigest: {
      enabled: toBoolean(dailyDigest.enabled, DEFAULT_PREFERENCES.dailyDigest.enabled),
      soundEnabled: toBoolean(
        dailyDigest.soundEnabled,
        DEFAULT_PREFERENCES.dailyDigest.soundEnabled,
      ),
      vibrationEnabled: toBoolean(
        dailyDigest.vibrationEnabled,
        DEFAULT_PREFERENCES.dailyDigest.vibrationEnabled,
      ),
      time: toString(dailyDigest.time, DEFAULT_PREFERENCES.dailyDigest.time),
    },
  };
}

export async function loadNotificationPreferences(): Promise<NotificationPreferences> {
  if (cached) return cached;

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cached = DEFAULT_PREFERENCES;
      return cached;
    }

    const parsed = JSON.parse(raw) as unknown;
    cached = fromUnknown(parsed);
    return cached;
  } catch {
    cached = DEFAULT_PREFERENCES;
    return cached;
  }
}

export function getCachedNotificationPreferences() {
  return cached ?? DEFAULT_PREFERENCES;
}

export async function saveNotificationPreferences(next: NotificationPreferences) {
  cached = next;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function mergeAndSaveNotificationPreferences(
  patch: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  const current = await loadNotificationPreferences();
  const next: NotificationPreferences = {
    downloads: { ...current.downloads, ...(patch.downloads ?? {}) },
    studentReminders: { ...current.studentReminders, ...(patch.studentReminders ?? {}) },
    lessonReminders: {
      ...current.lessonReminders,
      ...(patch.lessonReminders ?? {}),
      offsetsMinutes: patch.lessonReminders?.offsetsMinutes
        ? normalizeOffsets(patch.lessonReminders.offsetsMinutes)
        : current.lessonReminders.offsetsMinutes,
    },
    dailyDigest: { ...current.dailyDigest, ...(patch.dailyDigest ?? {}) },
  };

  await saveNotificationPreferences(next);
  return next;
}

export function getCategoryPreferences(prefs: NotificationPreferences, category: NotificationCategory) {
  if (category === "downloads") return prefs.downloads;
  if (category === "student_reminders") return prefs.studentReminders;
  if (category === "lesson_reminders") return prefs.lessonReminders;
  return prefs.dailyDigest;
}

export function notificationPreferencesFromSettingsRow(
  row: NotificationSettingsRow,
): NotificationPreferences {
  return {
    downloads: {
      soundEnabled: Boolean(row.downloads_sound_enabled),
      vibrationEnabled: Boolean(row.downloads_vibration_enabled),
    },
    studentReminders: {
      soundEnabled: Boolean(row.student_reminders_sound_enabled),
      vibrationEnabled: Boolean(row.student_reminders_vibration_enabled),
    },
    lessonReminders: {
      enabled: Boolean(row.lesson_reminders_enabled),
      soundEnabled: Boolean(row.lesson_reminders_sound_enabled),
      vibrationEnabled: Boolean(row.lesson_reminders_vibration_enabled),
      offsetsMinutes: normalizeOffsets(row.lesson_reminder_offsets_minutes ?? []),
    },
    dailyDigest: {
      enabled: Boolean(row.daily_digest_enabled),
      soundEnabled: Boolean(row.daily_digest_sound_enabled),
      vibrationEnabled: Boolean(row.daily_digest_vibration_enabled),
      time: row.daily_digest_time ?? DEFAULT_PREFERENCES.dailyDigest.time,
    },
  };
}
