import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { useMemo } from "react";
import { View } from "react-native";
import { BookOpen, ClipboardList, Map as MapIcon, Users } from "lucide-react-native";

import { CenteredLoadingState, ErrorStateCard } from "../../components/AsyncState";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import type { LessonWithStudent } from "../../features/lessons/api";
import { useLessonsQuery } from "../../features/lessons/queries";
import { WeatherWidget } from "../../features/weather/WeatherWidget";
import { DISPLAY_DATE_FORMAT } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { HomeStackParamList } from "../HomeStackNavigator";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeDashboard">;

function getLessonStudentName(lesson: { students?: { first_name: string; last_name: string } | null }) {
  const student = lesson.students ?? null;
  if (!student) return "Unknown student";
  return `${student.first_name} ${student.last_name}`.trim() || "Unknown student";
}

function formatLessonTimeRange(lesson: { start_time: string; end_time: string }) {
  const start = dayjs(lesson.start_time);
  const end = dayjs(lesson.end_time);
  if (!start.isValid() || !end.isValid()) return "Unknown time";
  return `${start.format("h:mm a")} - ${end.format("h:mm a")}`;
}

export function HomeScreen({ navigation }: Props) {
  const { profile } = useCurrentUser();
  const today = dayjs();
  const startOfToday = today.startOf("day");
  const fromISO = startOfToday.toISOString();
  const toISO = startOfToday.add(4, "day").toISOString();

  const lessonsQuery = useLessonsQuery({ fromISO, toISO });
  const lessons: LessonWithStudent[] = lessonsQuery.data ?? [];

  const todayLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      const start = dayjs(lesson.start_time);
      return start.isValid() && start.isSame(startOfToday, "day");
    });
  }, [lessons, startOfToday]);

  const upcomingByDay = useMemo(() => {
    const groups = new Map<number, LessonWithStudent[]>();

    for (const lesson of lessons) {
      const start = dayjs(lesson.start_time);
      if (!start.isValid()) continue;

      const offset = start.startOf("day").diff(startOfToday, "day");
      if (offset < 1 || offset > 3) continue;

      const existing = groups.get(offset) ?? [];
      existing.push(lesson);
      groups.set(offset, existing);
    }

    for (const [key, value] of groups.entries()) {
      value.sort((a, b) => dayjs(a.start_time).valueOf() - dayjs(b.start_time).valueOf());
      groups.set(key, value);
    }

    return groups;
  }, [lessons, startOfToday]);

  const parent = navigation.getParent();
  const hour = today.hour();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = getProfileFullName(profile) || "there";

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">
            {greeting} {name}!
          </AppText>
          <AppText className="mt-2" variant="body">
            {today.format(`dddd, ${DISPLAY_DATE_FORMAT}`)}
          </AppText>
        </View>

        <View className="flex-row flex-wrap gap-2">
          <AppButton
            width="auto"
            className="flex-1 min-w-48"
            label="Students"
            icon={Users}
            onPress={() => parent?.navigate("Students")}
          />
          <AppButton
            width="auto"
            className="flex-1 min-w-48"
            variant="secondary"
            label="Assessments"
            icon={ClipboardList}
            onPress={() => parent?.navigate("Assessments")}
          />
        </View>
        <View className="flex-row flex-wrap gap-2">
          <AppButton
            width="auto"
            className="flex-1 min-w-48"
            variant="secondary"
            label="Lessons"
            icon={BookOpen}
            onPress={() => parent?.navigate("Lessons")}
          />
          <AppButton
            width="auto"
            className="flex-1 min-w-48"
            variant="secondary"
            label="Google Maps"
            icon={MapIcon}
            onPress={() => parent?.navigate("GoogleMaps")}
          />
        </View>

        {lessonsQuery.isPending ? (
          <CenteredLoadingState label="Loading today's lessons..." />
        ) : lessonsQuery.isError ? (
          <ErrorStateCard
            title="Couldn't load today's lessons"
            message={toErrorMessage(lessonsQuery.error)}
            onRetry={() => lessonsQuery.refetch()}
            retryPlacement="inside"
          />
        ) : (
          <AppCard className="gap-3">
            <AppText variant="heading">Upcoming Lessons Today</AppText>
            {todayLessons.length === 0 ? (
              <AppText variant="body">No lessons scheduled today.</AppText>
            ) : (
              <View className="gap-2">
                {todayLessons.map((lesson) => (
                  <View key={lesson.id} className="flex-row items-center justify-between gap-3">
                    <AppText className="flex-1" variant="body">
                      {getLessonStudentName(lesson)}
                    </AppText>
                    <AppText variant="caption">{formatLessonTimeRange(lesson)}</AppText>
                  </View>
                ))}
              </View>
            )}

            <View className="pt-2">
              <AppText variant="heading">Next 3 days</AppText>
              <View className="mt-2 gap-3">
                {([1, 2, 3] as const).map((offset) => {
                  const day = startOfToday.add(offset, "day");
                  const list = upcomingByDay.get(offset) ?? [];
                  if (list.length === 0) return null;

                  return (
                    <View key={offset} className="gap-2">
                      <AppText className="underline" variant="body">
                        {day.format(`ddd, ${DISPLAY_DATE_FORMAT}`)}
                      </AppText>
                      <View className="gap-2">
                        {list.map((lesson) => (
                          <View key={lesson.id} className="flex-row items-center justify-between gap-3">
                            <AppText className="flex-1" variant="body">
                              {getLessonStudentName(lesson)}
                            </AppText>
                            <AppText variant="caption">{formatLessonTimeRange(lesson)}</AppText>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}

                {upcomingByDay.size === 0 ? (
                  <AppText variant="caption">No lessons in the next 3 days.</AppText>
                ) : null}
              </View>
            </View>
          </AppCard>
        )}

        <WeatherWidget />
      </AppStack>
    </Screen>
  );
}
