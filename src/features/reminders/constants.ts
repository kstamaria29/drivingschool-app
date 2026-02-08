export const reminderNotificationOptions = [
  { value: 30, label: "30 min before" },
  { value: 60, label: "1 hour before" },
  { value: 180, label: "3 hours before" },
  { value: 1440, label: "1 day before" },
] as const;

const reminderOptionMap: Map<number, string> = new Map(
  reminderNotificationOptions.map((option) => [option.value, option.label]),
);

export function getReminderOffsetLabel(offsetMinutes: number) {
  const known = reminderOptionMap.get(offsetMinutes);
  if (known) return known;

  if (offsetMinutes % 1440 === 0) {
    const days = Math.floor(offsetMinutes / 1440);
    return `${days} day${days === 1 ? "" : "s"} before`;
  }

  if (offsetMinutes % 60 === 0) {
    const hours = Math.floor(offsetMinutes / 60);
    return `${hours} hour${hours === 1 ? "" : "s"} before`;
  }

  return `${offsetMinutes} min before`;
}

export function formatReminderOffsets(offsets: number[]) {
  const unique = [...new Set(offsets)];
  unique.sort((a, b) => b - a);
  return unique.map((offset) => getReminderOffsetLabel(offset)).join(", ");
}
