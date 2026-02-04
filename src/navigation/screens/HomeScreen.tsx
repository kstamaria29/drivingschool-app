import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { ActivityIndicator, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useLessonsQuery } from "../../features/lessons/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { HomeStackParamList } from "../HomeStackNavigator";

type Props = NativeStackScreenProps<HomeStackParamList, "HomeDashboard">;

export function HomeScreen({ navigation }: Props) {
  const today = dayjs();
  const fromISO = today.startOf("day").toISOString();
  const toISO = today.add(1, "day").startOf("day").toISOString();

  const lessonsQuery = useLessonsQuery({ fromISO, toISO });

  const parent = navigation.getParent();

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Home</AppText>
          <AppText className="mt-2" variant="body">
            {today.format(`dddd, ${DISPLAY_DATE_FORMAT}`)}
          </AppText>
        </View>

        <View className="flex-row gap-2">
          <AppButton
            width="auto"
            className="flex-1"
            label="+ New lesson"
            onPress={() =>
              parent?.navigate("Lessons", {
                screen: "LessonCreate",
                params: { initialDate: today.toISOString() },
              })
            }
          />
          <AppButton
            width="auto"
            className="flex-1"
            variant="secondary"
            label="+ New student"
            onPress={() =>
              parent?.navigate("Students", {
                screen: "StudentCreate",
              })
            }
          />
        </View>

        {lessonsQuery.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading today&apos;s lessons...
            </AppText>
          </View>
        ) : lessonsQuery.isError ? (
          <AppCard className="gap-2">
            <AppText variant="heading">Couldn&apos;t load today&apos;s lessons</AppText>
            <AppText variant="body">{toErrorMessage(lessonsQuery.error)}</AppText>
            <AppButton label="Retry" variant="secondary" onPress={() => lessonsQuery.refetch()} />
          </AppCard>
        ) : (
          <AppCard className="gap-2">
            <AppText variant="heading">Today</AppText>
            <AppText variant="body">
              {lessonsQuery.data.length === 0
                ? "No lessons scheduled today."
                : `${lessonsQuery.data.length} lesson${lessonsQuery.data.length === 1 ? "" : "s"} scheduled.`}
            </AppText>
            <AppButton
              label="Open Lessons"
              variant="ghost"
              width="auto"
              onPress={() => parent?.navigate("Lessons")}
            />
          </AppCard>
        )}
      </AppStack>
    </Screen>
  );
}
