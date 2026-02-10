import AsyncStorage from "@react-native-async-storage/async-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { Save } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { Controller, useForm } from "react-hook-form";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppCollapsibleCard } from "../../components/AppCollapsibleCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
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
import { useOrganizationQuery, useOrganizationSettingsQuery } from "../../features/organization/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";
import { openPdfUri } from "../../utils/open-pdf";
import { AssessmentStudentDropdown } from "../components/AssessmentStudentDropdown";
import { useNavigationLayout } from "../useNavigationLayout";
import { useAssessmentLeaveGuard } from "../useAssessmentLeaveGuard";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";
import type { MainDrawerParamList } from "../MainDrawerNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "RestrictedMockTest">;

type Stage = "details" | "confirm" | "test";
type FaultValue = "" | "fault";
type ActiveTask = { stageId: RestrictedMockTestStageId; taskId: RestrictedMockTestTaskId };
type ExclusiveSection = RestrictedMockTestStageId | "critical" | "immediate" | null;

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
      tasks[task.id] = { items: createEmptyItems(), location: "", notes: "", repetitions: 0 };
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
    repetitions: 0,
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
  const { isCompact } = useNavigationLayout();
  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const organizationSettingsQuery = useOrganizationSettingsQuery(profile.organization_id);
  const studentsQuery = useStudentsQuery({ archived: false });
  const createAssessment = useCreateAssessmentMutation();

  const [stage, setStage] = useState<Stage>("details");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [startTestModalVisible, setStartTestModalVisible] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollOffsetYRef = useRef(0);
  const { width, height } = useWindowDimensions();
  const minDimension = Math.min(width, height);
  const keyboardAwareEnabled = minDimension >= 600 && height > width;

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
  const [expandedStages, setExpandedStages] = useState<Record<RestrictedMockTestStageId, boolean>>({
    stage1: false,
    stage2: false,
  });
  const [criticalErrorsExpanded, setCriticalErrorsExpanded] = useState(false);
  const [immediateErrorsExpanded, setImmediateErrorsExpanded] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [activeTask, setActiveTask] = useState<ActiveTask | null>(null);
  const [taskModalItems, setTaskModalItems] = useState<
    Record<RestrictedMockTestTaskItemId, FaultValue>
  >(() => createEmptyItems());
  const [draftResolvedStudentId, setDraftResolvedStudentId] = useState<string | null>(null);
  const { leaveWithoutPrompt } = useAssessmentLeaveGuard({
    navigation,
    enabled: stage === "test",
  });
  const drawerNavigation =
    navigation.getParent<DrawerNavigationProp<MainDrawerParamList>>();
  const returnToStudentId = route.params?.returnToStudentId ?? null;

  const organizationName = organizationQuery.data?.name ?? "Driving School";
  const organizationLogoUrl = organizationSettingsQuery.data?.logo_url ?? null;

  function getOpenSection(): ExclusiveSection {
    if (criticalErrorsExpanded) return "critical";
    if (immediateErrorsExpanded) return "immediate";
    if (expandedStages.stage1) return "stage1";
    if (expandedStages.stage2) return "stage2";
    return null;
  }

  function setOpenSection(section: ExclusiveSection) {
    setExpandedStages({ stage1: section === "stage1", stage2: section === "stage2" });
    setCriticalErrorsExpanded(section === "critical");
    setImmediateErrorsExpanded(section === "immediate");
  }

  function toggleSection(section: Exclude<ExclusiveSection, null>) {
    setOpenSection(getOpenSection() === section ? null : section);
  }

  function scrollToTop(animated = false) {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: 0, animated });
    });
  }

  function navigateAfterSubmit() {
    leaveWithoutPrompt(() => {
      resetMockTestToBlank();
      navigation.reset({ index: 0, routes: [{ name: "AssessmentsMain" }] });
      if (returnToStudentId && drawerNavigation) {
        drawerNavigation.navigate("Students", {
          screen: "StudentDetail",
          params: { studentId: returnToStudentId },
        });
      }
    });
  }

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

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      scrollToTop(false);
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    if (!keyboardAwareEnabled) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(showEvent, (event) => {
      const focusedInput = TextInput.State.currentlyFocusedInput?.();
      if (!focusedInput || typeof focusedInput.measureInWindow !== "function") {
        return;
      }

      focusedInput.measureInWindow((_x, y, _w, inputHeight) => {
        const keyboardTop = event.endCoordinates.screenY;
        const inputBottom = y + inputHeight;
        const isInBottomHalf = y >= height / 2;
        const overlap = inputBottom - keyboardTop;

        if (!isInBottomHalf || overlap <= 0) return;

        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollOffsetYRef.current + overlap + 24),
          animated: true,
        });
      });
    });

    return () => {
      subscription.remove();
    };
  }, [height, keyboardAwareEnabled]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  }

  function resetMockTestForStudent(studentId: string) {
    setStage("details");
    setStartTestModalVisible(false);
    setStage2Enabled(false);
    setStagesState(createEmptyStagesState());
    setCritical(createErrorCounts(restrictedMockTestCriticalErrors));
    setImmediate(createErrorCounts(restrictedMockTestImmediateErrors));
    setOpenSection(null);
    setTaskModalVisible(false);
    setActiveTask(null);
    setDraftResolvedStudentId(null);
    setSelectedStudentId(studentId);
    scrollToTop(false);

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
  }

  function resetMockTestToBlank() {
    setStage("details");
    setStartTestModalVisible(false);
    setStage2Enabled(false);
    setStagesState(createEmptyStagesState());
    setCritical(createErrorCounts(restrictedMockTestCriticalErrors));
    setImmediate(createErrorCounts(restrictedMockTestImmediateErrors));
    setOpenSection(null);
    setTaskModalVisible(false);
    setActiveTask(null);
    setDraftResolvedStudentId(null);
    setSelectedStudentId(null);
    scrollToTop(false);

    form.reset({
      studentId: "",
      date: dayjs().format("DD/MM/YYYY"),
      time: "",
      vehicleInfo: "",
      routeInfo: "",
      preDriveNotes: "",
      criticalNotes: "",
      immediateNotes: "",
    });
  }

  const selectedStudent = useMemo(() => {
    const students = studentsQuery.data ?? [];
    if (!selectedStudentId) return null;
    return students.find((s) => s.id === selectedStudentId) ?? null;
  }, [selectedStudentId, studentsQuery.data]);

  useEffect(() => {
    if (!selectedStudent) {
      setStartTestModalVisible(false);
    }
  }, [selectedStudent]);

  useEffect(() => {
    const initialStudentId = route.params?.studentId ?? null;
    if (!initialStudentId) return;
    if (selectedStudentId === initialStudentId) return;
    resetMockTestForStudent(initialStudentId);
  }, [form, route.params?.studentId, selectedStudentId]);

  useEffect(() => {
    setStage("details");
    scrollToTop(false);
  }, [selectedStudentId]);

  const summary = useMemo(() => {
    return calculateRestrictedMockTestSummary({ stagesState, critical, immediate });
  }, [critical, immediate, stagesState]);

  const stage1Repetitions = useMemo(() => {
    return Object.values(stagesState.stage1 ?? {}).reduce((sum, task) => sum + (task.repetitions ?? 0), 0);
  }, [stagesState.stage1]);

  const stage2Repetitions = useMemo(() => {
    return Object.values(stagesState.stage2 ?? {}).reduce((sum, task) => sum + (task.repetitions ?? 0), 0);
  }, [stagesState.stage2]);

  const activeTaskDefinition = useMemo(() => {
    if (!activeTask) return null;
    const stageDef = restrictedMockTestStages.find((s) => s.id === activeTask.stageId) ?? null;
    const taskDef = stageDef?.tasks.find((t) => t.id === activeTask.taskId) ?? null;
    return { stageDef, taskDef };
  }, [activeTask]);

  const activeTaskState = useMemo(() => {
    if (!activeTask) return null;
    return (
      stagesState[activeTask.stageId]?.[activeTask.taskId] ?? {
        items: createEmptyItems(),
        location: "",
        notes: "",
        repetitions: 0,
      }
    );
  }, [activeTask, stagesState]);

  const activeTaskDef = activeTaskDefinition?.taskDef ?? null;

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
            setOpenSection(null);
            setTaskModalVisible(false);
            setActiveTask(null);
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
            setOpenSection(null);
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

  async function saveAssessment(values: RestrictedMockTestFormValues) {
    const student = selectedStudent;
    if (!student) {
      Alert.alert("Select a student", "Please select a student first.");
      return null;
    }

    const assessmentDateISO = parseDateInputToISODate(values.date);
    if (!assessmentDateISO) {
      Alert.alert("Check the form", "Use DD/MM/YYYY for the assessment date.");
      return null;
    }

    const candidateName = `${student.first_name} ${student.last_name}`.trim();
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
      return null;
    }

    try {
      const assessment = await createAssessment.mutateAsync({
        organization_id: profile.organization_id,
        student_id: student.id,
        instructor_id: student.assigned_instructor_id,
        assessment_type: "second_assessment",
        assessment_date: assessmentDateISO,
        total_score: null,
        form_data: validated.data,
      });

      await AsyncStorage.removeItem(draftKey(userId, student.id));

      return { assessment, assessmentDateISO, values: validated.data, student };
    } catch (error) {
      Alert.alert("Couldn't submit assessment", toErrorMessage(error));
      return null;
    }
  }

  async function submitOnly(values: RestrictedMockTestFormValues) {
    const result = await saveAssessment(values);
    if (!result) return;

    Alert.alert("Submitted", "Assessment saved.", [
      { text: "Done", onPress: navigateAfterSubmit },
    ]);
  }

  async function submitAndGeneratePdf(values: RestrictedMockTestFormValues) {
    const result = await saveAssessment(values);
    if (!result) return;

    try {
      const fileName = `Mock Test Restricted ${result.student.first_name} ${result.student.last_name} ${dayjs(result.assessmentDateISO).format("DD-MM-YY")}`;
      const androidDirectoryUri =
        Platform.OS === "android" ? await ensureAndroidDownloadsDirectoryUri() : undefined;
      const saved = await exportRestrictedMockTestPdf({
        assessmentId: result.assessment.id,
        organizationName,
        organizationLogoUrl,
        fileName,
        androidDirectoryUri: androidDirectoryUri ?? undefined,
        values: result.values,
      });

      await notifyPdfSaved({
        fileName,
        uri: saved.uri,
        savedTo: saved.savedTo === "downloads" ? "Downloads" : "App storage",
      });

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
              navigateAfterSubmit();
            },
          },
          { text: "Done", onPress: navigateAfterSubmit },
        ],
      );
    } catch (exportError) {
      Alert.alert(
        "Saved, but couldn't export PDF",
        `Assessment saved, but PDF export failed: ${toErrorMessage(exportError)}`,
        [{ text: "Done", onPress: navigateAfterSubmit }],
      );
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

  function openTaskModal(stageId: RestrictedMockTestStageId, taskId: RestrictedMockTestTaskId) {
    setActiveTask({ stageId, taskId });
    setTaskModalItems(createEmptyItems());
    setTaskModalVisible(true);
  }

  function closeTaskModal() {
    setTaskModalVisible(false);
    setActiveTask(null);
    setTaskModalItems(createEmptyItems());
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
      <View className="flex-row items-start justify-between gap-3">
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

          {stage === "details" ? (
            <AssessmentStudentDropdown
              students={studentsQuery.data ?? []}
              selectedStudentId={selectedStudentId}
              currentUserId={profile.id}
              onSelectStudent={(student) => {
                resetMockTestForStudent(student.id);
              }}
            />
          ) : null}
        </>
      )}
    </AppCard>
  );

  const summaryCard =
    stage === "test" ? (
      <AppCard className="gap-3">
        {selectedStudent ? (
          <AppText variant="heading">
            {selectedStudent.first_name} {selectedStudent.last_name}
          </AppText>
        ) : null}
        <AppText className={cn(selectedStudent && "mt-2")} variant="heading">
          Session overview
        </AppText>
        <AppText variant="caption">
          Stage 2 is optional: enable it only after Stage 1 is safe enough to continue.
        </AppText>
        <View className="flex-row flex-wrap gap-2">
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">
              Stage 1 faults:{summary.stage1Faults} reps:{stage1Repetitions}
            </AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">
              Stage 2 faults:{summary.stage2Faults} reps:{stage2Repetitions}
            </AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Critical: {summary.criticalTotal}</AppText>
          </View>
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Immediate fail: {summary.immediateTotal}</AppText>
          </View>
        </View>
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

        <View className={cn("flex-row gap-4", isCompact && "flex-col")}>
          <View className={cn(!isCompact && "flex-1")}>
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
          </View>

          <View className={cn(!isCompact && "flex-1")}>
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
          </View>
        </View>

        <View className={cn("flex-row gap-4", isCompact && "flex-col")}>
          <View className={cn(!isCompact && "flex-1")}>
            <Controller
              control={form.control}
              name="vehicleInfo"
              render={({ field }) => (
                <AppInput
                  label="Vehicle (plate / model)"
                  value={field.value ?? ""}
                  onChangeText={field.onChange}
                />
              )}
            />
          </View>

          <View className={cn(!isCompact && "flex-1")}>
            <Controller
              control={form.control}
              name="routeInfo"
              render={({ field }) => (
                <AppInput label="Route / area" value={field.value ?? ""} onChangeText={field.onChange} />
              )}
            />
          </View>
        </View>

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
    const stageRepetitions = Object.values(stagesState[stageKey] ?? {}).reduce((sum, task) => {
      return sum + (task.repetitions ?? 0);
    }, 0);
    const rightText =
      stageKey === "stage2" && !stage2Enabled ? "Locked" : undefined;

    return (
      <AppCollapsibleCard
        title={stageDef.name}
        subtitleNode={
          <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <AppText className="text-xl !text-blue-600 dark:!text-blue-400" variant="body">
              Total Repetitions: {stageRepetitions}
            </AppText>
            <AppText className="text-xl !text-red-600 dark:!text-red-400" variant="body">
              Total Faults: {stageFaults}
            </AppText>
          </View>
        }
        showLabelClassName="!text-blue-600 dark:!text-blue-400"
        hideLabelClassName="!text-red-600 dark:!text-red-400"
        rightText={rightText}
        expanded={expanded}
        className={cn(expanded && "!border-2 !border-blue-600 dark:!border-blue-400")}
        onToggle={() => toggleSection(stageKey)}
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
                  setOpenSection("stage2");
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
                  repetitions: 0,
                };
                const faults = taskFaultCount(taskState);
                const repetitions = taskState.repetitions ?? 0;

                return (
                  <Pressable
                    key={taskDef.id}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                    className={cn(
                      theme.card.base,
                      "gap-2",
                      repetitions > 0 && "!border-orange-500 dark:!border-orange-400",
                    )}
                    onPress={() => openTaskModal(stageKey, taskDef.id)}
                  >
                    <View className="gap-2">
                      <AppText variant="heading">{taskDef.name}</AppText>
                      {repetitions > 0 ? (
                        <View className="flex-row flex-wrap items-center gap-x-4 gap-y-1">
                          <AppText className="text-xl !text-blue-600 dark:!text-blue-400" variant="body">
                            Repetitions: {repetitions}
                          </AppText>
                          <AppText className="text-xl !text-red-600 dark:!text-red-400" variant="body">
                            Faults: {faults}
                          </AppText>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
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
      <AppCollapsibleCard
        title="Critical errors"
        subtitle="Recorded any time during route."
        showLabelClassName="!text-blue-600 dark:!text-blue-400"
        hideLabelClassName="!text-red-600 dark:!text-red-400"
        rightText={summary.criticalTotal > 0 ? `${summary.criticalTotal} recorded` : undefined}
        expanded={criticalErrorsExpanded}
        className={cn(criticalErrorsExpanded && "!border-2 !border-blue-600 dark:!border-blue-400")}
        onToggle={() => toggleSection("critical")}
      >
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
        </AppStack>
      </AppCollapsibleCard>

      <AppCollapsibleCard
        title="Immediate failure errors"
        subtitle="Any one = fail."
        showLabelClassName="!text-blue-600 dark:!text-blue-400"
        hideLabelClassName="!text-red-600 dark:!text-red-400"
        rightText={summary.immediateTotal > 0 ? `${summary.immediateTotal} recorded` : undefined}
        expanded={immediateErrorsExpanded}
        className={cn(immediateErrorsExpanded && "!border-2 !border-blue-600 dark:!border-blue-400")}
        onToggle={() => toggleSection("immediate")}
      >
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
        </AppStack>
      </AppCollapsibleCard>
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
            setStartTestModalVisible(true);
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
          <AppButton
            width="auto"
            label="Start test"
            onPress={() => {
              setStage("test");
              scrollToTop(false);
            }}
          />
          <AppButton width="auto" variant="ghost" label="Cancel" onPress={() => navigation.goBack()} />
        </AppStack>
      </AppCard>
    ) : (
      <>
        {createAssessment.isError ? (
          <AppText variant="error">{toErrorMessage(createAssessment.error)}</AppText>
        ) : null}
        <AppButton
          label={saving ? "Submitting..." : "Submit"}
          disabled={saving}
          onPress={form.handleSubmit((values) => {
            Alert.alert(
              "Submit mock test?",
              "Submit will save the assessment. Submit and Generate PDF will also export a PDF.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: () => void submitOnly(values) },
                {
                  text: "Submit and Generate PDF",
                  onPress: () => void submitAndGeneratePdf(values),
                },
              ],
            );
          })}
        />
        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </>
    );

  return (
    <>
      <Screen>
        <AppStack className="flex-1" gap={isCompact ? "md" : "lg"}>
          <AppStack gap={isCompact ? "md" : "lg"}>
            {header}
            {stage !== "test" ? studentCard : null}
            {summaryCard}
          </AppStack>

          <ScrollView
            ref={scrollRef}
            className="flex-1"
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios" && keyboardAwareEnabled}
            contentContainerClassName={cn(theme.screen.scrollContent, isCompact ? "pb-6" : "pb-8")}
            onScroll={keyboardAwareEnabled ? onScroll : undefined}
            scrollEventThrottle={keyboardAwareEnabled ? 16 : undefined}
          >
            <AppStack gap={isCompact ? "md" : "lg"}>
              {stage === "details" ? preDriveCard : null}
              {stage === "confirm" ? stageActions : null}

              {stage === "test" ? (
                <>
                  {renderStageTasks("stage1")}
                  {renderStageTasks("stage2")}
                  {errorsCard}
                  {stageActions}
                </>
              ) : null}

              {stage === "details" ? stageActions : null}
            </AppStack>
          </ScrollView>
        </AppStack>
      </Screen>

      <Modal
        visible={taskModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeTaskModal}
      >
        <Pressable
          className={cn(
            "flex-1 items-center justify-center bg-black/40",
            isCompact ? "px-4 py-6" : "px-6 py-10",
          )}
          onPress={closeTaskModal}
        >
          <Pressable
            className={cn("w-full", isCompact ? "" : "max-w-[720px]")}
            onPress={(event) => event.stopPropagation()}
          >
            <AppCard
              className={cn("gap-3 rounded-none", isCompact ? "p-3" : "p-4")}
              style={{ maxHeight: Math.round(height * (isCompact ? 0.92 : 0.85)) }}
            >
              {activeTask && activeTaskDef && activeTaskState ? (
                <>
                  {(() => {
                    const currentItems = activeTaskState.items as Record<RestrictedMockTestTaskItemId, FaultValue>;
                    const previewFaults = restrictedMockTestTaskItems.reduce((count, item) => {
                      const isFault = currentItems[item.id] === "fault" || taskModalItems[item.id] === "fault";
                      return isFault ? count + 1 : count;
                    }, 0);

                    return (
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <AppText variant="heading">{activeTaskDef.name}</AppText>
                      <View className="mt-2 flex-row flex-wrap items-center gap-x-4 gap-y-1">
                        <AppText className="text-xl !text-blue-600 dark:!text-blue-400" variant="body">
                          Repetitions: {activeTaskState.repetitions ?? 0}
                        </AppText>
                        <AppText className="text-xl !text-red-600 dark:!text-red-400" variant="body">
                          Faults: {previewFaults}
                        </AppText>
                      </View>
                    </View>

                    <View className="items-end gap-2">
                      <AppButton
                        width="auto"
                        variant="primary"
                        className="!bg-green-600 !border-green-600 dark:!bg-green-500 dark:!border-green-500"
                        label="Record Repetition"
                        icon={Save}
                        onPress={() => {
                          const stageId = activeTask.stageId;
                          const taskId = activeTask.taskId;
                          const taskName = activeTaskDef.name;
                          const nextCount = (activeTaskState.repetitions ?? 0) + 1;
                          Alert.alert(
                            "Record repetition?",
                            `Save repetition #${nextCount} for "${taskName}"?`,
                            [
                              { text: "Cancel", style: "cancel" },
                              {
                                text: "Record",
                                onPress: () => {
                                  setStagesState((prev) =>
                                    updateTaskState(prev, stageId, taskId, (task) => {
                                      const nextItems: Record<RestrictedMockTestTaskItemId, FaultValue> = {
                                        ...task.items,
                                      };

                                      restrictedMockTestTaskItems.forEach((item) => {
                                        if (taskModalItems[item.id] === "fault") nextItems[item.id] = "fault";
                                      });

                                      return {
                                        ...task,
                                        repetitions: (task.repetitions ?? 0) + 1,
                                        items: nextItems,
                                      };
                                    }),
                                  );
                                  setTaskModalItems(createEmptyItems());
                                },
                              },
                            ],
                          );
                        }}
                      />
                    </View>
                  </View>
                    );
                  })()}

                  <ScrollView
                    // Ensure the modal shrinks to content when short, but still scrolls when it overflows.
                    style={{
                      maxHeight: Math.round(height * (isCompact ? 0.68 : 0.56)),
                      flexGrow: 0,
                    }}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                    automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
                  >
                    <AppStack gap="md" className={cn(isCompact ? "pt-1" : "pt-2")}>
                      <AppInput
                        label="Location / reference (street, landmark, direction)"
                        value={activeTaskState.location}
                        onChangeText={(next) => {
                          const stageId = activeTask.stageId;
                          const taskId = activeTask.taskId;
                          setStagesState((prev) =>
                            updateTaskState(prev, stageId, taskId, (task) => ({
                              ...task,
                              location: next,
                            })),
                          );
                        }}
                      />

                      <AppStack gap="sm">
                        <AppText variant="caption">
                          Tap a button to mark a Fault (red). Tap again to reset to OK / n/a.
                        </AppText>
                        <View className="flex-row flex-wrap gap-2">
                          {restrictedMockTestTaskItems.map((item) => {
                            const current = taskModalItems[item.id] as FaultValue;
                            const isFault = current === "fault";
                            return (
                              <Pressable
                                key={item.id}
                                accessibilityRole="button"
                                accessibilityState={{ selected: isFault }}
                                className={cn(
                                  "w-[48%] rounded-xl border px-3 py-3",
                                  isFault
                                    ? "border-danger bg-danger dark:border-dangerDark dark:bg-dangerDark"
                                    : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
                                )}
                                onPress={() => {
                                  setTaskModalItems((prev) => ({
                                    ...prev,
                                    [item.id]: isFault ? "" : "fault",
                                  }));
                                }}
                              >
                                <AppText className={cn("text-center", isFault && "text-primaryForeground")} variant="button">
                                  {item.label}
                                </AppText>
                              </Pressable>
                            );
                          })}
                        </View>
                      </AppStack>

                      <AppInput
                        label="Task notes (coaching points, patterns)"
                        value={activeTaskState.notes}
                        onChangeText={(next) => {
                          const stageId = activeTask.stageId;
                          const taskId = activeTask.taskId;
                          setStagesState((prev) =>
                            updateTaskState(prev, stageId, taskId, (task) => ({
                              ...task,
                              notes: next,
                            })),
                          );
                        }}
                        multiline
                        numberOfLines={5}
                        textAlignVertical="top"
                        inputClassName="h-28 py-3"
                      />

                      <AppButton width="auto" variant="secondary" label="Close" onPress={closeTaskModal} />
                    </AppStack>
                  </ScrollView>
                </>
              ) : (
                <AppStack gap="sm">
                  <AppText variant="heading">No task selected</AppText>
                  <AppButton width="auto" variant="secondary" label="Close" onPress={closeTaskModal} />
                </AppStack>
              )}
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={startTestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStartTestModalVisible(false)}
      >
        <Pressable
          className={cn("flex-1 bg-black/40", isCompact ? "px-4 py-6" : "px-6 py-10")}
          onPress={() => setStartTestModalVisible(false)}
        >
          <Pressable
            className="m-auto w-full max-w-md"
            onPress={(event) => event.stopPropagation()}
          >
            <AppCard className="gap-3">
              <AppText variant="heading">Start test?</AppText>
              <AppText variant="body">
                {selectedStudent
                  ? `You are about to start assessing ${selectedStudent.first_name} ${selectedStudent.last_name}.`
                  : "Select a student first."}
              </AppText>
              <AppStack gap="sm">
                <AppButton
                  width="auto"
                  variant="secondary"
                  label="Cancel"
                  onPress={() => setStartTestModalVisible(false)}
                />
                <AppButton
                  width="auto"
                  label="Start"
                  disabled={!selectedStudent}
                  onPress={() => {
                    setStartTestModalVisible(false);
                    setStage("test");
                    scrollToTop(false);
                  }}
                />
              </AppStack>
            </AppCard>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
