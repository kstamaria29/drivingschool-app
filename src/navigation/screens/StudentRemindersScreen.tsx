import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { BellRing, Pencil, RefreshCw, Trash2, X } from "lucide-react-native";
import { Controller, useForm } from "react-hook-form";
import { useColorScheme } from "nativewind";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { AppTimeInput } from "../../components/AppTimeInput";
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
  useUpdateStudentReminderMutation,
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
  const editColor = colorScheme === "dark" ? "#4ade80" : "#16a34a";

  const studentQuery = useStudentQuery(studentId);
  const remindersQuery = useStudentRemindersQuery({ studentId });
  const createMutation = useCreateStudentReminderMutation();
  const deleteMutation = useDeleteStudentReminderMutation();
  const updateMutation = useUpdateStudentReminderMutation();

  const [createModalVisible, setCreateModalVisible] = useState(Boolean(openNewReminder));
  const [deletingReminderId, setDeletingReminderId] = useState<string | null>(null);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);

  const reminders = remindersQuery.data ?? [];
  const sortedReminders = useMemo(() => {
    if (reminders.length <= 1) return reminders;

    const now = dayjs();
    const toTimeHHmm = (value: string) => {
      const match = value.match(/^([01]\d|2[0-3]):[0-5]\d/);
      return match ? match[0] : "09:00";
    };

    const items = reminders.map((reminder) => {
      const time = toTimeHHmm(reminder.reminder_time);
      const dateTime = dayjs(`${reminder.reminder_date}T${time}:00`);
      return {
        reminder,
        dateTime: dateTime.isValid()
          ? dateTime
          : dayjs(reminder.reminder_date).startOf("day"),
      };
    });

    items.sort((a, b) => a.dateTime.valueOf() - b.dateTime.valueOf());

    const upcoming: typeof items = [];
    const past: typeof items = [];
    for (const item of items) {
      if (item.dateTime.isBefore(now)) past.push(item);
      else upcoming.push(item);
    }

    return [...upcoming, ...past].map((item) => item.reminder);
  }, [reminders]);
  const studentName = studentQuery.data
    ? `${studentQuery.data.first_name} ${studentQuery.data.last_name}`
    : "Student";

  const defaultFormValues: StudentReminderFormValues = {
    title: "",
    date: dayjs().format(DISPLAY_DATE_FORMAT),
    time: "09:00",
    notificationOffsets: [60],
  };

  const form = useForm<StudentReminderFormValues>({
    resolver: zodResolver(studentReminderFormSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (!openNewReminder) return;
    openCreateModal();
  }, [openNewReminder]);

  const syncKey = useMemo(
    () => reminders.map((reminder) => `${reminder.id}:${reminder.updated_at}`).join("|"),
    [reminders],
  );
  const watchedTime = form.watch("time");

  function resetCreateForm() {
    form.reset({
      ...defaultFormValues,
      date: dayjs().format(DISPLAY_DATE_FORMAT),
    });
  }

  function openCreateModal() {
    setEditingReminderId(null);
    resetCreateForm();
    setCreateModalVisible(true);
  }

  function closeCreateModal() {
    setCreateModalVisible(false);
    setEditingReminderId(null);
  }

  function openEditModal(reminder: (typeof reminders)[number]) {
    setEditingReminderId(reminder.id);
    form.reset({
      title: reminder.title ?? "",
      date: formatIsoDateToDisplay(reminder.reminder_date),
      time: reminder.reminder_time.match(/^([01]\d|2[0-3]):[0-5]\d/)?.[0] ?? "09:00",
      notificationOffsets: reminder.notification_offsets_minutes ?? [],
    });
    setCreateModalVisible(true);
  }

  function formatReminderTimeLabel(reminderTime: string) {
    const match = reminderTime.match(/^([01]\d|2[0-3]):[0-5]\d/);
    const value = match ? match[0] : "09:00";
    return dayjs(`2000-01-01T${value}:00`).format("h:mm A");
  }

  function formatReminderTimeHint(reminderTime: string) {
    const match = reminderTime.match(/^([01]\d|2[0-3]):[0-5]\d/);
    const value = match ? match[0] : "09:00";
    return dayjs(`2000-01-01T${value}:00`).format("h:mm a");
  }

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
      const reminderId = editingReminderId;
      Alert.alert(
        reminderId ? "Save changes?" : "Save entry?",
        reminderId
          ? "Update this entry and reschedule notifications on this device?"
          : "Create this entry and schedule notifications on this device?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Save",
            onPress: () =>
              reminderId ? void onUpdate(reminderId, values) : void onCreate(values),
          },
        ],
      );
    },
    (errors) => {
      const message =
        errors.title?.message ||
        errors.date?.message ||
        errors.time?.message ||
        errors.notificationOffsets?.message ||
        "Please check the form and try again.";
      Alert.alert("Check form", message);
    },
  );

  async function onCreate(values: StudentReminderFormValues) {
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
        reminder_time: values.time,
        notification_offsets_minutes: [...new Set(values.notificationOffsets)],
      });

      const notificationResult = await scheduleReminderNotificationsForReminder({
        userId,
        reminder,
        studentName,
      });

      if (!notificationResult.permissionGranted) {
        Alert.alert(
          "Saved",
          "Entry was saved, but notification permission is disabled on this device.",
        );
      }

      resetCreateForm();
      closeCreateModal();
    } catch (error) {
      Alert.alert("Couldn't save entry", toErrorMessage(error));
    }
  }

  async function onUpdate(reminderId: string, values: StudentReminderFormValues) {
    const student = studentQuery.data;
    if (!student) return;

    const reminderDateISO = parseDateInputToISODate(values.date);
    if (!reminderDateISO) return;

    try {
      const reminder = await updateMutation.mutateAsync({
        reminderId,
        values: {
          title: values.title.trim(),
          reminder_date: reminderDateISO,
          reminder_time: values.time,
          notification_offsets_minutes: [...new Set(values.notificationOffsets)],
        },
      });

      const notificationResult = await scheduleReminderNotificationsForReminder({
        userId,
        reminder,
        studentName,
      });

      if (!notificationResult.permissionGranted) {
        Alert.alert(
          "Saved",
          "Entry was saved, but notification permission is disabled on this device.",
        );
      }

      resetCreateForm();
      closeCreateModal();
    } catch (error) {
      Alert.alert("Couldn't save entry", toErrorMessage(error));
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
    <>
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
              variant="primary"
              label="Add new"
              icon={BellRing}
              onPress={openCreateModal}
            />
          </View>

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
          ) : sortedReminders.length === 0 ? (
            <AppCard className="gap-2">
              <AppText variant="heading">No reminders yet</AppText>
              <AppText variant="body">
                Add your first reminder to keep follow-ups on track.
              </AppText>
            </AppCard>
          ) : (
            <AppStack gap="md">
              {sortedReminders.map((reminder) => {
                const now = dayjs();
                const timeHHmm = reminder.reminder_time.match(/^([01]\d|2[0-3]):[0-5]\d/)?.[0] ?? "09:00";
                const reminderDateTime = dayjs(`${reminder.reminder_date}T${timeHHmm}:00`);
                const isPast = reminderDateTime.isValid()
                  ? reminderDateTime.isBefore(now)
                  : dayjs(reminder.reminder_date).endOf("day").isBefore(now);
                const reminderDateLabel = `${formatIsoDateToDisplay(reminder.reminder_date)} ${formatReminderTimeLabel(reminder.reminder_time)}`;
                const offsetLabel = formatReminderOffsets(reminder.notification_offsets_minutes);

                return (
                  <AppCard key={reminder.id} className="gap-4">
                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <AppText
                          variant="heading"
                          className={cn(isPast && "text-danger dark:text-dangerDark")}
                        >
                          {reminder.title}
                        </AppText>
                        <AppText className="mt-1" variant="caption">
                          {reminderDateLabel}
                          {isPast ? " - Past due" : ""}
                        </AppText>
                      </View>

                      <View className="flex-row items-center gap-2">
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel="Edit reminder"
                          disabled={deletingReminderId === reminder.id}
                          onPress={() => openEditModal(reminder)}
                          className={cn(
                            "h-10 w-10 items-center justify-center rounded-full border",
                            "border-green-600/30 bg-green-600/10 dark:border-green-400/30 dark:bg-green-400/10",
                            deletingReminderId === reminder.id && "opacity-60",
                          )}
                        >
                          <Pencil size={18} color={editColor} />
                        </Pressable>

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

      <Modal
        visible={createModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeCreateModal}
      >
        <Pressable
          className="flex-1 bg-black/40 px-6 py-10"
          onPress={closeCreateModal}
        >
          <Pressable
            className="m-auto w-full max-w-2xl"
            onPress={(event) => event.stopPropagation()}
          >
            <AppCard className="gap-4">
              <View className="flex-row items-center justify-between gap-2">
                <AppText variant="heading">
                  {editingReminderId ? "Edit Reminder" : "Add New Reminder"}
                </AppText>
                <AppButton
                  label=""
                  width="auto"
                  size="icon"
                  variant="ghost"
                  icon={X}
                  accessibilityLabel="Close"
                  onPress={closeCreateModal}
                />
              </View>

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
                    label="Title"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    error={fieldState.error?.message}
                    placeholder="e.g. Test booking follow-up"
                  />
                )}
              />

              <View className="flex-row flex-wrap gap-3">
                <View className="min-w-56 flex-1">
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
                </View>

                <View className="min-w-56 flex-1">
                  <Controller
                    control={form.control}
                    name="time"
                    render={({ field, fieldState }) => (
                      <AppTimeInput
                        label="Time"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={form.control}
                name="notificationOffsets"
                render={({ field, fieldState }) => {
                  const selectedOffsets = field.value ?? [];

                  return (
                    <AppStack gap="sm">
                      <View className="flex-row items-start justify-between gap-3">
                        <View className="flex-1">
                          <AppText variant="label">Notifications</AppText>
                          <AppText className="mt-1" variant="caption">
                            {`Choose when to notify before the ${formatReminderTimeHint(watchedTime)} reminder time.`}
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

              <View className="flex-row gap-2">
                <AppButton
                  width="auto"
                  className="flex-1"
                  variant="secondary"
                  label="Cancel"
                  onPress={closeCreateModal}
                />
                <AppButton
                  width="auto"
                  className="flex-1"
                  label={createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                  disabled={
                    createMutation.isPending ||
                    updateMutation.isPending ||
                    studentQuery.isPending ||
                    !studentQuery.data
                  }
                  onPress={confirmSave}
                />
              </View>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
