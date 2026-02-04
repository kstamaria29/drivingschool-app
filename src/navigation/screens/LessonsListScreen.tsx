import dayjs, { type Dayjs } from "dayjs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";

import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { CalendarMonth } from "../../components/CalendarMonth";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useMyProfileQuery } from "../../features/auth/queries";
import { useAuthSession } from "../../features/auth/session";
import { useLessonsQuery } from "../../features/lessons/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
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

  function onNewStudentPress() {
    const parent = navigation.getParent();
    (parent as any)?.navigate("Students", { screen: "StudentCreate" });
  }

  const lessonCards = lessonsForSelectedDay.map((lesson) => {
    const start = dayjs(lesson.start_time);
    const end = dayjs(lesson.end_time);
    const studentName = lesson.students
      ? `${lesson.students.first_name} ${lesson.students.last_name}`
      : "Student";

    return (
      <Pressable key={lesson.id} onPress={() => navigation.navigate("LessonEdit", { lessonId: lesson.id })}>
        <AppCard className="gap-2">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <AppText variant="heading">{studentName}</AppText>
              <AppText className="mt-1" variant="caption">
                {start.format("h:mm A")} - {end.format("h:mm A")}
              </AppText>
              {lesson.location ? (
                <AppText className="mt-1" variant="caption">
                  {lesson.location}
                </AppText>
              ) : null}
            </View>
            <AppBadge variant={lesson.status} label={statusLabel(lesson.status)} />
          </View>
        </AppCard>
      </Pressable>
    );
  });

  const agenda = (
    <View className={cn(!isCompact && "flex-1")}>
      <View className="mb-3">
        <AppText variant="heading">Lessons</AppText>
        <AppText className="mt-1" variant="caption">
          {lessonsForSelectedDay.length} lesson{lessonsForSelectedDay.length === 1 ? "" : "s"}
        </AppText>
      </View>

      {lessonsQuery.isPending ? (
        <View
          className={cn(
            isCompact ? "items-center justify-center py-10" : "flex-1 items-center justify-center",
            theme.text.base,
          )}
        >
          <ActivityIndicator />
          <AppText className="mt-3 text-center" variant="body">
            Loading lessons...
          </AppText>
        </View>
      ) : lessonsQuery.isError ? (
        isCompact ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load lessons</AppText>
              <AppText variant="body">{toErrorMessage(lessonsQuery.error)}</AppText>
            </AppCard>
            <AppButton label="Retry" onPress={() => lessonsQuery.refetch()} />
          </AppStack>
        ) : (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="gap-3 pb-24"
          >
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load lessons</AppText>
              <AppText variant="body">{toErrorMessage(lessonsQuery.error)}</AppText>
            </AppCard>
            <AppButton label="Retry" onPress={() => lessonsQuery.refetch()} />
          </ScrollView>
        )
      ) : lessonsForSelectedDay.length === 0 ? (
        isCompact ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No lessons</AppText>
            <AppText variant="body">
              {isInstructor
                ? "You may not be assigned any lessons yet."
                : "Create a lesson to plan your day."}
            </AppText>
          </AppCard>
        ) : (
          <ScrollView
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            contentContainerClassName="pb-24"
          >
            <AppCard className="gap-2">
              <AppText variant="heading">No lessons</AppText>
              <AppText variant="body">
                {isInstructor
                  ? "You may not be assigned any lessons yet."
                  : "Create a lesson to plan your day."}
              </AppText>
            </AppCard>
          </ScrollView>
        )
      ) : isCompact ? (
        <AppStack gap="md">{lessonCards}</AppStack>
      ) : (
        <ScrollView
          className="flex-1"
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="gap-3 pb-24"
        >
          {lessonCards}
        </ScrollView>
      )}
    </View>
  );

  return (
    <Screen scroll={isCompact} className={cn(isTabletLandscape && "max-w-[1024px]")}>
      <AppStack gap="lg" className={cn(!isCompact && "flex-1", isCompact && "pb-24")}>
        <View className="flex-row items-center justify-between gap-2">
          <AppButton
            label="Prev"
            variant="secondary"
            width="auto"
            className="px-4"
            onPress={onPrevMonth}
          />
          <View className="flex-1 items-center">
            <AppText variant="title">{month.format("MMMM YYYY")}</AppText>
            <AppText className="mt-1 text-center" variant="caption">
              {selectedDate.format("dddd, D MMMM YYYY")}
            </AppText>
          </View>
          <AppButton
            label="Next"
            variant="secondary"
            width="auto"
            className="px-4"
            onPress={onNextMonth}
          />
        </View>

        <View className="flex-row gap-2">
          <AppButton
            label="Today"
            variant="secondary"
            width="auto"
            className="flex-1"
            onPress={onToday}
          />
          <AppButton
            label="+ New lesson"
            width="auto"
            className="flex-1"
            onPress={() =>
              navigation.navigate("LessonCreate", { initialDate: selectedDate.format("YYYY-MM-DD") })
            }
          />
          <AppButton
            label="+ New student"
            variant="secondary"
            width="auto"
            className="flex-1"
            onPress={onNewStudentPress}
          />
        </View>

        {isTabletLandscape ? (
          <View className="flex-1 flex-row gap-6">
            <View className="flex-1">
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
            </View>

            {agenda}
          </View>
        ) : (
          <>
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

            {agenda}
          </>
        )}
      </AppStack>
    </Screen>
  );
}
