import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, View } from "react-native";
import { RefreshCw, Trash2 } from "lucide-react-native";
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
import { AppTimeInput } from "../../components/AppTimeInput";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import {
  useCreateStudentSessionMutation,
  useDeleteStudentSessionMutation,
  useStudentSessionsQuery,
} from "../../features/sessions/queries";
import { studentSessionFormSchema, type StudentSessionFormValues } from "../../features/sessions/schemas";
import { useStudentQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentSessionHistory">;

const taskSuggestions = [
  "Pre-drive checks",
  "Mirror checks",
  "Indicating",
  "Lane positioning",
  "Turning technique",
  "Roundabouts",
  "Speed control",
  "Hazard perception",
  "Parking",
  "Reversing",
] as const;

function normalizeTaskLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const taskPalettes = [
  {
    wrapper: "border-emerald-500/30 bg-emerald-500/15 dark:border-emerald-400/30 dark:bg-emerald-400/15",
    text: "text-emerald-700 dark:text-emerald-300",
  },
  {
    wrapper: "border-orange-500/30 bg-orange-500/15 dark:border-orange-400/30 dark:bg-orange-400/15",
    text: "text-orange-700 dark:text-orange-300",
  },
] as const;

function getTaskPalette(task: string) {
  return taskPalettes[hashString(task) % taskPalettes.length];
}

function toggleTask(list: string[], task: string) {
  if (list.includes(task)) return list.filter((x) => x !== task);
  return [...list, task];
}

function TaskBadge({ task, rightText }: { task: string; rightText?: string }) {
  const palette = getTaskPalette(task);
  return (
    <View className={cn("rounded-full border px-3 py-1", palette.wrapper)}>
      <AppText className={cn("text-xs font-semibold", palette.text)} variant="caption">
        {task}
        {rightText ? ` - ${rightText}` : ""}
      </AppText>
    </View>
  );
}

function TaskChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const palette = getTaskPalette(label);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "rounded-full border px-3 py-2",
        selected
          ? palette.wrapper
          : "border-border bg-card dark:border-borderDark dark:bg-cardDark",
      )}
    >
      <AppText
        className={cn(
          selected ? palette.text : "text-muted dark:text-mutedDark",
          selected && "font-semibold",
        )}
        variant="caption"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

export function StudentSessionHistoryScreen({ route }: Props) {
  const { studentId, openNewSession } = route.params;
  const { userId, profile } = useCurrentUser();
  const { colorScheme } = useColorScheme();

  const trashColor = colorScheme === "dark" ? theme.colors.dangerDark : theme.colors.danger;

  const studentQuery = useStudentQuery(studentId);
  const sessionsQuery = useStudentSessionsQuery({ studentId });
  const createMutation = useCreateStudentSessionMutation();
  const deleteMutation = useDeleteStudentSessionMutation();

  const [addOpen, setAddOpen] = useState(Boolean(openNewSession));
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [customTask, setCustomTask] = useState("");
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const defaultTime = useMemo(() => dayjs().format("HH:mm"), []);

  const form = useForm<StudentSessionFormValues>({
    resolver: zodResolver(studentSessionFormSchema),
    defaultValues: {
      date: dayjs().format(DISPLAY_DATE_FORMAT),
      time: defaultTime,
      durationMinutes: "60",
      tasks: [],
      nextFocus: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (!openNewSession) return;
    setAddOpen(true);
  }, [openNewSession]);

  const sessions = sessionsQuery.data ?? [];
  const lastSession = sessions[0] ?? null;

  const topTasks = useMemo(() => {
    const counts = new Map<string, number>();
    for (const session of sessions) {
      for (const task of session.tasks ?? []) {
        counts.set(task, (counts.get(task) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([task, count]) => ({ task, count }));
  }, [sessions]);

  const confirmSave = form.handleSubmit((values) => {
    Alert.alert("Save session?", "Add this session to the student's history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Save", onPress: () => void onSubmit(values) },
    ]);
  });

  async function onSubmit(values: StudentSessionFormValues) {
    const student = studentQuery.data ?? null;
    if (!student) return;

    const dateISO = parseDateInputToISODate(values.date);
    if (!dateISO) return;

    const sessionAt = dayjs(`${dateISO}T${values.time}`).toISOString();
    const duration =
      values.durationMinutes.trim() === "" ? null : Math.max(15, Number(values.durationMinutes.trim()));

    const instructorId = profile.role === "owner" ? student.assigned_instructor_id : userId;

    try {
      await createMutation.mutateAsync({
        organization_id: profile.organization_id,
        student_id: student.id,
        instructor_id: instructorId,
        session_at: sessionAt,
        duration_minutes: duration,
        tasks: values.tasks,
        next_focus: values.nextFocus.trim() ? values.nextFocus.trim() : null,
        notes: values.notes.trim() ? values.notes.trim() : null,
      });

      form.reset({
        date: dayjs().format(DISPLAY_DATE_FORMAT),
        time: dayjs().format("HH:mm"),
        durationMinutes: "60",
        tasks: [],
        nextFocus: "",
        notes: "",
      });
      setCustomTask("");
      setSuggestionsOpen(false);
      setAddOpen(false);
    } catch (error) {
      Alert.alert("Couldn't save session", toErrorMessage(error));
    }
  }

  function onDeletePress(sessionId: string) {
    Alert.alert("Delete session?", "This permanently deletes the session.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => void deleteSession(sessionId),
      },
    ]);
  }

  async function deleteSession(sessionId: string) {
    setDeletingSessionId(sessionId);
    try {
      await deleteMutation.mutateAsync(sessionId);
    } catch (error) {
      Alert.alert("Couldn't delete session", toErrorMessage(error));
    } finally {
      setDeletingSessionId(null);
    }
  }

  return (
    <Screen scroll className={cn("max-w-6xl")}>
      <AppStack gap="lg">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <AppText variant="title">Session History</AppText>
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
            onPress={() => setAddOpen((v) => !v)}
          />
        </View>

        <AppCard className="gap-3">
          <View className="flex-row flex-wrap items-center justify-between gap-3">
            <View className="min-w-56 flex-1 gap-1">
              <AppText variant="label">Total sessions</AppText>
              <AppText variant="heading">{sessions.length}</AppText>
            </View>

            <View className="min-w-56 flex-1 gap-1">
              <AppText variant="label">Last session</AppText>
              <AppText variant="heading">
                {lastSession ? dayjs(lastSession.session_at).format(DISPLAY_DATE_FORMAT) : "-"}
              </AppText>
            </View>

            <View className="min-w-56 flex-1 gap-2">
              <AppText variant="label">Most practiced</AppText>
              {topTasks.length ? (
                <View className="flex-row flex-wrap gap-2">
                  {topTasks.map(({ task, count }) => (
                    <TaskBadge key={task} task={task} rightText={String(count)} />
                  ))}
                </View>
              ) : (
                <AppText variant="caption">-</AppText>
              )}
            </View>
          </View>
        </AppCard>

        {addOpen ? (
          <AppCollapsibleCard
            title="New session"
            subtitle="Record what you covered today (tasks + quick notes)."
            expanded
            onToggle={() => setAddOpen(false)}
          >
            <AppStack gap="md">
              {profile.role === "owner" && studentQuery.data ? (
                <AppText variant="caption">
                  Recorded under assigned instructor for this student.
                </AppText>
              ) : null}

              <View className="flex-row flex-wrap gap-4">
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

                <View className="min-w-56 flex-1">
                  <Controller
                    control={form.control}
                    name="durationMinutes"
                    render={({ field, fieldState }) => (
                      <AppInput
                        label="Duration (min)"
                        keyboardType="numeric"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        error={fieldState.error?.message}
                      />
                    )}
                  />
                </View>
              </View>

              <Controller
                control={form.control}
                name="tasks"
                render={({ field, fieldState }) => (
                  <AppStack gap="sm">
                    <View className="flex-row items-end justify-between gap-3">
                      <View className="flex-1">
                        <AppText variant="label">Tasks covered</AppText>
                        <AppText className="mt-1" variant="caption">
                          Select from suggestions or add your own.
                        </AppText>
                      </View>
                      <AppText variant="caption">{field.value.length} selected</AppText>
                    </View>

                    {fieldState.error?.message ? (
                      <AppText variant="error">{fieldState.error.message}</AppText>
                    ) : null}

                    {field.value.length ? (
                      <View className="flex-row flex-wrap gap-2">
                        {field.value.map((task) => (
                          <TaskChip
                            key={task}
                            label={task}
                            selected
                            onPress={() => field.onChange(field.value.filter((x) => x !== task))}
                          />
                        ))}
                      </View>
                    ) : (
                      <AppText variant="caption">No tasks selected yet.</AppText>
                    )}

                    <View className="flex-row items-start justify-between gap-3">
                      <View className="flex-1">
                        <AppText variant="label">Task suggestions</AppText>
                        <AppText className="mt-1" variant="caption">
                          10 quick picks (multiple choice)
                        </AppText>
                      </View>

                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={suggestionsOpen ? "Hide task suggestions" : "Show task suggestions"}
                        className={cn(
                          "rounded-full border px-4 py-2",
                          suggestionsOpen
                            ? "border-border bg-card dark:border-borderDark dark:bg-cardDark"
                            : "bg-emerald-600 border-emerald-700 dark:bg-amber-300 dark:border-amber-400",
                        )}
                        onPress={() => setSuggestionsOpen((v) => !v)}
                      >
                        <AppText
                          variant="label"
                          className={cn(
                            suggestionsOpen
                              ? "text-foreground dark:text-foregroundDark"
                              : "text-white dark:text-slate-900",
                          )}
                        >
                          {suggestionsOpen ? "Hide" : "Show"}
                        </AppText>
                      </Pressable>
                    </View>

                    {suggestionsOpen ? (
                      <View className="flex-row flex-wrap gap-2">
                        {taskSuggestions.map((task) => (
                          <TaskChip
                            key={task}
                            label={task}
                            selected={field.value.includes(task)}
                            onPress={() => field.onChange(toggleTask(field.value, task))}
                          />
                        ))}
                      </View>
                    ) : null}

                    <View className="flex-row items-end gap-2">
                      <AppInput
                        label="Add custom task"
                        containerClassName="flex-1"
                        value={customTask}
                        onChangeText={setCustomTask}
                        placeholder="e.g. Three-point turn"
                        autoCapitalize="sentences"
                      />
                      <AppButton
                        width="auto"
                        label="Add"
                        disabled={!customTask.trim()}
                        onPress={() => {
                          const next = normalizeTaskLabel(customTask);
                          if (!next) return;
                          if (field.value.includes(next)) {
                            setCustomTask("");
                            return;
                          }
                          field.onChange([...field.value, next]);
                          setCustomTask("");
                        }}
                      />
                    </View>

                    {lastSession?.tasks?.length ? (
                      <AppButton
                        width="auto"
                        variant="ghost"
                        label="Use last session tasks"
                        onPress={() => field.onChange(lastSession.tasks)}
                      />
                    ) : null}
                  </AppStack>
                )}
              />

              <View className="flex-row flex-wrap gap-4">
                <View className="min-w-56 flex-1">
                  <Controller
                    control={form.control}
                    name="nextFocus"
                    render={({ field }) => (
                      <AppInput
                        label="Next focus (optional)"
                        value={field.value}
                        onChangeText={field.onChange}
                        onBlur={field.onBlur}
                        placeholder="What to focus on next lesson"
                      />
                    )}
                  />
                </View>
              </View>

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

              <AppButton
                label={createMutation.isPending ? "Saving..." : "Save session"}
                disabled={createMutation.isPending || studentQuery.isPending || !studentQuery.data}
                onPress={confirmSave}
              />
            </AppStack>
          </AppCollapsibleCard>
        ) : null}

        <AppDivider />

        {sessionsQuery.isPending ? (
          <View className="items-center justify-center py-8">
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading sessions...
            </AppText>
          </View>
        ) : sessionsQuery.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn't load sessions</AppText>
              <AppText variant="body">{toErrorMessage(sessionsQuery.error)}</AppText>
            </AppCard>
            <AppButton
              label="Retry"
              icon={RefreshCw}
              variant="secondary"
              onPress={() => sessionsQuery.refetch()}
            />
          </AppStack>
        ) : sessions.length === 0 ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No sessions yet</AppText>
            <AppText variant="body">Add your first session to start tracking progress.</AppText>
          </AppCard>
        ) : (
          <AppStack gap="md">
            {sessions.map((session) => {
              const when = dayjs(session.session_at).isValid()
                ? dayjs(session.session_at).format(DISPLAY_DATE_FORMAT)
                : "Unknown date";
              const tasks = session.tasks ?? [];
              const subtitleParts = [
                tasks.length ? `Tasks: ${tasks.length}` : null,
                session.duration_minutes ? `${session.duration_minutes} min` : null,
                session.next_focus?.trim() ? `Next: ${session.next_focus.trim()}` : null,
              ].filter(Boolean);

              return (
                <AppCard key={session.id} className="gap-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <AppText variant="heading">Session on {when}</AppText>
                      <AppText className="mt-1" variant="caption">
                        {subtitleParts.length ? subtitleParts.join(" - ") : "-"}
                      </AppText>
                    </View>

                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Delete session"
                      disabled={deletingSessionId === session.id}
                      onPress={() => onDeletePress(session.id)}
                      className={cn(
                        "h-10 w-10 items-center justify-center rounded-full border",
                        "border-red-500/30 bg-red-500/10 dark:border-red-400/30 dark:bg-red-400/10",
                        deletingSessionId === session.id && "opacity-60",
                      )}
                    >
                      <Trash2 size={18} color={trashColor} />
                    </Pressable>
                  </View>

                  {tasks.length ? (
                    <View className="flex-row flex-wrap gap-2">
                      {tasks.map((task) => (
                        <TaskBadge key={task} task={task} />
                      ))}
                    </View>
                  ) : (
                    <AppText variant="caption">No tasks recorded.</AppText>
                  )}

                  {session.notes?.trim() ? (
                    <AppStack gap="sm">
                      <AppText variant="label">Notes</AppText>
                      <AppText variant="body">{session.notes.trim()}</AppText>
                    </AppStack>
                  ) : null}
                </AppCard>
              );
            })}
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}
