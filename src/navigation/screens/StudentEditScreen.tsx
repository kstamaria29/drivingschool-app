import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useMyProfileQuery } from "../../features/auth/queries";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { useAuthSession } from "../../features/auth/session";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import {
  useCreateStudentMutation,
  useStudentQuery,
  useUpdateStudentMutation,
} from "../../features/students/queries";
import { studentFormSchema, type StudentFormValues } from "../../features/students/schemas";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { formatIsoDateToDisplay, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { StudentsStackParamList } from "../StudentsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type CreateProps = NativeStackScreenProps<StudentsStackParamList, "StudentCreate">;
type EditProps = NativeStackScreenProps<StudentsStackParamList, "StudentEdit">;
type Props = CreateProps | EditProps;

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

type LicenseType = StudentFormValues["licenseType"];

function LicenseTypeCircleButton({
  value,
  selected,
  letter,
  accessibilityLabel,
  unselectedClassName,
  selectedClassName,
  textClassName,
  onPress,
}: {
  value: LicenseType;
  selected: boolean;
  letter: string;
  accessibilityLabel: string;
  unselectedClassName: string;
  selectedClassName: string;
  textClassName: string;
  onPress: (value: LicenseType) => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className={cn(
        "h-12 w-12 items-center justify-center rounded-full border",
        selected ? selectedClassName : unselectedClassName,
      )}
      onPress={() => onPress(value)}
    >
      <AppText variant="label" className={textClassName}>
        {letter}
      </AppText>
    </Pressable>
  );
}

export function StudentEditScreen({ navigation, route }: Props) {
  const studentId = route.name === "StudentEdit" ? route.params.studentId : undefined;
  const { isTablet } = useNavigationLayout();

  const { session } = useAuthSession();
  const userId = session?.user.id;
  const profileQuery = useMyProfileQuery(userId);

  const studentQuery = useStudentQuery(studentId);
  const createMutation = useCreateStudentMutation();
  const updateMutation = useUpdateStudentMutation();

  const role = profileQuery.data?.role ?? null;
  const canManageStudentAssignments = isOwnerOrAdminRole(role);

  const orgProfilesQuery = useOrganizationProfilesQuery(canManageStudentAssignments);

  const defaultAssignedInstructorId = useMemo(() => {
    if (role === "instructor") return userId ?? "";
    if (role === "owner") return userId ?? "";
    return "";
  }, [role, userId]);

  const assignableInstructorProfiles = useMemo(
    () =>
      studentId
        ? (orgProfilesQuery.data ?? [])
        : (orgProfilesQuery.data ?? []).filter((profileOption) => profileOption.role !== "admin"),
    [orgProfilesQuery.data, studentId],
  );

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      address: "",
      assignedInstructorId: defaultAssignedInstructorId,
      licenseType: "learner",
      licenseNumber: "",
      licenseVersion: "",
      classHeld: "",
      issueDate: "",
      expiryDate: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (defaultAssignedInstructorId) {
      form.setValue("assignedInstructorId", defaultAssignedInstructorId, { shouldValidate: true });
    }
  }, [defaultAssignedInstructorId, form]);

  useEffect(() => {
    if (!studentId) return;
    if (!studentQuery.data) return;

    form.reset({
      firstName: studentQuery.data.first_name,
      lastName: studentQuery.data.last_name,
      email: studentQuery.data.email ?? "",
      phone: studentQuery.data.phone ?? "",
      address: studentQuery.data.address ?? "",
      assignedInstructorId: studentQuery.data.assigned_instructor_id,
      licenseType: studentQuery.data.license_type ?? "learner",
      licenseNumber: studentQuery.data.license_number ?? "",
      licenseVersion: studentQuery.data.license_version ?? "",
      classHeld: studentQuery.data.class_held ?? "",
      issueDate: studentQuery.data.issue_date ? formatIsoDateToDisplay(studentQuery.data.issue_date) : "",
      expiryDate: studentQuery.data.expiry_date ? formatIsoDateToDisplay(studentQuery.data.expiry_date) : "",
      notes: studentQuery.data.notes ?? "",
    });
  }, [form, studentId, studentQuery.data]);

  const isLoading =
    profileQuery.isPending || (studentId ? studentQuery.isPending : false) || !session;

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
  const isEditing = Boolean(studentId);
  const mutationError = createMutation.error ?? updateMutation.error;

  function mapStudentInput(values: StudentFormValues) {
    const base = {
      assigned_instructor_id: values.assignedInstructorId,
      first_name: values.firstName.trim(),
      last_name: values.lastName.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: emptyToNull(values.address),
      license_type: values.licenseType,
      license_number: emptyToNull(values.licenseNumber),
      license_version: emptyToNull(values.licenseVersion),
      class_held: emptyToNull(values.classHeld),
      issue_date: values.issueDate.trim() ? parseDateInputToISODate(values.issueDate) : null,
      expiry_date: values.expiryDate.trim() ? parseDateInputToISODate(values.expiryDate) : null,
      notes: emptyToNull(values.notes),
    } as const;
    return base;
  }

  async function createStudentAndNavigate(values: StudentFormValues) {
    const base = mapStudentInput(values);
    const created = await createMutation.mutateAsync({
      organization_id: organizationId,
      ...base,
    });
    navigation.replace("StudentDetail", { studentId: created.id });
  }

  async function updateStudentAndNavigate(values: StudentFormValues) {
    const updated = await updateMutation.mutateAsync({
      studentId: studentId!,
      input: mapStudentInput(values),
    });
    navigation.replace("StudentDetail", { studentId: updated.id });
  }

  async function onSubmit(values: StudentFormValues) {
    if (!userId) return;

    if (isEditing) {
      Alert.alert("Save student", "Save changes to this student?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            void updateStudentAndNavigate(values).catch(() => {
              // Mutation error state is already handled by React Query and rendered below.
            });
          },
        },
      ]);
      return;
    }

    Alert.alert("Add student", "Add this student now?", [
      { text: "Back", style: "cancel" },
      {
        text: "Confirm",
        onPress: () => {
          void createStudentAndNavigate(values).catch(() => {
            // Mutation error state is already handled by React Query and rendered below.
          });
        },
      },
    ]);
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">{isEditing ? "Edit student" : "New student"}</AppText>
          <AppText className="mt-2" variant="body">
            {canManageStudentAssignments
              ? "You can assign this student to an instructor."
              : "This student will be assigned to you."}
          </AppText>
        </View>

        <AppCard className="gap-4">
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <AppInput
                label="First name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="lastName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Last name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <AppInput
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="phone"
            render={({ field, fieldState }) => (
              <AppInput
                label="Phone"
                keyboardType="phone-pad"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field }) => (
              <AppInput
                label="Address (optional)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Assigned instructor</AppText>

          <Controller
            control={form.control}
            name="assignedInstructorId"
            render={({ field, fieldState }) => (
              <AppStack gap="sm">
                {fieldState.error?.message ? (
                  <AppText variant="error">{fieldState.error.message}</AppText>
                ) : null}

                {canManageStudentAssignments ? (
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
                      {assignableInstructorProfiles.length === 0 ? (
                        <AppText variant="caption">No instructors available.</AppText>
                      ) : (
                        assignableInstructorProfiles.map((profileOption) => (
                          <AppButton
                            key={profileOption.id}
                            label={`${profileOption.display_name}${
                              profileOption.role === "owner" || profileOption.role === "admin"
                                ? ` (${profileOption.role})`
                                : ""
                            }`}
                            variant={field.value === profileOption.id ? "primary" : "secondary"}
                            onPress={() => field.onChange(profileOption.id)}
                          />
                        ))
                      )}
                    </AppStack>
                  )
                ) : (
                  <AppText variant="body">{getProfileFullName(profile)}</AppText>
                )}
              </AppStack>
            )}
          />
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Licence</AppText>

          <Controller
            control={form.control}
            name="licenseType"
            render={({ field, fieldState }) => (
              <AppStack gap="sm">
                <AppText variant="label">Licence type</AppText>
                {fieldState.error?.message ? (
                  <AppText variant="error">{fieldState.error.message}</AppText>
                ) : null}

                {isTablet ? (
                  <View className="flex-row gap-2">
                    <AppButton
                      label="Learner"
                      width="auto"
                      className="flex-1"
                      variant={field.value === "learner" ? "primary" : "secondary"}
                      onPress={() => field.onChange("learner")}
                    />
                    <AppButton
                      label="Restricted"
                      width="auto"
                      className="flex-1"
                      variant={field.value === "restricted" ? "primary" : "secondary"}
                      onPress={() => field.onChange("restricted")}
                    />
                    <AppButton
                      label="Full"
                      width="auto"
                      className="flex-1"
                      variant={field.value === "full" ? "primary" : "secondary"}
                      onPress={() => field.onChange("full")}
                    />
                  </View>
                ) : (
                  <View className="flex-row gap-3">
                    <LicenseTypeCircleButton
                      value="learner"
                      selected={field.value === "learner"}
                      letter="L"
                      accessibilityLabel="Learner licence"
                      unselectedClassName="border-amber-500/30 bg-amber-500/10"
                      selectedClassName="border-amber-500/40 bg-amber-500/20"
                      textClassName="text-amber-700 dark:text-amber-300"
                      onPress={field.onChange}
                    />
                    <LicenseTypeCircleButton
                      value="restricted"
                      selected={field.value === "restricted"}
                      letter="R"
                      accessibilityLabel="Restricted licence"
                      unselectedClassName="border-blue-500/30 bg-blue-500/10"
                      selectedClassName="border-blue-500/40 bg-blue-500/20"
                      textClassName="text-blue-700 dark:text-blue-300"
                      onPress={field.onChange}
                    />
                    <LicenseTypeCircleButton
                      value="full"
                      selected={field.value === "full"}
                      letter="F"
                      accessibilityLabel="Full licence"
                      unselectedClassName="border-emerald-500/30 bg-emerald-500/10"
                      selectedClassName="border-emerald-500/40 bg-emerald-500/20"
                      textClassName="text-emerald-700 dark:text-emerald-300"
                      onPress={field.onChange}
                    />
                  </View>
                )}
              </AppStack>
            )}
          />

          <Controller
            control={form.control}
            name="licenseNumber"
            render={({ field }) => (
              <AppInput
                label="Licence number"
                autoCapitalize="characters"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            control={form.control}
            name="licenseVersion"
            render={({ field }) => (
              <AppInput
                label="Licence version"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            control={form.control}
            name="classHeld"
            render={({ field }) => (
              <AppInput
                label="Class held"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
              />
            )}
          />

          <Controller
            control={form.control}
            name="issueDate"
            render={({ field, fieldState }) => (
              <AppStack gap="sm">
                <AppDateInput
                  label="Issue date"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
                {isEditing && field.value.trim() ? (
                  <AppButton
                    width="auto"
                    variant="ghost"
                    label="Clear issue date"
                    onPress={() => field.onChange("")}
                  />
                ) : null}
              </AppStack>
            )}
          />

          <Controller
            control={form.control}
            name="expiryDate"
            render={({ field, fieldState }) => (
              <AppStack gap="sm">
                <AppDateInput
                  label="Expiry date"
                  value={field.value}
                  onChangeText={field.onChange}
                  error={fieldState.error?.message}
                />
                {isEditing && field.value.trim() ? (
                  <AppButton
                    width="auto"
                    variant="ghost"
                    label="Clear expiry date"
                    onPress={() => field.onChange("")}
                  />
                ) : null}
              </AppStack>
            )}
          />
        </AppCard>

        <AppCard className="gap-4">
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
          label={saving ? "Saving..." : isEditing ? "Save student" : "Add student"}
          disabled={saving}
          onPress={form.handleSubmit(onSubmit)}
        />

        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </AppStack>
    </Screen>
  );
}
