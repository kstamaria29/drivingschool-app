import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useMyProfileQuery } from "../../features/auth/queries";
import { useAuthSession } from "../../features/auth/session";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { useCreateLessonMutation, useLessonQuery, useUpdateLessonMutation } from "../../features/lessons/queries";
import { lessonFormSchema, type LessonFormValues } from "../../features/lessons/schemas";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import type { LessonsStackParamList } from "../LessonsStackNavigator";

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
  const lessonId = route.name === "LessonEdit" ? route.params.lessonId : undefined;

  const { session } = useAuthSession();
  const userId = session?.user.id;
  const profileQuery = useMyProfileQuery(userId);

  const lessonQuery = useLessonQuery(lessonId);
  const createMutation = useCreateLessonMutation();
  const updateMutation = useUpdateLessonMutation();

  const role = profileQuery.data?.role ?? null;
  const isOwner = role === "owner";

  const orgProfilesQuery = useOrganizationProfilesQuery(isOwner);
  const studentsQuery = useStudentsQuery({ archived: false });

  const [studentSearch, setStudentSearch] = useState("");

  const defaultDate = useMemo(() => dayjs().format("YYYY-MM-DD"), []);
  const defaultStartTime = useMemo(() => {
    const now = dayjs();
    return `${pad2(now.hour())}:${pad2(now.minute())}`;
  }, []);

  const defaultInstructorId = useMemo(() => {
    if (role === "instructor") return userId ?? "";
    if (role === "owner") return userId ?? "";
    return "";
  }, [role, userId]);

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
    if (!lessonId) return;
    if (!lessonQuery.data) return;

    const start = dayjs(lessonQuery.data.start_time);
    const end = dayjs(lessonQuery.data.end_time);
    const duration = Math.max(15, end.diff(start, "minute"));

    form.reset({
      date: start.format("YYYY-MM-DD"),
      startTime: start.format("HH:mm"),
      durationMinutes: String(duration),
      studentId: lessonQuery.data.student_id,
      instructorId: lessonQuery.data.instructor_id,
      status: lessonQuery.data.status,
      location: lessonQuery.data.location ?? "",
      notes: lessonQuery.data.notes ?? "",
    });
  }, [form, lessonId, lessonQuery.data]);

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
  const saving = createMutation.isPending || updateMutation.isPending;
  const mutationError = createMutation.error ?? updateMutation.error;

  const instructorId = form.watch("instructorId");

  const studentOptions = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    const all = studentsQuery.data ?? [];
    const filtered = instructorId ? all.filter((s) => s.assigned_instructor_id === instructorId) : all;
    if (!needle) return filtered;
    return filtered.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      return fullName.includes(needle) || email.includes(needle) || phone.includes(needle);
    });
  }, [instructorId, studentSearch, studentsQuery.data]);

  async function onSubmit(values: LessonFormValues) {
    const start = dayjs(`${values.date}T${values.startTime}`);
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
      navigation.goBack();
      return;
    }

    await createMutation.mutateAsync({
      organization_id: organizationId,
      ...base,
    });

    navigation.goBack();
  }

  const startPreview = dayjs(`${form.watch("date")}T${form.watch("startTime")}`);
  const durationPreview = Number(form.watch("durationMinutes")) || 60;
  const endPreview = startPreview.isValid() ? startPreview.add(durationPreview, "minute") : null;

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">{isEditing ? "Edit lesson" : "New lesson"}</AppText>
          {endPreview ? (
            <AppText className="mt-2" variant="body">
              {startPreview.format("ddd, D MMM")} · {startPreview.format("h:mm A")} –{" "}
              {endPreview.format("h:mm A")}
            </AppText>
          ) : (
            <AppText className="mt-2" variant="body">
              Enter a valid date and time.
            </AppText>
          )}
        </View>

        <AppCard className="gap-4">
          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <AppInput
                label="Date (YYYY-MM-DD)"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="startTime"
            render={({ field, fieldState }) => (
              <AppInput
                label="Start time (HH:mm)"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

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
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Instructor</AppText>

          <Controller
            control={form.control}
            name="instructorId"
            render={({ field, fieldState }) => (
              <AppStack gap="sm">
                {fieldState.error?.message ? (
                  <AppText variant="error">{fieldState.error.message}</AppText>
                ) : null}

                {isOwner ? (
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
                      {orgProfilesQuery.data.map((profileOption) => (
                        <AppButton
                          key={profileOption.id}
                          label={`${profileOption.display_name}${
                            profileOption.role === "owner" ? " (owner)" : ""
                          }`}
                          variant={field.value === profileOption.id ? "primary" : "secondary"}
                          onPress={() => {
                            field.onChange(profileOption.id);
                            form.setValue("studentId", "", { shouldValidate: true });
                          }}
                        />
                      ))}
                    </AppStack>
                  )
                ) : (
                  <AppText variant="body">{profile.display_name}</AppText>
                )}
              </AppStack>
            )}
          />
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Student</AppText>

          {studentsQuery.isPending ? (
            <AppText variant="caption">Loading students…</AppText>
          ) : studentsQuery.isError ? (
            <AppStack gap="md">
              <AppText variant="error">{toErrorMessage(studentsQuery.error)}</AppText>
              <AppButton label="Retry students" variant="secondary" onPress={() => studentsQuery.refetch()} />
            </AppStack>
          ) : (
            <>
              <AppInput
                label="Search"
                autoCapitalize="none"
                value={studentSearch}
                onChangeText={setStudentSearch}
              />

              <Controller
                control={form.control}
                name="studentId"
                render={({ field, fieldState }) => (
                  <AppStack gap="sm">
                    {fieldState.error?.message ? (
                      <AppText variant="error">{fieldState.error.message}</AppText>
                    ) : null}

                    {studentOptions.length === 0 ? (
                      <AppText variant="caption">No students match this instructor/search.</AppText>
                    ) : (
                      studentOptions.map((student) => (
                        <AppButton
                          key={student.id}
                          label={`${student.first_name} ${student.last_name}`}
                          variant={field.value === student.id ? "primary" : "secondary"}
                          onPress={() => field.onChange(student.id)}
                        />
                      ))
                    )}
                  </AppStack>
                )}
              />
            </>
          )}
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Status</AppText>

          <Controller
            control={form.control}
            name="status"
            render={({ field }) => (
              <View className="flex-row gap-2">
                <AppButton
                  label="Scheduled"
                  className="flex-1 w-auto"
                  variant={field.value === "scheduled" ? "primary" : "secondary"}
                  onPress={() => field.onChange("scheduled")}
                />
                <AppButton
                  label="Completed"
                  className="flex-1 w-auto"
                  variant={field.value === "completed" ? "primary" : "secondary"}
                  onPress={() => field.onChange("completed")}
                />
                <AppButton
                  label="Cancelled"
                  className="flex-1 w-auto"
                  variant={field.value === "cancelled" ? "primary" : "secondary"}
                  onPress={() => field.onChange("cancelled")}
                />
              </View>
            )}
          />
        </AppCard>

        <AppCard className="gap-4">
          <Controller
            control={form.control}
            name="location"
            render={({ field }) => (
              <AppInput
                label="Location (optional)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

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

        {mutationError ? <AppText variant="error">{toErrorMessage(mutationError)}</AppText> : null}

        <AppButton
          label={saving ? "Saving..." : isEditing ? "Save changes" : "Create lesson"}
          disabled={saving}
          onPress={form.handleSubmit(onSubmit)}
        />

        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </AppStack>
    </Screen>
  );
}
