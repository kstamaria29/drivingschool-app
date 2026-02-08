import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { BellRing, RefreshCw, Trash2 } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useColorScheme } from "nativewind";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppCollapsibleCard } from "../../components/AppCollapsibleCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppDivider } from "../../components/AppDivider";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { formatReminderOffsets, reminderNotificationOptions } from "../../features/reminders/constants";
import {
  cancelReminderNotificationsForReminder,
  scheduleReminderNotificationsForReminder,
  syncReminderNotificationsForStudent,
} from "../../features/reminders/notifications";
import {
  useCreateStudentReminderMutation,
  useDeleteStudentReminderMutation,
  useStudentRemindersQuery,
} from "../../features/reminders/queries";
import {
  studentReminderFormSchema,
  type StudentReminderFormValues,
} from "../../features/reminders/schemas";
import { useStudentQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT, formatIsoDateToDisplay, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentReminders">;

function ReminderOptionChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "rounded-full border px-3 py-2",
        selected
          ? "border-primary bg-primary/15 dark:border-primaryDark dark:bg-primaryDark/20"
          : "border-border bg-card dark:border-borderDark dark:bg-cardDark",
      )}
    >
      <AppText
        variant="caption"
        className={cn(
          selected
            ? "font-semibold text-primary dark:text-primaryDark"
            : "text-muted dark:text-mutedDark",
        )}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function StudentRemindersScreen({ route }: Props) {
  const { studentId, openNewReminder } = route.params;
  const { userId, profile } = useCurrentUser();
  const { colorScheme } = useColorScheme();

  const trashColor = colorScheme === "dark" ? theme.colors.dangerDark : theme.colors.danger;

  const studentQuery = useStudentQuery(studentId);
  const remindersQuery = useStudentRemindersQuery({ studentId });
  const createMutation = useCreateStudentReminderMutation();
  const deleteMutation = useDeleteStudentReminderMutation();

  const [addOpen, setAddOpen] = useState(Boolean(openNewReminder));
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);

  const reminders = remindersQuery.data ?? [];
  const studentName = studentQuery.data
    ? `${studentQuery.data.first_name} ${studentQuery.data.last_name}`
    : "Student";

  const form = useForm<StudentReminderFormValues>({
    resolver: zodResolver(studentReminderFormSchema),
    defaultValues: {
      title: "",
      date: dayjs().format(DISPLAY_DATE_FORMAT),
      notificationOffsets: [60],
    },
  });

  useEffect(() => {
    if (!openNewReminder) return;
    setAddOpen(true);
  }, [openNewReminder]);

  const nextReminder = useMemo(() => {
    const today = dayjs().startOf("day");
    return reminders.find((reminder) => dayjs(reminder.reminder_date).endOf("day").isAfter(today.subtract(1, "minute"))) ?? null;
  }, [reminders]);

  const syncKey = useMemo(
    () => reminders.map((reminder) => `${reminder.id}:${reminder.updated_at}`).join("|"),
    [reminders],
  );

  useEffect(() => {
    if (!studentQuery.data) return;
    if (remindersQuery.isPending || remindersQuery.isError) return;

    void syncReminderNotificationsForStudent({
      userId,
      studentName,
      reminders,
    });
  }, [reminders, remindersQuery.isError, remindersQuery.isPending, studentName, syncKey, studentQuery.data, userId]);

  const confirmSave = form.handleSubmit(
    (values) => {
      Alert.alert("Save reminder?", "Create this reminder and schedule notifications on this device?", [
        { text: "Cancel", style: "cancel" },
        { text: "Save", onPress: () => void onSubmit(values) },
      ]);
    },
    (errors) => {
      const message =
        errors.title?.message ||
        errors.date?.message ||
        errors.notificationOffsets?.message ||
        "Please check the form and try again.";
      Alert.alert("Check reminder", message);
    },
  );

  async function onSubmit(values: StudentReminderFormValues) {
    const student = studentQuery.data;
    if (!student) return;

    const reminderDateISO = parseDateInputToISODate(values.date);
    if (!reminderDateISO) return;

    const instructorId = isOwnerOrAdminRole(profile.role) ? student.assigned_instructor_id : userId;

    try {
      const reminder = await createMutation.mutateAsync({
        organization_id: profile.organization_id,
        student_id: student.id,
        instructor_id: instructorId,
        title: values.title.trim(),
        reminder_date: reminderDateISO,
        notification_offsets_minutes: [...new Set(values.notificationOffsets)],
      });

      const notificationResult = await scheduleReminderNotificationsForReminder({
        userId,
        reminder,
        studentName,
      });

      if (!notificationResult.permissionGranted) {
        Alert.alert(
          "Reminder saved",
          "Reminder was saved, but notification permission is disabled on this device.",
        );
      }

      form.reset({
        title: "",
        date: dayjs().format(DISPLAY_DATE_FORMAT),
        notificationOffsets: [60],
      });
      setAddOpen(false);
    } catch (error) {
      Alert.alert("Couldn't save reminder", toErrorMessage(error));
    }
  }

  function onDeletePress(reminderId: string) {
    Alert.alert("Delete reminder?", "This permanently deletes the reminder.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteReminder(reminderId),
      },
    ]);
  }

  async function deleteReminder(reminderId: string) {
    setDeletingReminderId(reminderId);

    try {
      await deleteMutation.mutateAsync(reminderId);
      await cancelReminderNotificationsForReminder({ userId, reminderId });
    } catch (error) {
      Alert.alert("Couldn't delete reminder", toErrorMessage(error));
    } finally {
      setDeletingReminderId(null);
    }
  }

  return (
    <Screen scroll className={cn("max-w-6xl")}>
      <AppStack gap="lg">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <AppText variant="title">Reminders</AppText>
            <AppText className="mt-2" variant="caption">
              {studentQuery.data
                ? `${studentQuery.data.first_name} ${studentQuery.data.last_name}`
                : studentQuery.isPending
                  ? "Loading student..."
                  : "Student"}
            </AppText>
          </View>

          <AppButton
            width="auto"
            variant={addOpen ? "secondary" : "primary"}
            label={addOpen ? "Close" : "Add new"}
            icon={BellRing}
            onPress={() => setAddOpen((open) => !open)}
          />
        </View>

        <AppCard className="gap-3">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="min-w-56 flex-1 gap-1">
              <AppText variant="label">Total reminders</AppText>
              <AppText variant="heading">{reminders.length}</AppText>
            </View>

            <View className="min-w-56 flex-1 gap-1">
              <AppText variant="label">Next reminder</AppText>
              <AppText variant="heading">
                {nextReminder ? formatIsoDateToDisplay(nextReminder.reminder_date) : "-"}
              </AppText>
            </View>

            <View className="min-w-56 flex-1 gap-1">
              <AppText variant="label">Default reminder time</AppText>
              <AppText variant="heading">9:00 AM</AppText>
            </View>
          </View>
        </AppCard>

        {addOpen ? (
          <AppCollapsibleCard
            title="New reminder"
            subtitle="Set title, date, and notification lead times."
            expanded
            onToggle={() => setAddOpen(false)}
          >
            <AppStack gap="md">
              {isOwnerOrAdminRole(profile.role) && studentQuery.data ? (
                <AppText variant="caption">
                  Recorded under assigned instructor for this student.
                </AppText>
              ) : null}

              <Controller
                control={form.control}
                name="title"
                render={({ field, fieldState }) => (
                  <AppInput
                    label="Reminder title"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    placeholder="e.g. Test booking follow-up"
                  />
                )}
              />

              <Controller
                control={form.control}
                name="date"
                render={({ field, fieldState }) => (
                  <AppDateInput
                    label="Reminder date"
                    value={field.value}
                    onChangeText={field.onChange}
                    error={fieldState.error?.message}
                  />
                )}
              />

              <Controller
                control={form.control}
                name="notificationOffsets"
                render={({ field, fieldState }) => {
                  const selectedOffsets = field.value ?? [];

                  return (
                    <AppStack gap="sm">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <AppText variant="label">Reminder notifications</AppText>
                          <AppText className="mt-1" variant="caption">
                            Choose when to notify before the 9:00 AM reminder time.
                          </AppText>
                        </View>
                        <AppText variant="caption">
                          {selectedOffsets.length} selected
                        </AppText>
                      </View>

                      {fieldState.error?.message ? (
                        <AppText variant="error">{fieldState.error.message}</AppText>
                      ) : null}

                      <View className="flex-row flex-wrap gap-2">
                        {reminderNotificationOptions.map((option) => {
                          const selected = selectedOffsets.includes(option.value);
                          return (
                            <ReminderOptionChip
                              key={option.value}
                              label={option.label}
                              selected={selected}
                              onPress={() => {
                                if (selected) {
                                  field.onChange(selectedOffsets.filter((value) => value !== option.value));
                                  return;
                                }
                                field.onChange([...selectedOffsets, option.value]);
                              }}
                            />
                          );
                        })}
                      </View>
                    </AppStack>
                  );
                }}
              />

              <AppButton
                label={createMutation.isPending ? "Saving..." : "Save reminder"}
                disabled={createMutation.isPending || studentQuery.isPending || !studentQuery.data}
                onPress={confirmSave}
              />
            </AppStack>
          </AppCollapsibleCard>
        ) : null}

        <AppDivider />

        {remindersQuery.isPending ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading reminders...
            </AppText>
          </View>
        ) : remindersQuery.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load reminders</AppText>
              <AppText variant="body">{toErrorMessage(remindersQuery.error)}</AppText>
            </AppCard>
            <AppButton
              label="Retry"
              icon={RefreshCw}
              variant="secondary"
              onPress={() => remindersQuery.refetch()}
            />
          </AppStack>
        ) : reminders.length === 0 ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No reminders yet</AppText>
            <AppText variant="body">
              Add your first reminder to keep follow-ups on track.
            </AppText>
          </AppCard>
        ) : (
          <AppStack gap="md">
            {reminders.map((reminder) => {
              const isPast = dayjs(reminder.reminder_date).endOf("day").isBefore(dayjs());
              const reminderDateLabel = formatIsoDateToDisplay(reminder.reminder_date);
              const offsetLabel = formatReminderOffsets(reminder.notification_offsets_minutes);

              return (
                <AppCard key={reminder.id} className="gap-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <AppText variant="heading">{reminder.title}</AppText>
                      <AppText className="mt-1" variant="caption">
                        {reminderDateLabel}
                        {isPast ? " - Past due" : ""}
                      </AppText>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete reminder"
                      disabled={deletingReminderId === reminder.id}
                      onPress={() => onDeletePress(reminder.id)}
                      className={cn(
                        "h-10 w-10 items-center justify-center rounded-full border",
                        "border-red-500/30 bg-red-500/10 dark:border-red-400/30 dark:bg-red-400/10",
                        deletingReminderId === reminder.id && "opacity-60",
                      )}
                    >
                      <Trash2 size={18} color={trashColor} />
                    </Pressable>
                  </View>

                  <AppStack gap="sm">
                    <AppText variant="label">Notifications</AppText>
                    <AppText variant="body">{offsetLabel}</AppText>
                  </AppStack>
                </AppCard>
              );
            })}
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}

