import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Alert, ActivityIndicator, View } from "react-native";
import { Archive, ClipboardList, Clock, Pencil, Plus, RefreshCw, Trash2, Undo2 } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import {
  useArchiveStudentMutation,
  useDeleteStudentMutation,
  useStudentQuery,
  useUnarchiveStudentMutation,
} from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { formatIsoDateToDisplay } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentDetail">;

function InlineDetailRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row flex-wrap items-baseline">
      <AppText className="text-muted dark:text-mutedDark" variant="label">
        {label}:
      </AppText>
      <AppText className="ml-1 flex-1" variant="body">
        {value}
      </AppText>
    </View>
  );
}

export function StudentDetailScreen({ navigation, route }: Props) {
  const { studentId } = route.params;

  const query = useStudentQuery(studentId);
  const archiveMutation = useArchiveStudentMutation();
  const unarchiveMutation = useUnarchiveStudentMutation();
  const deleteMutation = useDeleteStudentMutation();

  const student = query.data ?? null;
  const isArchived = Boolean(student?.archived_at);
  const notes = student?.notes?.trim() ? student.notes.trim() : "";

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

  function onDeletePress() {
    if (!student) return;
    Alert.alert("Delete student", "Permanently delete this student? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(student.id, {
            onSuccess: () => navigation.popToTop(),
            onError: (error) => Alert.alert("Couldn't delete student", toErrorMessage(error)),
          });
        },
      },
    ]);
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

            <AppStack gap="md">
              <AppCard className="gap-3">
                <AppText variant="heading">Contact</AppText>

                <View className="flex-row flex-wrap gap-4">
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Email" value={student.email ?? "-"} />
                  </View>
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Phone" value={student.phone ?? "-"} />
                  </View>
                </View>

                <AppStack gap="sm">
                  <AppText className="text-muted dark:text-mutedDark" variant="label">
                    Address
                  </AppText>
                  <AppText variant="body">{student.address ?? "-"}</AppText>
                </AppStack>
              </AppCard>

              <AppCard className="gap-3">
                <AppText variant="heading">Licence</AppText>

                <View className="flex-row flex-wrap gap-4">
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Type" value={student.license_type ?? "-"} />
                  </View>
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Number" value={student.license_number ?? "-"} />
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-4">
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Version" value={student.license_version ?? "-"} />
                  </View>
                  <View className="min-w-56 flex-1 gap-2">
                    <InlineDetailRow label="Class held" value={student.class_held ?? "-"} />
                  </View>
                </View>

                <InlineDetailRow
                  label="Issue date"
                  value={student.issue_date ? formatIsoDateToDisplay(student.issue_date) : "-"}
                />
                <InlineDetailRow
                  label="Expiry date"
                  value={student.expiry_date ? formatIsoDateToDisplay(student.expiry_date) : "-"}
                />
              </AppCard>

              {notes ? (
                <AppCard className="gap-2">
                  <AppText variant="heading">Notes</AppText>
                  <AppText variant="body">{notes}</AppText>
                </AppCard>
              ) : null}
            </AppStack>

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
                  disabled={unarchiveMutation.isPending || deleteMutation.isPending}
                  icon={Undo2}
                  onPress={onUnarchivePress}
                />
              ) : (
                <AppButton
                  label={archiveMutation.isPending ? "Archiving..." : "Archive"}
                  variant="secondary"
                  disabled={archiveMutation.isPending || deleteMutation.isPending}
                  icon={Archive}
                  onPress={onArchivePress}
                />
              )}

              <AppButton
                label={deleteMutation.isPending ? "Deleting..." : "Delete student"}
                variant="danger"
                disabled={deleteMutation.isPending || archiveMutation.isPending || unarchiveMutation.isPending}
                icon={Trash2}
                onPress={onDeletePress}
              />
            </AppStack>
          </>
        )}
      </AppStack>
    </Screen>
  );
}
