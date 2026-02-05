import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ActivityIndicator, View } from "react-native";
import { Archive, ClipboardList, Clock, Pencil, Plus, RefreshCw, Undo2 } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import {
  useArchiveStudentMutation,
  useStudentQuery,
  useUnarchiveStudentMutation,
} from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { formatIsoDateToDisplay } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentDetail">;

export function StudentDetailScreen({ navigation, route }: Props) {
  const { studentId } = route.params;

  const query = useStudentQuery(studentId);
  const archiveMutation = useArchiveStudentMutation();
  const unarchiveMutation = useUnarchiveStudentMutation();

  const student = query.data ?? null;
  const isArchived = Boolean(student?.archived_at);

  function onArchivePress() {
    if (!student) return;
    Alert.alert("Archive student", "This student will be moved to Archived.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Archive",
        style: "destructive",
        onPress: () => archiveMutation.mutate(student.id),
      },
    ]);
  }

  function onUnarchivePress() {
    if (!student) return;
    unarchiveMutation.mutate(student.id);
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        {query.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading student...
            </AppText>
          </View>
        ) : query.isError ? (
            <AppStack gap="md">
              <AppCard className="gap-2">
                <AppText variant="heading">Couldn't load student</AppText>
                <AppText variant="body">{toErrorMessage(query.error)}</AppText>
              </AppCard>
            <AppButton label="Retry" icon={RefreshCw} onPress={() => query.refetch()} />
            </AppStack>
        ) : !student ? (
          <AppCard className="gap-2">
            <AppText variant="heading">Student not found</AppText>
            <AppText variant="body">This student may have been deleted or you may not have access.</AppText>
          </AppCard>
        ) : (
          <>
            <View className="flex-row items-start justify-between gap-3">
              <View className="flex-1">
                <AppText variant="title">
                  {student.first_name} {student.last_name}
                </AppText>
                {isArchived ? (
                  <AppText className="mt-2" variant="caption">
                    Archived
                  </AppText>
                ) : null}
              </View>

              <AppButton
                width="auto"
                variant="secondary"
                label="Add session"
                icon={Plus}
                onPress={() =>
                  navigation.navigate("StudentSessionHistory", {
                    studentId: student.id,
                    openNewSession: true,
                  })
                }
              />
            </View>

            <AppCard className="gap-3">
              <AppStack gap="sm">
                <AppText variant="heading">Contact</AppText>
                <View className="flex-row flex-wrap gap-4">
                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Email</AppText>
                    <AppText variant="body">{student.email ?? "-"}</AppText>
                  </View>

                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Phone</AppText>
                    <AppText variant="body">{student.phone ?? "-"}</AppText>
                  </View>

                  <View className="w-full gap-1">
                    <AppText variant="label">Address</AppText>
                    <AppText variant="body">{student.address ?? "-"}</AppText>
                  </View>
                </View>
              </AppStack>

              <AppStack gap="sm">
                <AppText variant="heading">Licence</AppText>
                <View className="flex-row flex-wrap gap-4">
                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Type</AppText>
                    <AppText variant="body">{student.license_type ?? "-"}</AppText>
                  </View>

                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Number</AppText>
                    <AppText variant="body">{student.license_number ?? "-"}</AppText>
                  </View>

                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Version</AppText>
                    <AppText variant="body">{student.license_version ?? "-"}</AppText>
                  </View>

                  <View className="min-w-56 flex-1 gap-1">
                    <AppText variant="label">Class held</AppText>
                    <AppText variant="body">{student.class_held ?? "-"}</AppText>
                  </View>

                  <View className="w-full gap-1">
                    <AppText variant="label">Issue date</AppText>
                    <AppText variant="body">
                      {student.issue_date ? formatIsoDateToDisplay(student.issue_date) : "-"}
                    </AppText>
                  </View>

                  <View className="w-full gap-1">
                    <AppText variant="label">Expiry date</AppText>
                    <AppText variant="body">
                      {student.expiry_date ? formatIsoDateToDisplay(student.expiry_date) : "-"}
                    </AppText>
                  </View>
                </View>
              </AppStack>

              <AppStack gap="sm">
                <AppText variant="heading">Notes</AppText>
                <AppText variant="body">{student.notes?.trim() ? student.notes : "-"}</AppText>
              </AppStack>
            </AppCard>

            <AppStack gap="md">
              <AppButton
                label="Edit"
                variant="secondary"
                icon={Pencil}
                onPress={() => navigation.navigate("StudentEdit", { studentId: student.id })}
              />

              <AppButton
                label="Session History"
                variant="secondary"
                icon={Clock}
                onPress={() => navigation.navigate("StudentSessionHistory", { studentId: student.id })}
              />

              <AppButton
                label="Assessment History"
                variant="secondary"
                icon={ClipboardList}
                onPress={() => navigation.navigate("StudentAssessmentHistory", { studentId: student.id })}
              />

              {isArchived ? (
                <AppButton
                  label={unarchiveMutation.isPending ? "Unarchiving..." : "Unarchive"}
                  disabled={unarchiveMutation.isPending}
                  icon={Undo2}
                  onPress={onUnarchivePress}
                />
              ) : (
                <AppButton
                  label={archiveMutation.isPending ? "Archiving..." : "Archive"}
                  variant="secondary"
                  disabled={archiveMutation.isPending}
                  icon={Archive}
                  onPress={onArchivePress}
                />
              )}
            </AppStack>
          </>
        )}
      </AppStack>
    </Screen>
  );
}
