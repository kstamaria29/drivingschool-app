import dayjs from "dayjs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppBadge } from "../../components/AppBadge";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
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

type Range = "today" | "week";

function statusLabel(status: "scheduled" | "completed" | "cancelled") {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

export function LessonsListScreen({ navigation }: Props) {
  const { session } = useAuthSession();
  const profileQuery = useMyProfileQuery(session?.user.id);

  const [range, setRange] = useState<Range>("today");

  const { fromISO, toISO } = useMemo(() => {
    const start = dayjs().startOf("day");
    if (range === "today") {
      return { fromISO: start.toISOString(), toISO: start.add(1, "day").toISOString() };
    }
    return { fromISO: start.toISOString(), toISO: start.add(7, "day").toISOString() };
  }, [range]);

  const lessonsQuery = useLessonsQuery({ fromISO, toISO });

  function onNewStudentPress() {
    const parent = navigation.getParent();
    (parent as any)?.navigate("Students", { screen: "StudentCreate" });
  }

  const title = range === "today" ? "Today" : "This Week";
  const subtitle =
    range === "today"
      ? dayjs().format("dddd, D MMMM YYYY")
      : `${dayjs().format("D MMM")} – ${dayjs().add(6, "day").format("D MMM YYYY")}`;

  const isInstructor = profileQuery.data?.role === "instructor";

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">{title}</AppText>
          <AppText className="mt-2" variant="body">
            {subtitle}
          </AppText>
        </View>

        <View className="flex-row gap-2">
          <AppButton
            label="Today"
            className="flex-1 w-auto"
            variant={range === "today" ? "primary" : "secondary"}
            onPress={() => setRange("today")}
          />
          <AppButton
            label="This Week"
            className="flex-1 w-auto"
            variant={range === "week" ? "primary" : "secondary"}
            onPress={() => setRange("week")}
          />
        </View>

        <View className="flex-row gap-2">
          <AppButton
            label="+ New lesson"
            className="flex-1 w-auto"
            onPress={() => navigation.navigate("LessonCreate")}
          />
          <AppButton
            label="+ New student"
            className="flex-1 w-auto"
            variant="secondary"
            onPress={onNewStudentPress}
          />
        </View>

        {lessonsQuery.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading lessons...
            </AppText>
          </View>
        ) : lessonsQuery.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load lessons</AppText>
              <AppText variant="body">{toErrorMessage(lessonsQuery.error)}</AppText>
            </AppCard>
            <AppButton label="Retry" onPress={() => lessonsQuery.refetch()} />
          </AppStack>
        ) : lessonsQuery.data.length === 0 ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No lessons</AppText>
            <AppText variant="body">
              {isInstructor
                ? "You may not be assigned any lessons yet."
                : "Create a lesson to plan your day."}
            </AppText>
          </AppCard>
        ) : (
          <AppStack gap="md">
            {lessonsQuery.data.map((lesson) => {
              const start = dayjs(lesson.start_time);
              const end = dayjs(lesson.end_time);
              const studentName = lesson.students
                ? `${lesson.students.first_name} ${lesson.students.last_name}`
                : "Student";

              return (
                <Pressable
                  key={lesson.id}
                  onPress={() => navigation.navigate("LessonEdit", { lessonId: lesson.id })}
                >
                  <AppCard className="gap-2">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <AppText variant="heading">{studentName}</AppText>
                        <AppText className="mt-1" variant="caption">
                          {start.format("h:mm A")} – {end.format("h:mm A")}
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
            })}
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}

