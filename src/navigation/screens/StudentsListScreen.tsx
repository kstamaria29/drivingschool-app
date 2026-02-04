import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentsList">;

export function StudentsListScreen({ navigation }: Props) {
  const [archived, setArchived] = useState(false);
  const query = useStudentsQuery({ archived });

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Students</AppText>
          <AppText className="mt-2" variant="body">
            {archived ? "Archived students" : "Active students"}
          </AppText>
        </View>

        <View className="flex-row gap-2">
          <AppButton
            label="Active"
            className="flex-1 w-auto"
            variant={!archived ? "primary" : "secondary"}
            onPress={() => setArchived(false)}
          />
          <AppButton
            label="Archived"
            className="flex-1 w-auto"
            variant={archived ? "primary" : "secondary"}
            onPress={() => setArchived(true)}
          />
        </View>

        <AppButton label="+ New student" onPress={() => navigation.navigate("StudentCreate")} />

        {query.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading students...
            </AppText>
          </View>
        ) : query.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load students</AppText>
              <AppText variant="body">{toErrorMessage(query.error)}</AppText>
            </AppCard>
            <AppButton label="Retry" onPress={() => query.refetch()} />
          </AppStack>
        ) : query.data.length === 0 ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No students</AppText>
            <AppText variant="body">
              {archived
                ? "No archived students yet."
                : "Create your first student to start scheduling lessons later."}
            </AppText>
          </AppCard>
        ) : (
          <AppStack gap="md">
            {query.data.map((student) => (
              <Pressable
                key={student.id}
                onPress={() => navigation.navigate("StudentDetail", { studentId: student.id })}
              >
                <AppCard className="gap-1">
                  <AppText variant="heading">
                    {student.first_name} {student.last_name}
                  </AppText>
                  {student.email ? <AppText variant="caption">{student.email}</AppText> : null}
                  {student.phone ? <AppText variant="caption">{student.phone}</AppText> : null}
                </AppCard>
              </Pressable>
            ))}
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}

