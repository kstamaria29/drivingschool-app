import dayjs, { type Dayjs } from "dayjs";
import { Pressable, View } from "react-native";

import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type Props = {
  month: Dayjs;
  selectedDate: Dayjs;
  onSelectDate: (date: Dayjs) => void;
  lessonCountByDateISO?: Record<string, number>;
};

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeekMonday(date: Dayjs) {
  const day = date.day(); // 0 (Sun) - 6 (Sat)
  const offset = (day + 6) % 7; // 0 for Mon ... 6 for Sun
  return date.startOf("day").subtract(offset, "day");
}

function daysToRenderForMonth(month: Dayjs) {
  const first = startOfWeekMonday(month.startOf("month"));
  const last = startOfWeekMonday(month.endOf("month")).add(6, "day");

  const days: Dayjs[] = [];
  let cursor = first;
  while (cursor.isBefore(last) || cursor.isSame(last, "day")) {
    days.push(cursor);
    cursor = cursor.add(1, "day");
  }

  // Ensure a stable 6-row calendar grid (42 cells) for tablet layout.
  while (days.length < 42) {
    days.push(days[days.length - 1].add(1, "day"));
  }

  return days;
}

export function CalendarMonth({
  month,
  selectedDate,
  onSelectDate,
  lessonCountByDateISO,
}: Props) {
  const today = dayjs().startOf("day");
  const days = daysToRenderForMonth(month);
  const weeks: Dayjs[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  return (
    <View className="gap-3">
      <View className="flex-row justify-between">
        {weekDayLabels.map((label) => (
          <View key={label} className="flex-1 items-center">
            <AppText variant="caption">{label}</AppText>
          </View>
        ))}
      </View>

      <View className="gap-0">
        {weeks.map((week) => (
          <View
            key={`${week[0]?.format("YYYY-MM-DD") ?? "week"}`}
            className="flex-row"
          >
            {week.map((date) => {
              const inMonth = date.month() === month.month();
              const isSelected = date.isSame(selectedDate, "day");
              const isToday = date.isSame(today, "day");
              const dateISO = date.format("YYYY-MM-DD");
              const count = lessonCountByDateISO?.[dateISO] ?? 0;
              const dots = Math.min(count, 3);

              return (
                <View key={dateISO} className="flex-1 p-1">
                  <Pressable
                    onPress={() => onSelectDate(date)}
                    className={cn(
                      "h-16 justify-between rounded-xl border px-2 py-2",
                      inMonth
                        ? "border-border bg-card dark:border-borderDark dark:bg-cardDark"
                        : "border-border/50 bg-card/60 dark:border-borderDark/50 dark:bg-cardDark/60",
                      isToday && "border-accent dark:border-accent",
                      isSelected &&
                        "border-primary bg-primary/10 dark:border-primaryDark dark:bg-primaryDark/10",
                    )}
                  >
                    <View className="flex-row items-center justify-between">
                      <AppText
                        variant="body"
                        className={cn(!inMonth && "text-muted dark:text-mutedDark")}
                      >
                        {date.date()}
                      </AppText>
                      {isToday ? <View className="h-2 w-2 rounded-full bg-accent" /> : null}
                    </View>

                    {count > 0 ? (
                      <View className="flex-row items-center gap-1">
                        {Array.from({ length: dots }).map((_, index) => (
                          <View
                            // eslint-disable-next-line react/no-array-index-key
                            key={`${dateISO}-dot-${index}`}
                            className="h-2 w-2 rounded-full bg-primary dark:bg-primaryDark"
                          />
                        ))}
                        {count > 3 ? (
                          <AppText className="text-xs text-muted dark:text-mutedDark" variant="caption">
                            +{count - 3}
                          </AppText>
                        ) : null}
                      </View>
                    ) : (
                      <View className="h-2" />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
