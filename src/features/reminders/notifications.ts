import AsyncStorage from "@react-native-async-storage/async-storage";
import dayjs from "dayjs";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { formatIsoDateToDisplay } from "../../utils/dates";
import { getAndroidNotificationChannelId } from "../notifications/channels";
import { loadNotificationPreferences } from "../notifications/preferences";

import { getReminderOffsetLabel } from "./constants";
import type { StudentReminder } from "./api";

const REMINDER_STORAGE_KEY_PREFIX = "drivingschool.student-reminders.notifications.v1";
const DEFAULT_REMINDER_TIME = "09:00";

type ReminderNotificationState = {
  ids: string[];
  signature: string;
};

type ReminderNotificationMap = Record<string, ReminderNotificationState>;

function storageKey(userId: string) {
  return `${REMINDER_STORAGE_KEY_PREFIX}:${userId}`;
}

function normalizeOffsets(offsets: number[]) {
  const unique = [...new Set(offsets.filter((offset) => Number.isFinite(offset) && offset > 0))];
  unique.sort((a, b) => b - a);
  return unique;
}

function reminderSignature(reminder: StudentReminder) {
  return `${reminder.reminder_date}|${reminder.reminder_time}|${normalizeOffsets(reminder.notification_offsets_minutes).join(",")}|${reminder.title}`;
}

async function loadReminderMap(userId: string): Promise<ReminderNotificationMap> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return {};

    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};

    const normalized: ReminderNotificationMap = {};
    for (const [reminderId, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        normalized[reminderId] = { ids: value.filter((id) => typeof id === "string"), signature: "" };
        continue;
      }

      if (value && typeof value === "object") {
        const record = value as { ids?: unknown; signature?: unknown };
        normalized[reminderId] = {
          ids: Array.isArray(record.ids) ? record.ids.filter((id) => typeof id === "string") : [],
          signature: typeof record.signature === "string" ? record.signature : "",
        };
      }
    }
    return normalized;
  } catch {
    return {};
  }
}

async function saveReminderMap(userId: string, map: ReminderNotificationMap) {
  await AsyncStorage.setItem(storageKey(userId), JSON.stringify(map));
}

async function cancelScheduledIds(ids: string[]) {
  for (const id of ids) {
    try {
      await Notifications.cancelScheduledNotificationAsync(id);
    } catch {
      // Ignore missing/expired IDs and continue cleanup.
    }
  }
}

function normalizeReminderTime(reminderTime: string | null | undefined) {
  const match = reminderTime?.match(/^([01]\d|2[0-3]):[0-5]\d/);
  return match ? match[0] : DEFAULT_REMINDER_TIME;
}

function formatReminderTimeLabel(reminderTime: string) {
  const normalizedTime = normalizeReminderTime(reminderTime);
  return dayjs(`2000-01-01T${normalizedTime}:00`).format("h:mm A");
}

function buildReminderBaseDate(reminderDateISO: string, reminderTime: string) {
  const normalizedTime = normalizeReminderTime(reminderTime);
  const parsed = dayjs(`${reminderDateISO}T${normalizedTime}:00`);
  if (!parsed.isValid()) return null;
  return parsed.second(0).millisecond(0);
}

function getUpcomingOffsets(reminder: StudentReminder, now: dayjs.Dayjs) {
  const baseDate = buildReminderBaseDate(reminder.reminder_date, reminder.reminder_time);
  if (!baseDate) return [];

  return normalizeOffsets(reminder.notification_offsets_minutes).filter((offsetMinutes) =>
    baseDate.subtract(offsetMinutes, "minute").isAfter(now.add(5, "second")),
  );
}

async function scheduleNotificationsForOffsets(input: {
  reminder: StudentReminder;
  studentName: string;
  offsets: number[];
}) {
  const prefs = await loadNotificationPreferences();
  const categoryPrefs = prefs.studentReminders;
  if (!categoryPrefs.soundEnabled && !categoryPrefs.vibrationEnabled) return [];

  const androidChannelId = getAndroidNotificationChannelId({
    category: "student_reminders",
    soundEnabled: categoryPrefs.soundEnabled,
    vibrationEnabled: categoryPrefs.vibrationEnabled,
  });

  const baseDate = buildReminderBaseDate(
    input.reminder.reminder_date,
    input.reminder.reminder_time,
  );
  if (!baseDate) return [];

  const ids: string[] = [];

  for (const offsetMinutes of input.offsets) {
    const triggerDate = baseDate.subtract(offsetMinutes, "minute");

    const trigger: Notifications.DateTriggerInput =
      Platform.OS === "android"
        ? {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate.toDate(),
            channelId: androidChannelId,
          }
        : {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate.toDate(),
          };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: `Reminder: ${input.reminder.title}`,
        body: `${input.studentName} - ${formatIsoDateToDisplay(input.reminder.reminder_date)} ${formatReminderTimeLabel(input.reminder.reminder_time)} (${getReminderOffsetLabel(offsetMinutes)})`,
        ...(categoryPrefs.soundEnabled ? { sound: "default" } : null),
        data: {
          category: "student_reminders",
          reminderId: input.reminder.id,
          studentId: input.reminder.student_id,
        },
      },
      trigger,
    });

    ids.push(id);
  }

  return ids;
}

export async function requestReminderNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });

  return requested.status === "granted";
}

export async function cancelReminderNotificationsForReminder(input: {
  userId: string;
  reminderId: string;
}) {
  const map = await loadReminderMap(input.userId);
  const state = map[input.reminderId];
  if (!state) return 0;

  await cancelScheduledIds(state.ids);
  delete map[input.reminderId];
  await saveReminderMap(input.userId, map);
  return state.ids.length;
}

export async function cancelAllReminderNotificationsForUser(input: { userId: string }) {
  const map = await loadReminderMap(input.userId);
  const ids = [
    ...new Set(
      Object.values(map)
        .flatMap((state) => state.ids)
        .filter((id) => typeof id === "string" && id.length > 0),
    ),
  ];

  await cancelScheduledIds(ids);
  await saveReminderMap(input.userId, {});
  return ids.length;
}

export async function scheduleReminderNotificationsForReminder(input: {
  userId: string;
  reminder: StudentReminder;
  studentName: string;
}) {
  const prefs = await loadNotificationPreferences();
  const categoryPrefs = prefs.studentReminders;
  const enabled = categoryPrefs.soundEnabled || categoryPrefs.vibrationEnabled;
  if (!enabled) {
    await cancelAllReminderNotificationsForUser({ userId: input.userId });
    return { permissionGranted: true, scheduledCount: 0 };
  }

  const map = await loadReminderMap(input.userId);
  const existing = map[input.reminder.id];
  if (existing) {
    await cancelScheduledIds(existing.ids);
    delete map[input.reminder.id];
  }

  const permissionGranted = await requestReminderNotificationPermission();
  if (!permissionGranted) {
    await saveReminderMap(input.userId, map);
    return { permissionGranted: false, scheduledCount: 0 };
  }

  const now = dayjs();
  const upcomingOffsets = getUpcomingOffsets(input.reminder, now);
  if (!upcomingOffsets.length) {
    await saveReminderMap(input.userId, map);
    return { permissionGranted: true, scheduledCount: 0 };
  }

  const ids = await scheduleNotificationsForOffsets({
    reminder: input.reminder,
    studentName: input.studentName,
    offsets: upcomingOffsets,
  });

  map[input.reminder.id] = {
    ids,
    signature: reminderSignature(input.reminder),
  };
  await saveReminderMap(input.userId, map);

  return { permissionGranted: true, scheduledCount: ids.length };
}

export async function syncReminderNotificationsForStudent(input: {
  userId: string;
  studentName: string;
  reminders: StudentReminder[];
}) {
  const prefs = await loadNotificationPreferences();
  const categoryPrefs = prefs.studentReminders;
  const enabled = categoryPrefs.soundEnabled || categoryPrefs.vibrationEnabled;
  if (!enabled) {
    await cancelAllReminderNotificationsForUser({ userId: input.userId });
    return { permissionGranted: true, scheduledCount: 0 };
  }

  const map = await loadReminderMap(input.userId);
  const activeReminderIds = new Set(input.reminders.map((reminder) => reminder.id));

  for (const [reminderId, state] of Object.entries(map)) {
    if (activeReminderIds.has(reminderId)) continue;
    await cancelScheduledIds(state.ids);
    delete map[reminderId];
  }

  const permissionGranted = await requestReminderNotificationPermission();
  if (!permissionGranted) {
    await saveReminderMap(input.userId, map);
    return { permissionGranted: false, scheduledCount: 0 };
  }

  let scheduledCount = 0;
  const now = dayjs();

  for (const reminder of input.reminders) {
    const upcomingOffsets = getUpcomingOffsets(reminder, now);
    const existing = map[reminder.id];
    const nextSignature = reminderSignature(reminder);

    if (!upcomingOffsets.length) {
      if (existing?.ids.length) await cancelScheduledIds(existing.ids);
      delete map[reminder.id];
      continue;
    }

    if (
      existing &&
      existing.signature === nextSignature &&
      existing.ids.length === upcomingOffsets.length
    ) {
      continue;
    }

    if (existing?.ids.length) await cancelScheduledIds(existing.ids);

    const ids = await scheduleNotificationsForOffsets({
      reminder,
      studentName: input.studentName,
      offsets: upcomingOffsets,
    });

    map[reminder.id] = {
      ids,
      signature: nextSignature,
    };
    scheduledCount += ids.length;
  }

  await saveReminderMap(input.userId, map);
  return { permissionGranted: true, scheduledCount };
}
