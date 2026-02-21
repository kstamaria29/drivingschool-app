import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { Plus, RefreshCw, Save, Trash2, X } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { AppTimeInput } from "../../components/AppTimeInput";
import { Screen } from "../../components/Screen";
import { useMyProfileQuery } from "../../features/auth/queries";
import { isOwnerOrAdminRole, toRoleLabel } from "../../features/auth/roles";
import { useAuthSession } from "../../features/auth/session";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import { useStudentsQuery } from "../../features/students/queries";
import {
  useCreateLessonMutation,
  useDeleteLessonMutation,
  useLessonQuery,
  useUpdateLessonMutation,
} from "../../features/lessons/queries";
import { lessonFormSchema, type LessonFormValues } from "../../features/lessons/schemas";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { LessonsStackParamList } from "../LessonsStackNavigator";
import { AssessmentStudentDropdown } from "../components/AssessmentStudentDropdown";
import { useNavigationLayout } from "../useNavigationLayout";

type CreateProps = NativeStackScreenProps<LessonsStackParamList, "LessonCreate">;
type EditProps = NativeStackScreenProps<LessonsStackParamList, "LessonEdit">;
type Props = CreateProps | EditProps;

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function LessonEditScreen({ navigation, route }: Props) {
  const { isSidebar, isCompact } = useNavigationLayout();
  const lessonId = route.name === "LessonEdit" ? route.params.lessonId : undefined;
  const initialDate =
    route.name === "LessonCreate" ? route.params?.initialDate : undefined;

  const { session } = useAuthSession();
  const userId = session?.user.id;
  const profileQuery = useMyProfileQuery(userId);

  const lessonQuery = useLessonQuery(lessonId);
  const createMutation = useCreateLessonMutation();
  const updateMutation = useUpdateLessonMutation();
  const deleteMutation = useDeleteLessonMutation();
  const { colorScheme } = useColorScheme();

  const role = profileQuery.data?.role ?? null;
  const canManageLessonInstructor = isOwnerOrAdminRole(role);

  const orgProfilesQuery = useOrganizationProfilesQuery(canManageLessonInstructor);
  const studentsQuery = useStudentsQuery({ archived: false });
  const deleteIconColor = colorScheme === "dark" ? theme.colors.dangerDark : theme.colors.danger;

  const defaultDate = useMemo(() => {
    if (initialDate) {
      const parsed = dayjs(initialDate);
      if (parsed.isValid()) return parsed.format(DISPLAY_DATE_FORMAT);
    }
    return dayjs().format(DISPLAY_DATE_FORMAT);
  }, [initialDate]);

  const defaultStartTime = useMemo(() => {
    if (initialDate) {
      const parsed = dayjs(initialDate);
      if (parsed.isValid() && !parsed.isSame(dayjs(), "day")) return "09:00";
    }
    const now = dayjs();
    return `${pad2(now.hour())}:${pad2(now.minute())}`;
  }, [initialDate]);

  const defaultInstructorId = useMemo(() => {
    if (role === "instructor") return userId ?? "";
    if (role === "owner") return userId ?? "";
    return "";
  }, [role, userId]);

  const hasInstructorsInOrganization = useMemo(() => {
    return (orgProfilesQuery.data ?? []).some((profileOption) => profileOption.role === "instructor");
  }, [orgProfilesQuery.data]);

  const showInstructorSelector = canManageLessonInstructor && hasInstructorsInOrganization;

  const assignableInstructorProfiles = useMemo(() => {
    return (orgProfilesQuery.data ?? []).filter((profileOption) => profileOption.role !== "admin");
  }, [orgProfilesQuery.data]);

  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonFormSchema),
    defaultValues: {
      date: defaultDate,
      startTime: defaultStartTime,
      durationMinutes: "60",
      studentId: "",
      instructorId: defaultInstructorId,
      status: "scheduled",
      location: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!defaultInstructorId) return;
    form.setValue("instructorId", defaultInstructorId, { shouldValidate: true });
  }, [defaultInstructorId, form]);

  useEffect(() => {
    if (!canManageLessonInstructor) return;
    if (showInstructorSelector) return;
    if (orgProfilesQuery.isPending || orgProfilesQuery.isError) return;

    const currentInstructorId = form.getValues("instructorId");
    if (currentInstructorId) return;

    const ownerId =
      (orgProfilesQuery.data ?? []).find((profileOption) => profileOption.role === "owner")?.id ?? "";
    if (!ownerId) return;

    form.setValue("instructorId", ownerId, { shouldValidate: true });
  }, [
    canManageLessonInstructor,
    form,
    orgProfilesQuery.data,
    orgProfilesQuery.isError,
    orgProfilesQuery.isPending,
    showInstructorSelector,
  ]);

  useEffect(() => {
    if (!lessonId) return;
    if (!lessonQuery.data) return;

    const start = dayjs(lessonQuery.data.start_time);
    const end = dayjs(lessonQuery.data.end_time);
    const duration = Math.max(15, end.diff(start, "minute"));

    form.reset({
      date: start.format(DISPLAY_DATE_FORMAT),
      startTime: start.format("HH:mm"),
      durationMinutes: String(duration),
      studentId: lessonQuery.data.student_id,
      instructorId: lessonQuery.data.instructor_id,
      status: lessonQuery.data.status,
      location: lessonQuery.data.location ?? "",
      notes: lessonQuery.data.notes ?? "",
    });
  }, [form, lessonId, lessonQuery.data]);

  const instructorId = form.watch("instructorId");

  const studentsForPicker = useMemo(() => {
    const all = studentsQuery.data ?? [];
    if (!instructorId) return all;
    return all.filter((student) => student.assigned_instructor_id === instructorId);
  }, [instructorId, studentsQuery.data]);

  const isLoading =
    profileQuery.isPending || (lessonId ? lessonQuery.isPending : false) || !session;

  if (isLoading) {
    return (
      <Screen>
        <View className={cn("flex-1 items-center justify-center", theme.text.base)}>
          <ActivityIndicator />
          <AppText className="mt-3 text-center" variant="body">
            Loading...
          </AppText>
        </View>
      </Screen>
    );
  }

  if (profileQuery.isError) {
    return (
      <Screen>
        <AppStack gap="md">
          <AppText variant="title">Couldn't load your profile</AppText>
          <AppCard className="gap-2">
            <AppText variant="body">{toErrorMessage(profileQuery.error)}</AppText>
          </AppCard>
          <AppButton label="Retry" onPress={() => profileQuery.refetch()} />
        </AppStack>
      </Screen>
    );
  }

  const profile = profileQuery.data;
  if (!profile) {
    return (
      <Screen>
        <AppCard className="gap-2">
          <AppText variant="heading">Profile required</AppText>
          <AppText variant="body">Complete onboarding first.</AppText>
        </AppCard>
      </Screen>
    );
  }

  const organizationId = profile.organization_id;
  const isEditing = Boolean(lessonId);
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error ?? deleteMutation.error;

  async function saveLesson(values: LessonFormValues) {
    const dateISO = parseDateInputToISODate(values.date);
    if (!dateISO) return;

    const start = dayjs(`${dateISO}T${values.startTime}`);
    const end = start.add(Number(values.durationMinutes), "minute");

    const base = {
      student_id: values.studentId,
      instructor_id: values.instructorId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: values.status,
      location: emptyToNull(values.location),
      notes: emptyToNull(values.notes),
    } as const;

    if (isEditing) {
      await updateMutation.mutateAsync({ lessonId: lessonId!, input: base });
    } else {
      await createMutation.mutateAsync({
        organization_id: organizationId,
        ...base,
      });
    }

    navigation.goBack();
  }

  async function onSubmit(values: LessonFormValues) {
    Alert.alert(
      isEditing ? "Save lesson" : "Create lesson",
      isEditing ? "Save changes to this lesson?" : "Create this lesson now?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isEditing ? "Save" : "Create",
          onPress: () => {
            void saveLesson(values).catch(() => {
              // Mutation error state is already handled by React Query and rendered below.
            });
          },
        },
      ],
    );
  }

  function onDeleteLessonPress() {
    if (!lessonId) return;
    Alert.alert("Delete lesson", "Permanently delete this lesson?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteMutation.mutate(lessonId, {
            onSuccess: () => navigation.goBack(),
          });
        },
      },
    ]);
  }

  const previewDateISO = parseDateInputToISODate(form.watch("date")) ?? "";
  const startPreview = dayjs(`${previewDateISO}T${form.watch("startTime")}`);
  const durationPreview = Number(form.watch("durationMinutes")) || 60;
  const endPreview = startPreview.isValid() ? startPreview.add(durationPreview, "minute") : null;
  const selectedStudentId = form.watch("studentId");
  const selectedStudent =
    (studentsQuery.data ?? []).find((student) => student.id === selectedStudentId) ?? null;

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <View className="flex-row items-center justify-between gap-3">
            <AppText variant="title">{isEditing ? "Edit lesson" : "New lesson"}</AppText>
            {isEditing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Delete lesson"
                disabled={deleteMutation.isPending}
                onPress={onDeleteLessonPress}
                className={cn(
                  "h-10 w-10 items-center justify-center rounded-full border",
                  "border-red-500/30 bg-red-500/10 dark:border-red-400/30 dark:bg-red-400/10",
                  deleteMutation.isPending && "opacity-60",
                )}
              >
                <Trash2 size={18} color={deleteIconColor} />
              </Pressable>
            ) : null}
          </View>
          {endPreview ? (
            <AppText className="mt-2" variant="body">
              {startPreview.format(`ddd, ${DISPLAY_DATE_FORMAT}`)} · {startPreview.format("h:mm A")} –{" "}
              {endPreview.format("h:mm A")}
            </AppText>
          ) : (
            <AppText className="mt-2" variant="body">
              Enter a valid date and time.
            </AppText>
          )}

          {isEditing ? (
            <AppText className="mt-1" variant="caption">
              Student:{" "}
              {studentsQuery.isPending
                ? "Loading…"
                : selectedStudent
                  ? `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim()
                  : "Unknown student"}
            </AppText>
          ) : null}
        </View>

        <View
          className={cn(
            isSidebar ? "flex-row flex-wrap gap-6" : isCompact ? "gap-4" : "gap-6",
          )}
        >
          {!isEditing ? (
            <AppCard className={cn("gap-4", isSidebar && "flex-1 min-w-[360px]")}>
              <AppText variant="heading">Student</AppText>

              {studentsQuery.isPending ? (
                <AppText variant="caption">Loading students…</AppText>
              ) : studentsQuery.isError ? (
                <AppStack gap="md">
                  <AppText variant="error">{toErrorMessage(studentsQuery.error)}</AppText>
                  <AppButton
                    label="Retry students"
                    icon={RefreshCw}
                    variant="secondary"
                    onPress={() => studentsQuery.refetch()}
                  />
                </AppStack>
              ) : (
                <>
                  <Controller
                    control={form.control}
                    name="studentId"
                    render={({ field, fieldState }) => (
                      <AssessmentStudentDropdown
                        students={studentsForPicker}
                        selectedStudentId={field.value || null}
                        currentUserId={instructorId || profile.id}
                        disabled={saving}
                        error={fieldState.error?.message}
                        selectedStudentNameVariant="heading"
                        selectedStudentNameClassName="text-[18px]"
                        onSelectStudent={(student) => {
                          field.onChange(student.id);
                          form.setValue("location", student.address ?? "", { shouldValidate: false });
                        }}
                      />
                    )}
                  />

                  {selectedStudent ? (
                    <AppText variant="caption" className="text-[16px]">
                      {selectedStudent.address?.trim() ? selectedStudent.address : "-"}
                    </AppText>
                  ) : null}
                </>
              )}
            </AppCard>
          ) : null}

          <AppCard className={cn("gap-4", isSidebar && "flex-1 min-w-[360px]")}>
            <Controller
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <AppDateInput
                  label="Date"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
              )}
            />

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Controller
                  control={form.control}
                  name="startTime"
                  render={({ field, fieldState }) => (
                    <AppTimeInput
                      label="Start time"
                      value={field.value}
                      onChangeText={field.onChange}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>

              <View className="flex-1">
                <Controller
                  control={form.control}
                  name="durationMinutes"
                  render={({ field, fieldState }) => (
                    <AppInput
                      label="Duration (minutes)"
                      keyboardType="number-pad"
                      value={String(field.value)}
                      onChangeText={field.onChange}
                      onBlur={field.onBlur}
                      error={fieldState.error?.message}
                    />
                  )}
                />
              </View>
            </View>
          </AppCard>

          {!canManageLessonInstructor ||
          orgProfilesQuery.isPending ||
          orgProfilesQuery.isError ||
          showInstructorSelector ? (
            <AppCard className={cn("gap-4", isSidebar && "flex-1 min-w-[360px]")}>
              <AppText variant="heading">Instructor</AppText>

              <Controller
                control={form.control}
                name="instructorId"
                render={({ field, fieldState }) => (
                  <AppStack gap="sm">
                    {fieldState.error?.message ? (
                      <AppText variant="error">{fieldState.error.message}</AppText>
                    ) : null}

                    {canManageLessonInstructor ? (
                      orgProfilesQuery.isPending ? (
                        <AppText variant="caption">Loading instructors…</AppText>
                      ) : orgProfilesQuery.isError ? (
                        <AppStack gap="md">
                          <AppText variant="error">{toErrorMessage(orgProfilesQuery.error)}</AppText>
                          <AppButton
                            label="Retry instructors"
                            variant="secondary"
                            onPress={() => orgProfilesQuery.refetch()}
                          />
                        </AppStack>
                      ) : (
                        <AppStack gap="sm">
                          {assignableInstructorProfiles.map((profileOption) => (
                            <AppButton
                              key={profileOption.id}
                              label={`${profileOption.display_name}${
                                profileOption.role === "owner"
                                  ? ` (${toRoleLabel(profileOption.role)})`
                                  : ""
                              }`}
                              variant={field.value === profileOption.id ? "primary" : "secondary"}
                              onPress={() => {
                                field.onChange(profileOption.id);
                                if (!isEditing) {
                                  form.setValue("studentId", "", { shouldValidate: true });
                                  form.setValue("location", "", { shouldValidate: false });
                                }
                              }}
                            />
                          ))}
                        </AppStack>
                      )
                    ) : (
                      <AppText variant="body">{getProfileFullName(profile)}</AppText>
                    )}
                  </AppStack>
                )}
              />
            </AppCard>
          ) : null}

          <AppCard className={cn("gap-4", isSidebar && "flex-1 min-w-[360px]")}>
            <Controller
              control={form.control}
              name="notes"
              render={({ field }) => (
                <AppInput
                  label="Notes (optional)"
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                  inputClassName="h-28 py-3"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                />
              )}
            />
          </AppCard>

          {mutationError ? (
            <View className={cn(isSidebar && "w-full")}>
              <AppText variant="error">{toErrorMessage(mutationError)}</AppText>
            </View>
          ) : null}

          {isSidebar ? (
            <View className="w-full flex-row gap-3">
              <AppButton
                width="auto"
                className="flex-1"
                label={saving ? "Saving..." : isEditing ? "Save changes" : "Create lesson"}
                icon={isEditing ? Save : Plus}
                disabled={saving}
                onPress={form.handleSubmit(onSubmit)}
              />
              <AppButton
                width="auto"
                className="flex-1"
                label="Cancel"
                icon={X}
                variant="ghost"
                onPress={() => navigation.goBack()}
              />
            </View>
          ) : (
            <>
              <AppButton
                label={saving ? "Saving..." : isEditing ? "Save changes" : "Create lesson"}
                icon={isEditing ? Save : Plus}
                disabled={saving}
                onPress={form.handleSubmit(onSubmit)}
              />

              <AppButton
                label="Cancel"
                icon={X}
                variant="ghost"
                onPress={() => navigation.goBack()}
              />
            </>
          )}
        </View>
      </AppStack>
    </Screen>
  );
}
