import dayjs, { type Dayjs } from "dayjs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { CalendarDays, CalendarPlus, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react-native";

import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CenteredLoadingState } from "../../components/AsyncState";
import { CalendarMonth } from "../../components/CalendarMonth";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useMyProfileQuery } from "../../features/auth/queries";
import { useAuthSession } from "../../features/auth/session";
import { useLessonsQuery } from "../../features/lessons/queries";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { LessonsStackParamList } from "../LessonsStackNavigator";

type Props = NativeStackScreenProps<LessonsStackParamList, "LessonsList">;

function startOfWeekMonday(date: Dayjs) {
  const day = date.day(); // 0 (Sun) - 6 (Sat)
  const offset = (day + 6) % 7; // 0 for Mon ... 6 for Sun
  return date.startOf("day").subtract(offset, "day");
}

function statusLabel(status: "scheduled" | "completed" | "cancelled") {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

export function LessonsListScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const isCompact = Math.min(width, height) < 600;
  const isTabletLandscape = !isCompact && width > height;

  const { session } = useAuthSession();
  const profileQuery = useMyProfileQuery(session?.user.id);

  const [month, setMonth] = useState(() => dayjs().startOf("month"));
  const [selectedDate, setSelectedDate] = useState(() => dayjs().startOf("day"));

  const { fromISO, toISO } = useMemo(() => {
    const from = startOfWeekMonday(month.startOf("month"));
    const to = startOfWeekMonday(month.endOf("month")).add(6, "day").add(1, "day");
    return { fromISO: from.toISOString(), toISO: to.toISOString() };
  }, [month]);

  const lessonsQuery = useLessonsQuery({ fromISO, toISO });
  const isInstructor = profileQuery.data?.role === "instructor";

  const { lessonCountByDateISO, lessonsForSelectedDay } = useMemo(() => {
    const counts: Record<string, number> = {};
    const selectedISO = selectedDate.format("YYYY-MM-DD");

    const all = lessonsQuery.data ?? [];
    for (const lesson of all) {
      const dateISO = dayjs(lesson.start_time).format("YYYY-MM-DD");
      counts[dateISO] = (counts[dateISO] ?? 0) + 1;
    }

    const lessonsForDay = all
      .filter((lesson) => dayjs(lesson.start_time).format("YYYY-MM-DD") === selectedISO)
      .sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());

    return { lessonCountByDateISO: counts, lessonsForSelectedDay: lessonsForDay };
  }, [lessonsQuery.data, selectedDate]);

  function onPrevMonth() {
    setMonth((currentMonth) => {
      const next = currentMonth.subtract(1, "month");
      setSelectedDate((currentSelected) =>
        currentSelected.isSame(next, "month") ? currentSelected : next.startOf("month"),
      );
      return next;
    });
  }

  function onNextMonth() {
    setMonth((currentMonth) => {
      const next = currentMonth.add(1, "month");
      setSelectedDate((currentSelected) =>
        currentSelected.isSame(next, "month") ? currentSelected : next.startOf("month"),
      );
      return next;
    });
  }

  function onToday() {
    const today = dayjs().startOf("day");
    setSelectedDate(today);
    setMonth(today.startOf("month"));
  }

  const lessonCards = lessonsForSelectedDay.map((lesson) => {
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const studentName = lesson.students
      ? `${lesson.students.first_name} ${lesson.students.last_name}`
      : "Student";

    return (
      <Pressable key={lesson.id} onPress={() => navigation.navigate("LessonEdit", { lessonId: lesson.id })}>
        <View className="rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 dark:border-borderDark dark:bg-cardDark dark:shadow-black/30">
          <View className="flex-row items-start gap-4">
            <View className="w-20 items-center rounded-xl border border-border bg-background px-2 py-2 dark:border-borderDark dark:bg-backgroundDark">
              <AppText className="text-xs" variant="caption">
                {start.format("h:mm")}
              </AppText>
              <AppText className="text-xs" variant="caption">
                {start.format("A")}
              </AppText>
              <View className="my-1 h-px w-10 bg-border dark:bg-borderDark" />
              <AppText className="text-xs" variant="caption">
                {end.format("h:mm")}
              </AppText>
              <AppText className="text-xs" variant="caption">
                {end.format("A")}
              </AppText>
            </View>

            <View className="flex-1 gap-1">
              <View className="flex-row items-start justify-between gap-3">
                <AppText className="flex-1" variant="heading">
                  {studentName}
                </AppText>
                <AppBadge variant={lesson.status} label={statusLabel(lesson.status)} />
              </View>
              {lesson.location ? <AppText variant="caption">{lesson.location}</AppText> : null}
              {lesson.notes ? (
                <AppText numberOfLines={2} variant="caption">
                  {lesson.notes}
                </AppText>
              ) : null}
            </View>
          </View>
        </View>
      </Pressable>
    );
  });

  const weekStart = useMemo(() => startOfWeekMonday(selectedDate), [selectedDate]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => weekStart.add(index, "day")), [weekStart]);

  const weekStrip = (
    <View className="flex-row gap-0">
      {weekDays.map((date) => {
        const dateISO = date.format("YYYY-MM-DD");
        const isSelected = date.isSame(selectedDate, "day");
        const count = lessonCountByDateISO[dateISO] ?? 0;

        return (
          <Pressable
            key={dateISO}
            onPress={() => setSelectedDate(date.startOf("day"))}
            className={cn(
              "flex-1 rounded-none border px-2 py-2",
              isSelected
                ? "border-primary bg-primary/10 dark:border-primaryDark dark:bg-primaryDark/10"
                : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
            )}
          >
            <AppText className="text-center" variant="caption">
              {date.format("ddd")}
            </AppText>
            <AppText className="mt-1 text-center text-lg" variant="body">
              {date.date()}
            </AppText>
            <View className="mt-1 items-center">
              {count > 0 ? <View className="h-1 w-6 rounded-full bg-accent" /> : <View className="h-1 w-6" />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const agenda = (
    <AppCard className={cn("gap-4", !isCompact && "flex-1")}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <AppText variant="heading">{selectedDate.format(`dddd, ${DISPLAY_DATE_FORMAT}`)}</AppText>
          <AppText className="mt-1" variant="caption">
            {lessonsForSelectedDay.length} lesson{lessonsForSelectedDay.length === 1 ? "" : "s"} scheduled
          </AppText>
        </View>
        <AppButton
          width="auto"
          icon={CalendarPlus}
          label="New"
          onPress={() => navigation.navigate("LessonCreate", { initialDate: selectedDate.format("YYYY-MM-DD") })}
        />
      </View>

      {weekStrip}

      {lessonsQuery.isPending ? (
        <CenteredLoadingState label="Loading lessons..." />
      ) : lessonsQuery.isError ? (
        <AppStack gap="md">
          <AppText variant="error">{toErrorMessage(lessonsQuery.error)}</AppText>
          <AppButton width="auto" variant="secondary" icon={RefreshCw} label="Retry" onPress={() => lessonsQuery.refetch()} />
        </AppStack>
      ) : lessonsForSelectedDay.length === 0 ? (
        <AppStack gap="sm">
          <AppText variant="heading">No lessons</AppText>
          <AppText variant="body">
            {isInstructor ? "You may not be assigned any lessons yet." : "Create a lesson to plan your day."}
          </AppText>
        </AppStack>
      ) : (
        <ScrollView className="flex-1" keyboardShouldPersistTaps="handled" contentContainerClassName="gap-3 pb-2">
          {lessonCards}
        </ScrollView>
      )}
    </AppCard>
  );

  return (
    <Screen scroll={isCompact} className={cn(isTabletLandscape && "max-w-[1100px]")}>
      <AppStack gap="lg" className={cn(!isCompact && "flex-1")}>
        <View className="flex-row flex-wrap items-center justify-between gap-3">
          <View className="min-w-48 flex-1">
            <AppText variant="title">Lessons</AppText>
            <AppText className="mt-1" variant="caption">
              Plan and track lessons by day.
            </AppText>
          </View>

          <View className="flex-row flex-wrap gap-2">
            <AppButton width="auto" variant="secondary" icon={CalendarDays} label="Today" onPress={onToday} />
            <AppButton
              width="auto"
              icon={CalendarPlus}
              label="New lesson"
              onPress={() => navigation.navigate("LessonCreate", { initialDate: selectedDate.format("YYYY-MM-DD") })}
            />
          </View>
        </View>

        {isTabletLandscape ? (
          <View className="flex-1 flex-row gap-6">
            <AppCard className="flex-1 gap-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <AppButton
                    width="auto"
                    size="icon"
                    variant="secondary"
                    icon={ChevronLeft}
                    label=""
                    accessibilityLabel="Previous month"
                    onPress={onPrevMonth}
                  />
                  <AppText variant="heading">{month.format("MMMM YYYY")}</AppText>
                  <AppButton
                    width="auto"
                    size="icon"
                    variant="secondary"
                    icon={ChevronRight}
                    label=""
                    accessibilityLabel="Next month"
                    onPress={onNextMonth}
                  />
                </View>
                <AppText className="text-right" variant="caption">
                  {selectedDate.format(DISPLAY_DATE_FORMAT)}
                </AppText>
              </View>

              <CalendarMonth
                month={month}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  const next = date.startOf("day");
                  setSelectedDate(next);
                  if (!next.isSame(month, "month")) {
                    setMonth(next.startOf("month"));
                  }
                }}
                lessonCountByDateISO={lessonCountByDateISO}
              />
            </AppCard>

            {agenda}
          </View>
        ) : (
          <>
            <AppCard className="gap-4">
              <View className="flex-row items-center justify-between gap-2">
                <View className="flex-row items-center gap-2">
                  <AppButton
                    width="auto"
                    size="icon"
                    variant="secondary"
                    icon={ChevronLeft}
                    label=""
                    accessibilityLabel="Previous month"
                    onPress={onPrevMonth}
                  />
                  <AppText variant="heading">{month.format("MMMM YYYY")}</AppText>
                  <AppButton
                    width="auto"
                    size="icon"
                    variant="secondary"
                    icon={ChevronRight}
                    label=""
                    accessibilityLabel="Next month"
                    onPress={onNextMonth}
                  />
                </View>
                <AppText className="text-right" variant="caption">
                  {selectedDate.format(DISPLAY_DATE_FORMAT)}
                </AppText>
              </View>

              <CalendarMonth
                month={month}
                selectedDate={selectedDate}
                onSelectDate={(date) => {
                  const next = date.startOf("day");
                  setSelectedDate(next);
                  if (!next.isSame(month, "month")) {
                    setMonth(next.startOf("month"));
                  }
                }}
                lessonCountByDateISO={lessonCountByDateISO}
              />
            </AppCard>

            {agenda}
          </>
        )}
      </AppStack>
    </Screen>
  );
}
