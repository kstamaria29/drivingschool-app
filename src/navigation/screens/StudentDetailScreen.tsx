import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
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
  useRemoveStudentLicenseImageMutation,
  useStudentQuery,
  useUnarchiveStudentMutation,
  useUploadStudentLicenseImageMutation,
} from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { formatIsoDateToDisplay } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentDetail">;
type LicenceImageItem = { key: "front" | "back"; label: string; uri: string };
type StudentLicenseImageSide = "front" | "back";
type StudentLicenseImageSource = "camera" | "library";

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

function toSentenceCase(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "-";
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
}

export function StudentDetailScreen({ navigation, route }: Props) {
  const { studentId } = route.params;

  const query = useStudentQuery(studentId);
  const sessionsQuery = useStudentSessionsQuery({ studentId });
  const assessmentsQuery = useAssessmentsQuery({ studentId });
  const archiveMutation = useArchiveStudentMutation();
  const unarchiveMutation = useUnarchiveStudentMutation();
  const deleteMutation = useDeleteStudentMutation();
  const uploadLicenseImageMutation = useUploadStudentLicenseImageMutation();
  const removeLicenseImageMutation = useRemoveStudentLicenseImageMutation();

  const student = query.data ?? null;
  const isArchived = Boolean(student?.archived_at);
  const notes = student?.notes?.trim() ? student.notes.trim() : "";
  const sessionCount = sessionsQuery.data?.length ?? 0;
  const assessmentCount = assessmentsQuery.data?.length ?? 0;
  const [licensePickerError, setLicensePickerError] = useState<string | null>(
    null,
  );
  const [licenseGalleryVisible, setLicenseGalleryVisible] = useState(false);
  const [licenseGalleryIndex, setLicenseGalleryIndex] = useState(0);
  const studentDobDisplay = student?.date_of_birth
    ? formatIsoDateToDisplay(student.date_of_birth)
    : "-";
  const studentAgeDisplay = student?.date_of_birth
    ? String(dayjs().diff(dayjs(student.date_of_birth), "year"))
    : "-";

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

  async function pickLicenseAssetFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permission to access photos was denied.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  async function pickLicenseAssetFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permission to access the camera was denied.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  async function pickAndUploadLicenseImage(
    side: StudentLicenseImageSide,
    source: StudentLicenseImageSource,
  ) {
    if (!student) return;

    try {
      setLicensePickerError(null);
      const asset =
        source === "camera"
          ? await pickLicenseAssetFromCamera()
          : await pickLicenseAssetFromLibrary();

      if (!asset) return;

      await uploadLicenseImageMutation.mutateAsync({
        organizationId: student.organization_id,
        studentId: student.id,
        side,
        asset,
      });
    } catch (error) {
      setLicensePickerError(toErrorMessage(error));
    }
  }

  function deleteLicenseImage(side: StudentLicenseImageSide) {
    if (!student) return;
    const sideLabel = side === "front" ? "front" : "back";

    Alert.alert(
      `Delete ${sideLabel} photo`,
      "This will remove the saved licence photo.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            removeLicenseImageMutation.mutate(
              {
                organizationId: student.organization_id,
                studentId: student.id,
                side,
              },
              {
                onError: (error) => {
                  setLicensePickerError(toErrorMessage(error));
                },
              },
            );
          },
        },
      ],
    );
  }

  function openLicenseImageActions(side: StudentLicenseImageSide) {
    const sideLabel = side === "front" ? "front" : "back";
    const existingUri =
      side === "front"
        ? student?.license_front_image_url
        : student?.license_back_image_url;

    const actions: Parameters<typeof Alert.alert>[2] = [
      {
        text: "Take photo",
        onPress: () => {
          void pickAndUploadLicenseImage(side, "camera");
        },
      },
      {
        text: "Choose from library",
        onPress: () => {
          void pickAndUploadLicenseImage(side, "library");
        },
      },
    ];

    if (existingUri) {
      actions.push({
        text: "Delete photo",
        style: "destructive",
        onPress: () => deleteLicenseImage(side),
      });
    }

    actions.push({ text: "Cancel", style: "cancel" });
    Alert.alert(`Licence card ${sideLabel}`, "Choose an option", actions);
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

                  <InlineDetailRow
                    label="Address"
                    value={student.address ?? "-"}
                  />
                  <InlineDetailRow
                    label="Organization"
                    value={student.organization_name ?? "-"}
                  />
                  <InlineDetailRow
                    label="Date of birth"
                    value={studentDobDisplay}
                  />
                  <InlineDetailRow label="Age" value={studentAgeDisplay} />
                </AppCard>

                <AppCard className="gap-3">
                  <AppText variant="heading">Licence</AppText>

                  <View className="flex-row flex-wrap gap-4">
                    <View className="min-w-56 flex-1 gap-2">
                      <InlineDetailRow
                        label="Type"
                        value={toSentenceCase(student.license_type ?? "")}
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

                  <AppStack gap="sm">
                    <AppText variant="label">Licence card photos</AppText>
                    <View className="flex-row gap-3">
                      <AppStack className="flex-1" gap="sm">
                        <AppText variant="caption">Front</AppText>
                        {student.license_front_image_url ? (
                          <Pressable
                            onPress={() => {
                              const frontIndex = licenseImages.findIndex(
                                (image) => image.key === "front",
                              );
                              if (frontIndex >= 0)
                                openLicenseGallery(frontIndex);
                            }}
                          >
                            <View className="h-32 overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
                              <AppImage
                                source={{
                                  uri: student.license_front_image_url,
                                }}
                                resizeMode="cover"
                                className="h-full w-full"
                              />
                            </View>
                          </Pressable>
                        ) : (
                          <View className="h-32 items-center justify-center rounded-xl border border-dashed border-border bg-card dark:border-borderDark dark:bg-cardDark">
                            <AppText variant="caption">No front photo.</AppText>
                          </View>
                        )}
                        <AppButton
                          variant="secondary"
                          label="Front photo options"
                          disabled={
                            uploadLicenseImageMutation.isPending ||
                            removeLicenseImageMutation.isPending
                          }
                          onPress={() => openLicenseImageActions("front")}
                        />
                      </AppStack>

                      <AppStack className="flex-1" gap="sm">
                        <AppText variant="caption">Back</AppText>
                        {student.license_back_image_url ? (
                          <Pressable
                            onPress={() => {
                              const backIndex = licenseImages.findIndex(
                                (image) => image.key === "back",
                              );
                              if (backIndex >= 0) openLicenseGallery(backIndex);
                            }}
                          >
                            <View className="h-32 overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
                              <AppImage
                                source={{ uri: student.license_back_image_url }}
                                resizeMode="cover"
                                className="h-full w-full"
                              />
                            </View>
                          </Pressable>
                        ) : (
                          <View className="h-32 items-center justify-center rounded-xl border border-dashed border-border bg-card dark:border-borderDark dark:bg-cardDark">
                            <AppText variant="caption">No back photo.</AppText>
                          </View>
                        )}
                        <AppButton
                          variant="secondary"
                          label="Back photo options"
                          disabled={
                            uploadLicenseImageMutation.isPending ||
                            removeLicenseImageMutation.isPending
                          }
                          onPress={() => openLicenseImageActions("back")}
                        />
                      </AppStack>
                    </View>
                    {licenseImages.length > 0 ? (
                      <AppText variant="caption">
                        Tap a photo to view full size.
                      </AppText>
                    ) : null}
                    {uploadLicenseImageMutation.isError ? (
                      <AppText variant="error">
                        {toErrorMessage(uploadLicenseImageMutation.error)}
                      </AppText>
                    ) : null}
                    {removeLicenseImageMutation.isError ? (
                      <AppText variant="error">
                        {toErrorMessage(removeLicenseImageMutation.error)}
                      </AppText>
                    ) : null}
                    {licensePickerError ? (
                      <AppText variant="error">{licensePickerError}</AppText>
                    ) : null}
                  </AppStack>
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
