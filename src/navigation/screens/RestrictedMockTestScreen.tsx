import AsyncStorage from "@react-native-async-storage/async-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { Controller, useForm } from "react-hook-form";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppCollapsibleCard } from "../../components/AppCollapsibleCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { AppTimeInput } from "../../components/AppTimeInput";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { ensureAndroidDownloadsDirectoryUri } from "../../features/assessments/android-downloads";
import { useCreateAssessmentMutation } from "../../features/assessments/queries";
import {
  restrictedMockTestCriticalErrors,
  restrictedMockTestImmediateErrors,
  restrictedMockTestStages,
  restrictedMockTestTaskItems,
  type RestrictedMockTestStageId,
  type RestrictedMockTestTaskId,
  type RestrictedMockTestTaskItemId,
} from "../../features/assessments/restricted-mock-test/constants";
import { exportRestrictedMockTestPdf } from "../../features/assessments/restricted-mock-test/pdf";
import {
  calculateRestrictedMockTestSummary,
  type RestrictedMockTestErrorCounts,
  type RestrictedMockTestStagesState,
  type RestrictedMockTestTaskState,
} from "../../features/assessments/restricted-mock-test/scoring";
import {
  restrictedMockTestFormSchema,
  restrictedMockTestStoredDataSchema,
  type RestrictedMockTestFormValues,
  type RestrictedMockTestStoredData,
} from "../../features/assessments/restricted-mock-test/schema";
import { notifyPdfSaved } from "../../features/notifications/download-notifications";
import { useOrganizationQuery } from "../../features/organization/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";
import { openPdfUri } from "../../utils/open-pdf";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "RestrictedMockTest">;

type Stage = "details" | "confirm" | "test";
type FaultValue = "" | "fault";

const DRAFT_VERSION = 1;

function draftKey(userId: string, studentId: string) {
  return `drivingschool.assessments.second_assessment.draft.v${DRAFT_VERSION}:${userId}:${studentId}`;
}

function createErrorCounts(errors: readonly string[]) {
  return errors.reduce<Record<string, number>>((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {});
}

function createEmptyItems() {
  return restrictedMockTestTaskItems.reduce<Record<RestrictedMockTestTaskItemId, FaultValue>>(
    (acc, item) => {
      acc[item.id] = "";
      return acc;
    },
    {} as Record<RestrictedMockTestTaskItemId, FaultValue>,
  );
}

function createEmptyStagesState(): RestrictedMockTestStagesState {
  const state: RestrictedMockTestStagesState = { stage1: {}, stage2: {} };
  restrictedMockTestStages.forEach((stage) => {
    const tasks: Record<string, RestrictedMockTestTaskState> = {};
    stage.tasks.forEach((task) => {
      tasks[task.id] = { items: createEmptyItems(), location: "", notes: "" };
    });
    state[stage.id] = tasks;
  });
  return state;
}

function updateTaskState(
  prev: RestrictedMockTestStagesState,
  stageId: RestrictedMockTestStageId,
  taskId: RestrictedMockTestTaskId,
  updater: (task: RestrictedMockTestTaskState) => RestrictedMockTestTaskState,
): RestrictedMockTestStagesState {
  const stage = prev[stageId];
  const task: RestrictedMockTestTaskState = stage[taskId] || {
    items: createEmptyItems(),
    location: "",
    notes: "",
  };
  const updatedTask = updater(task);

  return {
    ...prev,
    [stageId]: {
      ...stage,
      [taskId]: updatedTask,
    },
  };
}

function taskFaultCount(task: RestrictedMockTestTaskState) {
  let count = 0;
  restrictedMockTestTaskItems.forEach((item) => {
    if (task.items[item.id] === "fault") count += 1;
  });
  return count;
}

export function RestrictedMockTestScreen({ navigation, route }: Props) {
  const { profile, userId } = useCurrentUser();
  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const studentsQuery = useStudentsQuery({ archived: false });
  const createAssessment = useCreateAssessmentMutation();

  const [stage, setStage] = useState<Stage>("details");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(() => !route.params?.studentId);

  const [stage2Enabled, setStage2Enabled] = useState(false);
  const [stagesState, setStagesState] = useState<RestrictedMockTestStagesState>(() =>
    createEmptyStagesState(),
  );
  const [critical, setCritical] = useState<RestrictedMockTestErrorCounts>(() =>
    createErrorCounts(restrictedMockTestCriticalErrors),
  );
  const [immediate, setImmediate] = useState<RestrictedMockTestErrorCounts>(() =>
    createErrorCounts(restrictedMockTestImmediateErrors),
  );
  const [expandedTaskKey, setExpandedTaskKey] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Record<RestrictedMockTestStageId, boolean>>({
    stage1: true,
    stage2: false,
  });
  const [draftResolvedStudentId, setDraftResolvedStudentId] = useState<string | null>(null);

  const organizationName = organizationQuery.data?.name ?? "Driving School";

  const form = useForm<RestrictedMockTestFormValues>({
    resolver: zodResolver(restrictedMockTestFormSchema),
    defaultValues: {
      studentId: "",
      date: dayjs().format("DD/MM/YYYY"),
      time: "",
      vehicleInfo: "",
      routeInfo: "",
      preDriveNotes: "",
      criticalNotes: "",
      immediateNotes: "",
    },
  });

  const selectedStudent = useMemo(() => {
    const students = studentsQuery.data ?? [];
    if (route.params?.studentId) {
      return students.find((s) => s.id === route.params?.studentId) ?? null;
    }
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [route.params?.studentId, selectedStudentId, studentsQuery.data]);

  useEffect(() => {
    if (!route.params?.studentId) return;
    setSelectedStudentId(route.params.studentId);
    form.setValue("studentId", route.params.studentId, { shouldValidate: true });
    setShowStudentPicker(false);
  }, [form, route.params?.studentId]);

  const studentOptions = useMemo(() => {
    const students = studentsQuery.data ?? [];
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return students;
    return students.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      return fullName.includes(needle) || email.includes(needle) || phone.includes(needle);
    });
  }, [studentSearch, studentsQuery.data]);

  const summary = useMemo(() => {
    return calculateRestrictedMockTestSummary({ stagesState, critical, immediate });
  }, [critical, immediate, stagesState]);

  const saving = createAssessment.isPending;

  const draftHydratedRef = useRef<string | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function maybeHydrateDraft(studentId: string) {
    if (draftHydratedRef.current === studentId) return;
    draftHydratedRef.current = studentId;
    setDraftResolvedStudentId(null);

    const key = draftKey(userId, studentId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      setDraftResolvedStudentId(studentId);
      return;
    }

    let parsed: RestrictedMockTestStoredData | null = null;
    try {
      const json = JSON.parse(raw);
      const result = restrictedMockTestStoredDataSchema.safeParse(json);
      parsed = result.success ? result.data : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      setDraftResolvedStudentId(studentId);
      return;
    }

    Alert.alert(
      "Resume draft?",
      "A saved draft exists for this student on this device.",
      [
        {
          text: "Start new",
          style: "destructive",
          onPress: () => {
            void AsyncStorage.removeItem(key);
            setStage2Enabled(false);
            setStagesState(createEmptyStagesState());
            setCritical(createErrorCounts(restrictedMockTestCriticalErrors));
            setImmediate(createErrorCounts(restrictedMockTestImmediateErrors));
            setExpandedTaskKey(null);
            form.reset({
              studentId,
              date: dayjs().format("DD/MM/YYYY"),
              time: "",
              vehicleInfo: "",
              routeInfo: "",
              preDriveNotes: "",
              criticalNotes: "",
              immediateNotes: "",
            });
            setDraftResolvedStudentId(studentId);
          },
        },
        {
          text: "Resume",
          onPress: () => {
            form.reset({
              studentId,
              date: parsed?.date ?? form.getValues("date"),
              time: parsed?.time ?? "",
              vehicleInfo: parsed?.vehicleInfo ?? "",
              routeInfo: parsed?.routeInfo ?? "",
              preDriveNotes: parsed?.preDriveNotes ?? "",
              criticalNotes: parsed?.criticalNotes ?? "",
              immediateNotes: parsed?.immediateNotes ?? "",
            });
            setStage2Enabled(Boolean(parsed?.stage2Enabled));
            setStagesState(parsed?.stagesState ?? createEmptyStagesState());
            setCritical(parsed?.critical ?? createErrorCounts(restrictedMockTestCriticalErrors));
            setImmediate(parsed?.immediate ?? createErrorCounts(restrictedMockTestImmediateErrors));
            setDraftResolvedStudentId(studentId);
          },
        },
      ],
    );
  }

  useEffect(() => {
    if (stage !== "test") return;
    if (!selectedStudent) return;
    void maybeHydrateDraft(selectedStudent.id);
  }, [selectedStudent, stage]);

  useEffect(() => {
    if (stage !== "test") return;
    if (!selectedStudent) return;
    if (draftResolvedStudentId !== selectedStudent.id) return;

    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = setTimeout(() => {
      const values = form.getValues();
      const candidateName = `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim();

      const data: RestrictedMockTestStoredData = {
        ...values,
        candidateName,
        instructor: getProfileFullName(profile),
        stage2Enabled,
        stagesState,
        critical,
        immediate,
        savedByUserId: userId,
        summary,
        version: DRAFT_VERSION,
      };

      void AsyncStorage.setItem(draftKey(userId, selectedStudent.id), JSON.stringify(data));
    }, 500);

    return () => {
      if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);
    };
  }, [
    critical,
    form,
    immediate,
    getProfileFullName(profile),
    selectedStudent,
    stage,
    stage2Enabled,
    stagesState,
    draftResolvedStudentId,
    summary,
    userId,
  ]);

  async function submitAndGeneratePdf(values: RestrictedMockTestFormValues) {
    if (!selectedStudent) {
      Alert.alert("Select a student", "Please select a student first.");
      return;
    }

    try {
      const assessmentDateISO = parseDateInputToISODate(values.date);
      if (!assessmentDateISO) {
        Alert.alert("Check the form", "Use DD/MM/YYYY for the assessment date.");
        return;
      }

      const candidateName = `${selectedStudent.first_name} ${selectedStudent.last_name}`.trim();
      const storedData: RestrictedMockTestStoredData = {
        ...values,
        candidateName,
        instructor: getProfileFullName(profile),
        stage2Enabled,
        stagesState,
        critical,
        immediate,
        savedByUserId: userId,
        summary,
        version: DRAFT_VERSION,
      };

      const validated = restrictedMockTestStoredDataSchema.safeParse(storedData);
      if (!validated.success) {
        Alert.alert("Check the form", "Some required fields are missing.");
        return;
      }

      const assessment = await createAssessment.mutateAsync({
        organization_id: profile.organization_id,
        student_id: selectedStudent.id,
        instructor_id: selectedStudent.assigned_instructor_id,
        assessment_type: "second_assessment",
        assessment_date: assessmentDateISO,
        total_score: null,
        form_data: validated.data,
      });

      try {
        const fileName = `Mock Test Restricted ${selectedStudent.first_name} ${selectedStudent.last_name} ${dayjs(assessmentDateISO).format("DD-MM-YY")}`;
        const androidDirectoryUri =
          Platform.OS === "android" ? await ensureAndroidDownloadsDirectoryUri() : undefined;
        const saved = await exportRestrictedMockTestPdf({
          assessmentId: assessment.id,
          organizationName,
          fileName,
          androidDirectoryUri: androidDirectoryUri ?? undefined,
          values: validated.data,
        });

        await notifyPdfSaved({
          fileName,
          uri: saved.uri,
          savedTo: saved.savedTo === "downloads" ? "Downloads" : "App storage",
        });

        await AsyncStorage.removeItem(draftKey(userId, selectedStudent.id));

        Alert.alert(
          "Submitted",
          saved.savedTo === "downloads"
            ? "Assessment saved and PDF saved to Downloads."
            : "Assessment saved and PDF saved inside the app.",
          [
            {
              text: "Open",
              onPress: () => {
                void openPdfUri(saved.uri);
                navigation.goBack();
              },
            },
            { text: "Done", onPress: () => navigation.goBack() },
          ],
        );
      } catch (exportError) {
        Alert.alert(
          "Saved, but couldn't export PDF",
          `Assessment saved, but PDF export failed: ${toErrorMessage(exportError)}`,
        );
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Couldn't submit assessment", toErrorMessage(error));
    }
  }

  function toggleErrorCount(type: "critical" | "immediate", label: string, delta: number) {
    const updater = (prev: RestrictedMockTestErrorCounts) => {
      const next = Math.max(0, (prev[label] ?? 0) + delta);
      return { ...prev, [label]: next };
    };
    if (type === "critical") setCritical(updater);
    else setImmediate(updater);
  }

  const header = (
    <View>
      <AppText variant="title">Mock Test – Restricted Licence</AppText>
      <AppText className="mt-2" variant="body">
        Restricted Licence – tablet-friendly mock test based on NZ restricted test tasks.
      </AppText>
    </View>
  );

  const studentCard = (
    <AppCard className="gap-4">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">Student</AppText>
        {selectedStudent ? (
          <AppText variant="heading" className="text-right">
            {selectedStudent.first_name} {selectedStudent.last_name}
          </AppText>
        ) : null}
      </View>

      {studentsQuery.isPending ? (
        <View className={cn("items-center justify-center py-4", theme.text.base)}>
          <ActivityIndicator />
          <AppText className="mt-3 text-center" variant="body">
            Loading students...
          </AppText>
        </View>
      ) : studentsQuery.isError ? (
        <AppStack gap="sm">
          <AppText variant="body">{toErrorMessage(studentsQuery.error)}</AppText>
          <AppButton
            width="auto"
            label="Retry"
            variant="secondary"
            onPress={() => studentsQuery.refetch()}
          />
        </AppStack>
      ) : (
        <>
          {form.formState.errors.studentId?.message ? (
            <AppText variant="error">{form.formState.errors.studentId.message}</AppText>
          ) : null}

          {selectedStudent && stage === "details" ? (
            <AppButton
              width="auto"
              variant="ghost"
              label={showStudentPicker ? "Hide student list" : "Change student"}
              onPress={() => setShowStudentPicker((s) => !s)}
            />
          ) : null}

          {stage === "details" && (showStudentPicker || !selectedStudent) ? (
            <>
              <AppInput
                label="Search"
                autoCapitalize="none"
                value={studentSearch}
                onChangeText={setStudentSearch}
              />

              {studentOptions.length === 0 ? (
                <AppText variant="caption">No students match this search.</AppText>
              ) : (
                <AppStack gap="sm">
                  {studentOptions.slice(0, 30).map((student) => (
                    <AppButton
                      key={student.id}
                      variant={selectedStudentId === student.id ? "primary" : "secondary"}
                      label={`${student.first_name} ${student.last_name}`}
                      onPress={() => {
                        setSelectedStudentId(student.id);
                        setShowStudentPicker(false);
                        setStudentSearch("");
                        form.setValue("studentId", student.id, { shouldValidate: true });
                      }}
                    />
                  ))}
                </AppStack>
              )}

              {studentOptions.length > 30 ? (
                <AppText variant="caption">Refine search to see more results.</AppText>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </AppCard>
  );

  const summaryCard =
    stage === "test" ? (
      <AppCard className="gap-3">
        <AppText variant="heading">Session overview</AppText>
        <AppText variant="caption">
          Stage 2 is optional: enable it only after Stage 1 is safe enough to continue.
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Stage 1 faults: {summary.stage1Faults}</AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Stage 2 faults: {summary.stage2Faults}</AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Critical: {summary.criticalTotal}</AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Immediate fail: {summary.immediateTotal}</AppText>
          </View>
        </View>
        <AppText variant={summary.resultTone === "danger" ? "error" : "body"}>{summary.resultText}</AppText>
      </AppCard>
    ) : null;

  const preDriveCard =
    stage === "details" ? (
      <AppCard className="gap-4">
        <AppText variant="heading">Pre-drive checks</AppText>
        <AppText variant="caption">
          Licence, WoF/CoF, L plates, registration, RUC (diesel), fuel, tyres, lights, horn, wipers,
          seatbelts, mirrors, handbrake, demisters.
        </AppText>

        <Controller
          control={form.control}
          name="date"
          render={({ field, fieldState }) => (
            <AppDateInput
              label="Date of mock test"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="time"
          render={({ field }) => (
            <AppTimeInput
              label="Time (optional)"
              value={field.value ?? ""}
              onChangeText={(next) => field.onChange(next)}
            />
          )}
        />

        <Controller
          control={form.control}
          name="vehicleInfo"
          render={({ field }) => (
            <AppInput label="Vehicle (plate / model)" value={field.value ?? ""} onChangeText={field.onChange} />
          )}
        />

        <Controller
          control={form.control}
          name="routeInfo"
          render={({ field }) => (
            <AppInput label="Route / area" value={field.value ?? ""} onChangeText={field.onChange} />
          )}
        />

        <Controller
          control={form.control}
          name="preDriveNotes"
          render={({ field }) => (
            <AppInput
              label="Notes (pre-drive issues / coaching)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              inputClassName="h-28 py-3"
            />
          )}
        />
      </AppCard>
    ) : null;

  function renderStageTasks(stageId: RestrictedMockTestStageId) {
    const stageDef = restrictedMockTestStages.find((s) => s.id === stageId);
    if (!stageDef) return null;

    const stageKey = stageDef.id;
    const expanded = expandedStages[stageKey];
    const stageFaults = stageKey === "stage1" ? summary.stage1Faults : summary.stage2Faults;
    const rightText =
      stageKey === "stage2" && !stage2Enabled
        ? "Locked"
        : stageFaults > 0
          ? `${stageFaults} fault${stageFaults === 1 ? "" : "s"}`
          : undefined;

    return (
      <AppCollapsibleCard
        title={stageDef.name}
        subtitle={stageDef.badge}
        rightText={rightText}
        expanded={expanded}
        onToggle={() => setExpandedStages((prev) => ({ ...prev, [stageKey]: !prev[stageKey] }))}
      >
        <AppStack gap="md">
          <AppText variant="caption">{stageDef.note}</AppText>

          {stageKey === "stage2" && !stage2Enabled ? (
            <AppStack gap="sm">
              <AppText variant="body">
                Stage 2 is locked. Enable it only after Stage 1 performance is safe.
              </AppText>
              <AppButton
                width="auto"
                label="Enable Stage 2"
                onPress={() => {
                  setStage2Enabled(true);
                  setExpandedStages((prev) => ({ ...prev, stage2: true }));
                }}
              />
            </AppStack>
          ) : (
            <AppStack gap="md">
              {stageDef.tasks.map((taskDef) => {
                const taskState = stagesState[stageKey]?.[taskDef.id] ?? {
                  items: createEmptyItems(),
                  location: "",
                  notes: "",
                };
                const faults = taskFaultCount(taskState);
                const cardKey = `${stageKey}:${taskDef.id}`;
                const taskExpanded = expandedTaskKey === cardKey;

                return (
                  <AppCollapsibleCard
                    key={taskDef.id}
                    title={taskDef.name}
                    subtitle={`Typical speed zone: ${taskDef.speed} km/h`}
                    rightText={faults > 0 ? `${faults} fault${faults === 1 ? "" : "s"}` : undefined}
                    expanded={taskExpanded}
                    onToggle={() => setExpandedTaskKey((prev) => (prev === cardKey ? null : cardKey))}
                  >
                    <AppStack gap="md">
                      <AppInput
                        label="Location / reference (street, landmark, direction)"
                        value={taskState.location}
                        onChangeText={(next) =>
                          setStagesState((prev) =>
                            updateTaskState(prev, stageKey, taskDef.id, (task) => ({
                              ...task,
                              location: next,
                            })),
                          )
                        }
                      />

                      <AppStack gap="sm">
                        {restrictedMockTestTaskItems.map((item) => {
                          const current = taskState.items[item.id] as FaultValue;
                          return (
                            <View key={item.id} className="flex-row items-center justify-between gap-3">
                              <AppText className="flex-1" variant="body">
                                {item.label}
                              </AppText>
                              <AppSegmentedControl<FaultValue>
                                className="w-40"
                                value={current}
                                options={[
                                  { value: "", label: "OK / n/a" },
                                  { value: "fault", label: "Fault" },
                                ]}
                                onChange={(next) =>
                                  setStagesState((prev) =>
                                    updateTaskState(prev, stageKey, taskDef.id, (task) => ({
                                      ...task,
                                      items: { ...task.items, [item.id]: next },
                                    })),
                                  )
                                }
                              />
                            </View>
                          );
                        })}
                      </AppStack>

                      <AppInput
                        label="Task notes (coaching points, patterns)"
                        value={taskState.notes}
                        onChangeText={(next) =>
                          setStagesState((prev) =>
                            updateTaskState(prev, stageKey, taskDef.id, (task) => ({
                              ...task,
                              notes: next,
                            })),
                          )
                        }
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        inputClassName="h-28 py-3"
                      />
                    </AppStack>
                  </AppCollapsibleCard>
                );
              })}
            </AppStack>
          )}
        </AppStack>
      </AppCollapsibleCard>
    );
  }

  const errorsCard = (
    <>
      <AppCard className="gap-3">
        <AppText variant="heading">Critical errors</AppText>
        <AppText variant="caption">Recorded any time during route.</AppText>
        <AppStack gap="sm">
          {restrictedMockTestCriticalErrors.map((label) => (
            <View key={label} className="flex-row items-center justify-between gap-2">
              <AppText className="flex-1" variant="body">
                {label}
              </AppText>
              <View className="flex-row items-center gap-2">
                <AppButton
                  width="auto"
                  variant="secondary"
                  className="h-10 px-3"
                  label="-"
                  onPress={() => toggleErrorCount("critical", label, -1)}
                />
                <View className="min-w-10 items-center rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
                  <AppText variant="caption">{String(critical[label] ?? 0)}</AppText>
                </View>
                <AppButton
                  width="auto"
                  className="h-10 px-3"
                  label="+"
                  onPress={() => toggleErrorCount("critical", label, 1)}
                />
              </View>
            </View>
          ))}
        </AppStack>

        <Controller
          control={form.control}
          name="criticalNotes"
          render={({ field }) => (
            <AppInput
              label="Critical error notes (what happened, where)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              inputClassName="h-28 py-3"
            />
          )}
        />
      </AppCard>

      <AppCard className="gap-3">
        <AppText variant="heading">Immediate failure errors</AppText>
        <AppText variant="caption">Any one = fail.</AppText>
        <AppStack gap="sm">
          {restrictedMockTestImmediateErrors.map((label) => (
            <View key={label} className="flex-row items-center justify-between gap-2">
              <AppText className="flex-1" variant="body">
                {label}
              </AppText>
              <View className="flex-row items-center gap-2">
                <AppButton
                  width="auto"
                  variant="secondary"
                  className="h-10 px-3"
                  label="-"
                  onPress={() => toggleErrorCount("immediate", label, -1)}
                />
                <View className="min-w-10 items-center rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
                  <AppText variant="caption">{String(immediate[label] ?? 0)}</AppText>
                </View>
                <AppButton
                  width="auto"
                  variant="danger"
                  className="h-10 px-3"
                  label="+"
                  onPress={() => toggleErrorCount("immediate", label, 1)}
                />
              </View>
            </View>
          ))}
        </AppStack>

        <Controller
          control={form.control}
          name="immediateNotes"
          render={({ field }) => (
            <AppInput
              label="Immediate failure notes"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              inputClassName="h-28 py-3"
            />
          )}
        />
      </AppCard>
    </>
  );

  const stageActions =
    stage === "details" ? (
      <AppStack gap="sm">
        <AppButton
          label="Review and start"
          disabled={!selectedStudent}
          onPress={() => {
            if (!selectedStudent) {
              Alert.alert("Select a student", "Please select a student first.");
              return;
            }
            setStage("confirm");
          }}
        />
        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </AppStack>
    ) : stage === "confirm" ? (
      <AppCard className="gap-4">
        <AppText variant="heading">Confirm details</AppText>
        <AppText variant="body">
          Candidate: {selectedStudent ? `${selectedStudent.first_name} ${selectedStudent.last_name}` : "—"}
        </AppText>
        <AppText variant="body">Date: {form.getValues("date") || "—"}</AppText>
        <AppText variant="body">Time: {form.getValues("time") || "—"}</AppText>
        <AppText variant="body">Vehicle: {form.getValues("vehicleInfo") || "—"}</AppText>
        <AppText variant="body">Route: {form.getValues("routeInfo") || "—"}</AppText>
        <AppText variant="caption">The test auto-saves on this device while you’re in the test screen.</AppText>
        <AppStack gap="sm">
          <AppButton width="auto" variant="secondary" label="Back" onPress={() => setStage("details")} />
          <AppButton width="auto" label="Start test" onPress={() => setStage("test")} />
          <AppButton width="auto" variant="ghost" label="Cancel" onPress={() => navigation.goBack()} />
        </AppStack>
      </AppCard>
    ) : (
      <>
        {createAssessment.isError ? (
          <AppText variant="error">{toErrorMessage(createAssessment.error)}</AppText>
        ) : null}
        <AppButton
          label={saving ? "Submitting..." : "Submit and generate PDF"}
          disabled={saving}
          onPress={form.handleSubmit((values) => {
            Alert.alert(
              "Submit mock test?",
              "This will save the assessment and generate a PDF for export.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: () => void submitAndGeneratePdf(values) },
              ],
            );
          })}
        />
        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </>
    );

  return (
    <Screen scroll>
      <AppStack gap="lg">
        {header}
        {studentCard}

        {stage === "details" ? preDriveCard : null}
        {stage === "confirm" ? stageActions : null}

        {stage === "test" ? (
          <>
            {summaryCard}

            {renderStageTasks("stage1")}

            {renderStageTasks("stage2")}

            {errorsCard}
            {stageActions}
          </>
        ) : null}

        {stage === "details" ? stageActions : null}
      </AppStack>
    </Screen>
  );
}
