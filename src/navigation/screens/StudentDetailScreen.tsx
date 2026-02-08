import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Alert, ActivityIndicator, Modal, Pressable, View } from "react-native";
import {
  Archive,
  ClipboardList,
  Clock,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  Undo2,
} from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppImage } from "../../components/AppImage";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useAssessmentsQuery } from "../../features/assessments/queries";
import { useStudentSessionsQuery } from "../../features/sessions/queries";
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
type LicenceImageItem = { key: "front" | "back"; label: string; uri: string };

function InlineDetailRow({ label, value }: { label: string; value: string }) {
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
  const sessionsQuery = useStudentSessionsQuery({ studentId });
  const assessmentsQuery = useAssessmentsQuery({ studentId });
  const archiveMutation = useArchiveStudentMutation();
  const unarchiveMutation = useUnarchiveStudentMutation();
  const deleteMutation = useDeleteStudentMutation();

  const student = query.data ?? null;
  const isArchived = Boolean(student?.archived_at);
  const notes = student?.notes?.trim() ? student.notes.trim() : "";
  const sessionCount = sessionsQuery.data?.length ?? 0;
  const assessmentCount = assessmentsQuery.data?.length ?? 0;
  const [licenseGalleryVisible, setLicenseGalleryVisible] = useState(false);
  const [licenseGalleryIndex, setLicenseGalleryIndex] = useState(0);

  const licenseImages = useMemo<LicenceImageItem[]>(() => {
    const images: LicenceImageItem[] = [];
    if (student?.license_front_image_url) {
      images.push({
        key: "front",
        label: "Front",
        uri: student.license_front_image_url,
      });
    }
    if (student?.license_back_image_url) {
      images.push({
        key: "back",
        label: "Back",
        uri: student.license_back_image_url,
      });
    }
    return images;
  }, [student?.license_back_image_url, student?.license_front_image_url]);

  useEffect(() => {
    if (licenseImages.length === 0) {
      setLicenseGalleryVisible(false);
      setLicenseGalleryIndex(0);
      return;
    }

    if (licenseGalleryIndex > licenseImages.length - 1) {
      setLicenseGalleryIndex(0);
    }
  }, [licenseGalleryIndex, licenseImages.length]);

  const activeLicenseImage = licenseImages[licenseGalleryIndex] ?? null;

  function openLicenseGallery(startIndex: number) {
    if (licenseImages.length === 0) return;
    setLicenseGalleryIndex(startIndex);
    setLicenseGalleryVisible(true);
  }

  function showPreviousLicenseImage() {
    if (licenseImages.length <= 1) return;
    setLicenseGalleryIndex((previous) =>
      previous === 0 ? licenseImages.length - 1 : previous - 1,
    );
  }

  function showNextLicenseImage() {
    if (licenseImages.length <= 1) return;
    setLicenseGalleryIndex((previous) => (previous + 1) % licenseImages.length);
  }

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
    Alert.alert(
      "Delete student",
      "Permanently delete this student? This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            deleteMutation.mutate(student.id, {
              onSuccess: () => navigation.popToTop(),
              onError: (error) =>
                Alert.alert("Couldn't delete student", toErrorMessage(error)),
            });
          },
        },
      ],
    );
  }

  return (
    <>
      <Screen scroll>
        <AppStack gap="lg">
          {query.isPending ? (
            <View
              className={cn(
                "items-center justify-center py-10",
                theme.text.base,
              )}
            >
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
              <AppButton
                label="Retry"
                icon={RefreshCw}
                onPress={() => query.refetch()}
              />
            </AppStack>
          ) : !student ? (
            <AppCard className="gap-2">
              <AppText variant="heading">Student not found</AppText>
              <AppText variant="body">
                This student may have been deleted or you may not have access.
              </AppText>
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
                      <InlineDetailRow
                        label="Email"
                        value={student.email ?? "-"}
                      />
                    </View>
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Phone"
                        value={student.phone ?? "-"}
                      />
                    </View>
                  </View>

                  <AppStack gap="sm">
                    <AppText
                      className="text-muted dark:text-mutedDark"
                      variant="label"
                    >
                      Address
                    </AppText>
                    <AppText variant="body">{student.address ?? "-"}</AppText>
                  </AppStack>

                  <InlineDetailRow
                    label="Organization"
                    value={student.organization_name ?? "-"}
                  />
                </AppCard>

                <AppCard className="gap-3">
                  <AppText variant="heading">Licence</AppText>

                  <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Type"
                        value={student.license_type ?? "-"}
                      />
                    </View>
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Number"
                        value={student.license_number ?? "-"}
                      />
                    </View>
                  </View>

                  <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Version"
                        value={student.license_version ?? "-"}
                      />
                    </View>
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Class held"
                        value={student.class_held ?? "-"}
                      />
                    </View>
                  </View>

                  <InlineDetailRow
                    label="Issue date"
                    value={
                      student.issue_date
                        ? formatIsoDateToDisplay(student.issue_date)
                        : "-"
                    }
                  />
                  <InlineDetailRow
                    label="Expiry date"
                    value={
                      student.expiry_date
                        ? formatIsoDateToDisplay(student.expiry_date)
                        : "-"
                    }
                  />

                  {licenseImages.length > 0 ? (
                    <AppStack gap="sm">
                      <AppText variant="label">Licence card photos</AppText>
                      <View className="flex-row flex-wrap gap-3">
                        {licenseImages.map((image, index) => (
                          <Pressable
                            key={image.key}
                            className="w-[48%] gap-2"
                            onPress={() => openLicenseGallery(index)}
                          >
                            <View className="h-32 overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
                              <AppImage
                                source={{ uri: image.uri }}
                                resizeMode="cover"
                                className="h-full w-full"
                              />
                            </View>
                            <AppText className="text-center" variant="caption">
                              {image.label}
                            </AppText>
                          </Pressable>
                        ))}
                      </View>
                      <AppText variant="caption">
                        Tap a photo to view full size.
                      </AppText>
                    </AppStack>
                  ) : null}
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
                  onPress={() =>
                    navigation.navigate("StudentEdit", {
                      studentId: student.id,
                    })
                  }
                />

                <AppButton
                  label="Session History"
                  variant="secondary"
                  icon={Clock}
                  badgeCount={
                    sessionsQuery.isPending ? undefined : sessionCount
                  }
                  onPress={() =>
                    navigation.navigate("StudentSessionHistory", {
                      studentId: student.id,
                    })
                  }
                />

                <AppButton
                  label="Assessment History"
                  variant="secondary"
                  icon={ClipboardList}
                  badgeCount={
                    assessmentsQuery.isPending ? undefined : assessmentCount
                  }
                  onPress={() =>
                    navigation.navigate("StudentAssessmentHistory", {
                      studentId: student.id,
                    })
                  }
                />

                <View className="h-2" />

                {isArchived ? (
                  <AppButton
                    label={
                      unarchiveMutation.isPending
                        ? "Unarchiving..."
                        : "Unarchive"
                    }
                    disabled={
                      unarchiveMutation.isPending || deleteMutation.isPending
                    }
                    icon={Undo2}
                    onPress={onUnarchivePress}
                  />
                ) : (
                  <AppButton
                    label={
                      archiveMutation.isPending ? "Archiving..." : "Archive"
                    }
                    variant="secondary"
                    disabled={
                      archiveMutation.isPending || deleteMutation.isPending
                    }
                    icon={Archive}
                    onPress={onArchivePress}
                  />
                )}

                <AppButton
                  label={
                    deleteMutation.isPending ? "Deleting..." : "Delete student"
                  }
                  variant="danger"
                  disabled={
                    deleteMutation.isPending ||
                    archiveMutation.isPending ||
                    unarchiveMutation.isPending
                  }
                  icon={Trash2}
                  onPress={onDeletePress}
                />
              </AppStack>
            </>
          )}
        </AppStack>
      </Screen>

      <Modal
        visible={licenseGalleryVisible && activeLicenseImage != null}
        transparent
        animationType="fade"
        onRequestClose={() => setLicenseGalleryVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/90 px-4 py-8"
          onPress={() => setLicenseGalleryVisible(false)}
        >
          <Pressable
            className="flex-1"
            onPress={(event) => event.stopPropagation()}
          >
            <View className="flex-row items-center justify-between gap-2">
              <AppText className="text-primaryForeground" variant="body">
                {activeLicenseImage
                  ? `${activeLicenseImage.label} (${licenseGalleryIndex + 1}/${licenseImages.length})`
                  : ""}
              </AppText>
              <AppButton
                width="auto"
                variant="secondary"
                label="Close"
                onPress={() => setLicenseGalleryVisible(false)}
              />
            </View>

            <View className="flex-1 items-center justify-center">
              {activeLicenseImage ? (
                <AppImage
                  source={{ uri: activeLicenseImage.uri }}
                  resizeMode="contain"
                  className="h-full w-full"
                />
              ) : null}
            </View>

            <View className="flex-row gap-2">
              <AppButton
                className="flex-1"
                width="auto"
                variant="secondary"
                label="Previous"
                disabled={licenseImages.length <= 1}
                onPress={showPreviousLicenseImage}
              />
              <AppButton
                className="flex-1"
                width="auto"
                variant="secondary"
                label="Next"
                disabled={licenseImages.length <= 1}
                onPress={showNextLicenseImage}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
