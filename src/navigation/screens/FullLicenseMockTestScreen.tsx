import AsyncStorage from "@react-native-async-storage/async-storage";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, View } from "react-native";
import { Controller, useForm } from "react-hook-form";
import { CircleStop, Flag, Pause, Play, RotateCcw, Timer, TriangleAlert } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppCollapsibleCard } from "../../components/AppCollapsibleCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppDivider } from "../../components/AppDivider";
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
  fullLicenseMockTestAssessmentItems,
  fullLicenseMockTestHazardCategories,
  fullLicenseMockTestHazardCategoryLabels,
  fullLicenseMockTestHazardDirections,
  fullLicenseMockTestHazardDirectionLabels,
  fullLicenseMockTestHazardLayout,
  fullLicenseMockTestCriticalErrors,
  fullLicenseMockTestImmediateErrors,
  fullLicenseMockTestTasks,
  type FullLicenseMockTestAssessmentItemId,
  type FullLicenseMockTestHazardCategory,
  type FullLicenseMockTestHazardDirection,
  type FullLicenseMockTestHazardResponse,
  type FullLicenseMockTestMode,
  type FullLicenseMockTestTaskId,
  type FullLicenseMockTestWeather,
} from "../../features/assessments/full-license-mock-test/constants";
import { exportFullLicenseMockTestPdf } from "../../features/assessments/full-license-mock-test/pdf";
import {
  calculateFullLicenseMockTestSummary,
  createFullLicenseMockTestEmptyHazardResponses,
  createFullLicenseMockTestEmptyItems,
  hasFullLicenseMockTestHazardResponse,
  scoreFullLicenseMockTestAttempt,
  type FullLicenseMockTestAttempt,
  type FullLicenseMockTestErrorCounts,
  type FullLicenseMockTestHazardResponses,
} from "../../features/assessments/full-license-mock-test/scoring";
import {
  fullLicenseMockTestFormSchema,
  fullLicenseMockTestStoredDataSchema,
  type FullLicenseMockTestFormValues,
  type FullLicenseMockTestStoredData,
} from "../../features/assessments/full-license-mock-test/schema";
import { notifyPdfSaved } from "../../features/notifications/download-notifications";
import { useOrganizationQuery } from "../../features/organization/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";
import { openPdfUri } from "../../utils/open-pdf";
import { useNavigationLayout } from "../useNavigationLayout";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "FullLicenseMockTest">;

type Stage = "details" | "confirm" | "run" | "summary";
type PFValue = "P" | "F";
type HazardPickerTarget = {
  category: FullLicenseMockTestHazardCategory;
  direction: FullLicenseMockTestHazardDirection;
};

const OFFICIAL_SECONDS = 20 * 60;
const DRILL_SECONDS = 30 * 60;
const DRAFT_VERSION = 1;

function draftKey(userId: string, studentId: string) {
  return `drivingschool.assessments.third_assessment.draft.v${DRAFT_VERSION}:${userId}:${studentId}`;
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function formatMMSS(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function createErrorCounts(errors: readonly string[]) {
  return errors.reduce<Record<string, number>>((acc, label) => {
    acc[label] = 0;
    return acc;
  }, {});
}

function weatherLabel(weather: FullLicenseMockTestWeather) {
  if (weather === "wet") return "Wet";
  if (weather === "low_visibility") return "Low visibility";
  return "Dry";
}

function getTask(taskId: FullLicenseMockTestTaskId) {
  return fullLicenseMockTestTasks.find((t) => t.id === taskId) ?? fullLicenseMockTestTasks[0];
}

function parseTargetInput(raw: string, fallback: number) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return clamp(n, 1, 30);
}

function immediateTotalFromCounts(counts: FullLicenseMockTestErrorCounts) {
  return fullLicenseMockTestImmediateErrors.reduce((sum, label) => sum + (counts[label] ?? 0), 0);
}

function hazardResponseLabel(value: FullLicenseMockTestHazardResponse) {
  if (value === "yes") return "Yes";
  if (value === "no") return "No";
  return "N/A";
}

function hazardDirectionLabel(direction: FullLicenseMockTestHazardDirection) {
  if (direction === "left") return "Left";
  if (direction === "right") return "Right";
  if (direction === "ahead") return "Ahead";
  if (direction === "behind") return "Behind";
  return "Others";
}

export function FullLicenseMockTestScreen({ navigation, route }: Props) {
  const { isSidebar } = useNavigationLayout();
  const { profile, userId } = useCurrentUser();
  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const studentsQuery = useStudentsQuery({ archived: false });
  const createAssessment = useCreateAssessmentMutation();

  const [stage, setStage] = useState<Stage>("details");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(() => !route.params?.studentId);

  const [sessionId, setSessionId] = useState(() => uid("session"));
  const [startTimeISO, setStartTimeISO] = useState<string | null>(null);
  const [endTimeISO, setEndTimeISO] = useState<string | null>(null);
  const [sessionSeconds, setSessionSeconds] = useState(OFFICIAL_SECONDS);
  const [timerRunning, setTimerRunning] = useState(false);
  const [immediateFailTriggered, setImmediateFailTriggered] = useState(false);

  const [attempts, setAttempts] = useState<FullLicenseMockTestAttempt[]>([]);
  const [critical, setCritical] = useState<FullLicenseMockTestErrorCounts>(() =>
    createErrorCounts(fullLicenseMockTestCriticalErrors),
  );
  const [immediate, setImmediate] = useState<FullLicenseMockTestErrorCounts>(() =>
    createErrorCounts(fullLicenseMockTestImmediateErrors),
  );
  const [expandedErrors, setExpandedErrors] = useState<{ critical: boolean; immediate: boolean }>({
    critical: true,
    immediate: false,
  });

  const [drillLeftTarget, setDrillLeftTarget] = useState(10);
  const [drillRightTarget, setDrillRightTarget] = useState(10);

  const [taskId, setTaskId] = useState<FullLicenseMockTestTaskId>("left_turn");
  const [variant, setVariant] = useState<string>(() => getTask("left_turn").variants[0] ?? "");
  const [repIndex, setRepIndex] = useState(1);
  const [repTarget, setRepTarget] = useState(1);

  const [items, setItems] = useState<Record<FullLicenseMockTestAssessmentItemId, PFValue>>(() =>
    createFullLicenseMockTestEmptyItems(),
  );
  const [hazardResponses, setHazardResponses] = useState<FullLicenseMockTestHazardResponses>(() =>
    createFullLicenseMockTestEmptyHazardResponses(),
  );
  const [hazardPickerTarget, setHazardPickerTarget] = useState<HazardPickerTarget | null>(null);
  const [hazardsSpoken, setHazardsSpoken] = useState("");
  const [actionsSpoken, setActionsSpoken] = useState("");
  const [notes, setNotes] = useState("");
  const [locationTag, setLocationTag] = useState("");
  const [openSuggestions, setOpenSuggestions] = useState<"hazards" | "actions" | "notes" | null>(
    null,
  );

  const hazardSuggestions = useMemo(
    () => [
      "Pedestrian near crossing",
      "Cyclist in blind spot / shoulder",
      "Vehicle approaching quickly from right",
      "Oncoming traffic closing gap",
      "Parked car door could open / vehicle pulling out",
    ],
    [],
  );

  const actionSuggestions = useMemo(
    () => [
      "Check mirrors and blind spot",
      "Reduce speed and cover brake",
      "Create space (3-second gap)",
      "Indicate early and position correctly",
      "Wait for a safe gap before proceeding",
    ],
    [],
  );

  const instructorNotesSuggestions = useMemo(
    () => [
      "Good scanning and commentary timing",
      "Needs earlier hazard identification",
      "Work on lane positioning through the turn",
      "Smoother speed control (ease off earlier)",
      "More decisive when safe (avoid hesitating)",
    ],
    [],
  );

  function hasSuggestionLine(value: string, suggestion: string) {
    return value
      .split(/\r?\n/)
      .some((line) => line.trim().toLowerCase() === suggestion.trim().toLowerCase());
  }

  function toggleSuggestionLine(value: string, suggestion: string) {
    const lines = value.split(/\r?\n/);
    const index = lines.findIndex(
      (line) => line.trim().toLowerCase() === suggestion.trim().toLowerCase(),
    );

    if (index >= 0) {
      const next = [...lines.slice(0, index), ...lines.slice(index + 1)];
      return next.join("\n").trimEnd();
    }

    const trimmed = value.trimEnd();
    return trimmed ? `${trimmed}\n${suggestion}` : suggestion;
  }

  function toggleSuggestions(key: "hazards" | "actions" | "notes") {
    setOpenSuggestions((prev) => (prev === key ? null : key));
  }

  function setHazardResponse(
    category: FullLicenseMockTestHazardCategory,
    direction: FullLicenseMockTestHazardDirection,
    response: FullLicenseMockTestHazardResponse,
  ) {
    setHazardResponses((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [direction]: response,
      },
    }));
  }

  function responseChipClassName(response: FullLicenseMockTestHazardResponse) {
    if (response === "yes") {
      return "border-emerald-600 bg-emerald-600/15 dark:border-emerald-400 dark:bg-emerald-500/20";
    }
    if (response === "no") {
      return "border-rose-600 bg-rose-600/15 dark:border-rose-400 dark:bg-rose-500/20";
    }
    return "border-border bg-background dark:border-borderDark dark:bg-backgroundDark";
  }

  const organizationName = organizationQuery.data?.name ?? "Driving School";

  const form = useForm<FullLicenseMockTestFormValues>({
    resolver: zodResolver(fullLicenseMockTestFormSchema),
    defaultValues: {
      studentId: "",
      date: dayjs().format(DISPLAY_DATE_FORMAT),
      time: "",
      locationArea: "Auckland - North Shore",
      vehicle: "Driving school car",
      mode: "official",
      weather: "dry",
      criticalNotes: "",
      immediateNotes: "",
      overallNotes: "",
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

  useEffect(() => {
    if (!selectedStudentId) return;
    setStage("details");
  }, [selectedStudentId]);

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

  const mode = form.watch("mode");

  const leftAttemptsCount = useMemo(
    () => attempts.filter((a) => a.taskId === "left_turn").length,
    [attempts],
  );

  const rightAttemptsCount = useMemo(
    () => attempts.filter((a) => a.taskId === "right_turn").length,
    [attempts],
  );

  useEffect(() => {
    if (startTimeISO) return;
    setSessionSeconds(mode === "drill" ? DRILL_SECONDS : OFFICIAL_SECONDS);
  }, [mode, startTimeISO]);

  useEffect(() => {
    if (!timerRunning) return;

    const t = setInterval(() => {
      setSessionSeconds((s) => {
        if (s <= 1) {
          clearInterval(t);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [timerRunning]);

  useEffect(() => {
    const task = getTask(taskId);
    setVariant(task.variants[0] ?? "");

    if (mode === "drill") {
      if (taskId === "left_turn") {
        setRepTarget(drillLeftTarget);
        setRepIndex(clamp(leftAttemptsCount + 1, 1, drillLeftTarget));
      } else if (taskId === "right_turn") {
        setRepTarget(drillRightTarget);
        setRepIndex(clamp(rightAttemptsCount + 1, 1, drillRightTarget));
      } else {
        setRepTarget(1);
        setRepIndex(1);
      }
    } else {
      setRepTarget(1);
      setRepIndex(1);
    }

    setItems(createFullLicenseMockTestEmptyItems());
    setHazardResponses(createFullLicenseMockTestEmptyHazardResponses());
    setHazardPickerTarget(null);
    setHazardsSpoken("");
    setActionsSpoken("");
    setNotes("");
    setLocationTag("");
  }, [drillLeftTarget, drillRightTarget, leftAttemptsCount, mode, rightAttemptsCount, taskId]);

  const summary = useMemo(() => {
    return calculateFullLicenseMockTestSummary({ attempts, critical, immediate });
  }, [attempts, critical, immediate]);

  useEffect(() => {
    setImmediateFailTriggered(summary.immediateTotal > 0);
  }, [summary.immediateTotal]);

  const saving = createAssessment.isPending;

  const draftHydratedRef = useRef<string | null>(null);
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function resetSession(options?: { keepDetails?: boolean }) {
    setSessionId(uid("session"));
    setStartTimeISO(null);
    setEndTimeISO(null);
    setTimerRunning(false);
    setImmediateFailTriggered(false);
    setAttempts([]);
    setCritical(createErrorCounts(fullLicenseMockTestCriticalErrors));
    setImmediate(createErrorCounts(fullLicenseMockTestImmediateErrors));
    setTaskId("left_turn");
    setItems(createFullLicenseMockTestEmptyItems());
    setHazardResponses(createFullLicenseMockTestEmptyHazardResponses());
    setHazardPickerTarget(null);
    setHazardsSpoken("");
    setActionsSpoken("");
    setNotes("");
    setLocationTag("");

    const nextMode = options?.keepDetails ? form.getValues("mode") : "official";
    setSessionSeconds(nextMode === "drill" ? DRILL_SECONDS : OFFICIAL_SECONDS);

    if (!options?.keepDetails) {
      form.setValue("mode", "official");
      form.setValue("weather", "dry");
      setDrillLeftTarget(10);
      setDrillRightTarget(10);
      form.setValue("criticalNotes", "");
      form.setValue("immediateNotes", "");
      form.setValue("overallNotes", "");
    }
  }

  async function maybeHydrateDraft(studentId: string) {
    if (draftHydratedRef.current === studentId) return;
    draftHydratedRef.current = studentId;

    const key = draftKey(userId, studentId);
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    let parsed: FullLicenseMockTestStoredData | null = null;
    try {
      const json = JSON.parse(raw);
      const result = fullLicenseMockTestStoredDataSchema.safeParse(json);
      parsed = result.success ? result.data : null;
    } catch {
      parsed = null;
    }

    if (!parsed) return;

    Alert.alert("Resume draft?", "A saved draft exists for this student on this device.", [
      {
        text: "Start new",
        style: "destructive",
        onPress: () => {
          void AsyncStorage.removeItem(key);
          resetSession({ keepDetails: true });
        },
      },
      {
        text: "Resume",
        onPress: () => {
          form.reset({
            studentId,
            date: parsed?.date ?? dayjs().format(DISPLAY_DATE_FORMAT),
            time: parsed?.time ?? "",
            locationArea: parsed?.locationArea ?? "",
            vehicle: parsed?.vehicle ?? "",
            mode: parsed?.mode ?? "official",
            weather: parsed?.weather ?? "dry",
            criticalNotes: parsed?.criticalNotes ?? "",
            immediateNotes: parsed?.immediateNotes ?? "",
            overallNotes: parsed?.overallNotes ?? "",
          });

          setDrillLeftTarget(parsed?.drillLeftTarget ?? 10);
          setDrillRightTarget(parsed?.drillRightTarget ?? 10);
          setStartTimeISO(parsed?.startTimeISO ?? null);
          setEndTimeISO(parsed?.endTimeISO ?? null);
          setSessionSeconds(
            parsed?.remainingSeconds ??
              ((parsed?.mode ?? "official") === "drill" ? DRILL_SECONDS : OFFICIAL_SECONDS),
          );
          setTimerRunning(false);
          setAttempts(parsed?.attempts ?? []);
          setCritical({
            ...createErrorCounts(fullLicenseMockTestCriticalErrors),
            ...(parsed?.critical ?? {}),
          });
          setImmediate({
            ...createErrorCounts(fullLicenseMockTestImmediateErrors),
            ...(parsed?.immediate ?? {}),
          });
          setSessionId(uid("session"));
          setStage(parsed?.endTimeISO ? "summary" : parsed?.startTimeISO ? "run" : "details");
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  useEffect(() => {
    if (!selectedStudent) return;
    void maybeHydrateDraft(selectedStudent.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStudent?.id]);

  useEffect(() => {
    if (!selectedStudent) return;
    if (stage !== "run" && stage !== "summary") return;

    if (draftSaveTimeoutRef.current) clearTimeout(draftSaveTimeoutRef.current);

    draftSaveTimeoutRef.current = setTimeout(() => {
      const values = form.getValues();
      const payload: FullLicenseMockTestStoredData = {
        ...values,
        version: DRAFT_VERSION,
        candidateName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        instructor: getProfileFullName(profile),
        drillLeftTarget,
        drillRightTarget,
        startTimeISO,
        endTimeISO,
        remainingSeconds: sessionSeconds,
        attempts,
        critical,
        immediate,
        summary: {
          attemptsCount: summary.attemptsCount,
          criticalTotal: summary.criticalTotal,
          immediateTotal: summary.immediateTotal,
          scorePercent: summary.scorePercent,
          readinessLabel: summary.readiness.label,
          readinessReason: summary.readiness.reason,
        },
        savedByUserId: userId,
      };

      void AsyncStorage.setItem(draftKey(userId, selectedStudent.id), JSON.stringify(payload));
    }, 500);

    return () => {
      if (!draftSaveTimeoutRef.current) return;
      clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    };
  }, [
    attempts,
    critical,
    drillLeftTarget,
    drillRightTarget,
    endTimeISO,
    form,
    immediate,
    getProfileFullName(profile),
    selectedStudent,
    sessionSeconds,
    stage,
    startTimeISO,
    summary.attemptsCount,
    summary.criticalTotal,
    summary.immediateTotal,
    summary.readiness.label,
    summary.readiness.reason,
    summary.scorePercent,
    userId,
  ]);

  function toggleErrorCount(type: "critical" | "immediate", label: string, delta: number) {
    const updater = (prev: FullLicenseMockTestErrorCounts) => {
      const next = Math.max(0, (prev[label] ?? 0) + delta);
      return { ...prev, [label]: next };
    };

    if (type === "critical") {
      setCritical(updater);
      return;
    }

    setImmediate((prev) => {
      const next = updater(prev);
      const nextTotal = immediateTotalFromCounts(next);

      if (nextTotal > 0 && !immediateFailTriggered) {
        setTimerRunning(false);
        Alert.alert(
          "Immediate fail recorded",
          "For realism, the session is paused. You can end and review the summary now.",
          [
            {
              text: "End & review",
              style: "destructive",
              onPress: () => {
                setEndTimeISO(new Date().toISOString());
                setStage("summary");
              },
            },
            { text: "Continue", style: "cancel" },
          ],
        );
      }

      return next;
    });
  }

  function validateAttempt() {
    if (!hasFullLicenseMockTestHazardResponse(hazardResponses)) {
      return "Select at least one hazard response (Yes/No) before recording this attempt.";
    }
    if (!hazardsSpoken.trim()) return "Please enter the hazards spoken.";
    if (!actionsSpoken.trim()) return "Please enter the action spoken.";
    if (mode === "drill") {
      if (taskId === "left_turn" && leftAttemptsCount >= drillLeftTarget) {
        return "Left-turn target already completed.";
      }
      if (taskId === "right_turn" && rightAttemptsCount >= drillRightTarget) {
        return "Right-turn target already completed.";
      }
    }
    return null;
  }

  function saveAttempt() {
    const err = validateAttempt();
    if (err) {
      Alert.alert("Check the attempt", err);
      return;
    }

    const task = getTask(taskId);
    const attempt: FullLicenseMockTestAttempt = {
      id: uid("attempt"),
      createdAt: new Date().toISOString(),
      taskId,
      taskName: task.name,
      variant,
      repIndex,
      repTarget,
      items: { ...items },
      hazardResponses: {
        pedestrians: { ...hazardResponses.pedestrians },
        vehicles: { ...hazardResponses.vehicles },
        others: { ...hazardResponses.others },
      },
      hazardsSpoken: hazardsSpoken.trim(),
      actionsSpoken: actionsSpoken.trim(),
      notes: notes.trim(),
      locationTag: locationTag.trim(),
    };

    setAttempts((prev) => [attempt, ...prev]);

    if (mode === "drill") {
      if (taskId === "left_turn") {
        setRepIndex(clamp(leftAttemptsCount + 2, 1, drillLeftTarget));
      } else if (taskId === "right_turn") {
        setRepIndex(clamp(rightAttemptsCount + 2, 1, drillRightTarget));
      }
    }

    setItems(createFullLicenseMockTestEmptyItems());
    setHazardResponses(createFullLicenseMockTestEmptyHazardResponses());
    setHazardPickerTarget(null);
    setHazardsSpoken("");
    setActionsSpoken("");
    setNotes("");
    setLocationTag("");
    Alert.alert("Recorded", "Task attempt recorded.");
  }

  function startSession() {
    setStartTimeISO(new Date().toISOString());
    setEndTimeISO(null);
    setTimerRunning(true);
    setStage("run");
  }

  function endSession() {
    setTimerRunning(false);
    setEndTimeISO(new Date().toISOString());
    setStage("summary");
  }

  async function submitAndGeneratePdf(values: FullLicenseMockTestFormValues) {
    if (!selectedStudent) {
      Alert.alert("Select a student", "Please select a student first.");
      return;
    }

    const assessmentDateISO = parseDateInputToISODate(values.date);
    if (!assessmentDateISO) {
      Alert.alert("Check the form", "Use DD/MM/YYYY for the assessment date.");
      return;
    }

    const safeEndTimeISO = endTimeISO ?? new Date().toISOString();

    try {
      const stored: FullLicenseMockTestStoredData = {
        ...values,
        version: DRAFT_VERSION,
        candidateName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
        instructor: getProfileFullName(profile),
        drillLeftTarget,
        drillRightTarget,
        startTimeISO,
        endTimeISO: safeEndTimeISO,
        remainingSeconds: sessionSeconds,
        attempts,
        critical,
        immediate,
        summary: {
          attemptsCount: summary.attemptsCount,
          criticalTotal: summary.criticalTotal,
          immediateTotal: summary.immediateTotal,
          scorePercent: summary.scorePercent,
          readinessLabel: summary.readiness.label,
          readinessReason: summary.readiness.reason,
        },
        savedByUserId: userId,
      };

      const validated = fullLicenseMockTestStoredDataSchema.safeParse(stored);
      if (!validated.success) {
        Alert.alert("Check the form", "Some required details are missing.");
        return;
      }

      const assessment = await createAssessment.mutateAsync({
        organization_id: profile.organization_id,
        student_id: selectedStudent.id,
        instructor_id: selectedStudent.assigned_instructor_id,
        assessment_type: "third_assessment",
        assessment_date: assessmentDateISO,
        total_score: summary.scorePercent,
        form_data: validated.data,
      });

      try {
        const androidDirectoryUri =
          Platform.OS === "android" ? await ensureAndroidDownloadsDirectoryUri() : undefined;

        const fileName = `Mock Test Full License ${selectedStudent.first_name} ${selectedStudent.last_name} ${dayjs(
          assessmentDateISO,
        ).format("DD-MM-YY")}`;

        const saved = await exportFullLicenseMockTestPdf({
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

  const header = (
    <View>
      <AppText variant="title">Mock Test - Full License</AppText>
      <AppText className="mt-2" variant="body">
        Record task attempts (pass/fail items), hazards spoken, critical errors, immediate-fail
        errors, and export a PDF summary.
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

  const setupCard = (
    <AppCard className="gap-4">
      <AppText variant="heading">Session setup</AppText>
      <AppText variant="caption">Enter details, choose mode, then start.</AppText>

      <Controller
        control={form.control}
        name="date"
        render={({ field }) => (
          <AppDateInput label="Date" value={field.value} onChangeText={(next) => field.onChange(next)} />
        )}
      />

      <Controller
        control={form.control}
        name="time"
        render={({ field }) => (
          <AppTimeInput label="Time" value={field.value} onChangeText={(next) => field.onChange(next)} />
        )}
      />

      <Controller
        control={form.control}
        name="locationArea"
        render={({ field }) => (
          <AppInput
            label="Area"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="e.g., Auckland - North Shore"
          />
        )}
      />

      <Controller
        control={form.control}
        name="vehicle"
        render={({ field }) => (
          <AppInput
            label="Vehicle"
            value={field.value}
            onChangeText={field.onChange}
            placeholder="e.g., Driving school car"
          />
        )}
      />

      <Controller
        control={form.control}
        name="mode"
        render={({ field }) => (
          <AppStack gap="sm">
            <AppText variant="label">Mode</AppText>
            <AppSegmentedControl<FullLicenseMockTestMode>
              value={field.value}
              onChange={(next) => field.onChange(next)}
              options={[
                { value: "official", label: "Official (20 min)" },
                { value: "drill", label: "Skills drill" },
              ]}
            />
          </AppStack>
        )}
      />

      <Controller
        control={form.control}
        name="weather"
        render={({ field }) => (
          <AppStack gap="sm">
            <AppText variant="label">Road conditions</AppText>
            <AppSegmentedControl<FullLicenseMockTestWeather>
              value={field.value}
              onChange={(next) => field.onChange(next)}
              options={[
                { value: "dry", label: "Dry" },
                { value: "wet", label: "Wet" },
                { value: "low_visibility", label: "Low visibility" },
              ]}
            />
          </AppStack>
        )}
      />

      {mode === "drill" ? (
        <View className="flex-row gap-3">
          <AppInput
            label="Turning Left - reps"
            keyboardType="number-pad"
            value={String(drillLeftTarget)}
            onChangeText={(raw) => setDrillLeftTarget(parseTargetInput(raw, drillLeftTarget))}
            containerClassName="flex-1"
          />
          <AppInput
            label="Turning Right - reps"
            keyboardType="number-pad"
            value={String(drillRightTarget)}
            onChangeText={(raw) => setDrillRightTarget(parseTargetInput(raw, drillRightTarget))}
            containerClassName="flex-1"
          />
        </View>
      ) : null}

      <Controller
        control={form.control}
        name="overallNotes"
        render={({ field }) => (
          <AppInput
            label="Overall notes (optional)"
            value={field.value}
            onChangeText={field.onChange}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            inputClassName="h-24 py-3"
            placeholder="Coaching notes, session goals, context"
          />
        )}
      />
    </AppCard>
  );

  const confirmCard = (
    <AppCard className="gap-3">
      <AppText variant="heading">Confirm details</AppText>

      <AppText variant="body">
        Candidate:{" "}
        {selectedStudent
          ? `${selectedStudent.first_name} ${selectedStudent.last_name}`
          : "Select a student first."}
      </AppText>
      <AppText variant="body">Date: {form.getValues("date") || ""}</AppText>
      <AppText variant="body">Time: {form.getValues("time") || ""}</AppText>
      <AppText variant="body">Area: {form.getValues("locationArea") || ""}</AppText>
      <AppText variant="body">Vehicle: {form.getValues("vehicle") || ""}</AppText>
      <AppText variant="body">
        Mode: {mode === "drill" ? "Skills drill" : "Official-style"} · Conditions:{" "}
        {weatherLabel(form.getValues("weather"))}
      </AppText>
      {mode === "drill" ? (
        <AppText variant="caption">
          Drill targets: Turning Left {drillLeftTarget} · Turning Right {drillRightTarget}
        </AppText>
      ) : null}

      <AppText variant="caption">
        The session auto-saves on this device while you're in the run/summary screens.
      </AppText>
    </AppCard>
  );

  const stageActions =
    stage === "details" ? (
      <AppStack gap="sm">
        <AppButton
          label="Review and start"
          icon={Timer}
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
      <AppStack gap="sm">
        <AppButton width="auto" variant="secondary" label="Back" onPress={() => setStage("details")} />
        <AppButton
          width="auto"
          label="Start session"
          onPress={() => {
            resetSession({ keepDetails: true });
            startSession();
          }}
        />
        <AppButton width="auto" variant="ghost" label="Cancel" onPress={() => navigation.goBack()} />
      </AppStack>
    ) : stage === "run" ? (
      <AppStack gap="sm">
        <AppButton
          width="auto"
          variant="secondary"
          label="Finish session"
          icon={CircleStop}
          onPress={() => {
            Alert.alert("Finish session?", "End now and go to summary?", [
              { text: "Cancel", style: "cancel" },
              { text: "Finish", style: "destructive", onPress: () => endSession() },
            ]);
          }}
        />
        <AppButton
          width="auto"
          variant="secondary"
          label="New session"
          icon={RotateCcw}
          onPress={() => resetSession({ keepDetails: true })}
        />
        <AppButton width="auto" variant="ghost" label="Exit" onPress={() => navigation.goBack()} />
      </AppStack>
    ) : (
      <>
        {createAssessment.isError ? <AppText variant="error">{toErrorMessage(createAssessment.error)}</AppText> : null}
        <AppButton
          label={saving ? "Submitting..." : "Submit and generate PDF"}
          disabled={saving}
          icon={Timer}
          onPress={form.handleSubmit((values) => {
            Alert.alert("Submit mock test?", "This will save the assessment and generate a PDF for export.", [
              { text: "Cancel", style: "cancel" },
              { text: "Submit", style: "destructive", onPress: () => void submitAndGeneratePdf(values) },
            ]);
          })}
        />
        <AppButton width="auto" variant="secondary" label="Back to session" onPress={() => setStage("run")} />
        <AppButton
          width="auto"
          variant="secondary"
          label="New session"
          icon={RotateCcw}
          onPress={() => resetSession({ keepDetails: true })}
        />
        <AppButton width="auto" variant="ghost" label="Exit" onPress={() => navigation.goBack()} />
      </>
    );

  const immediateChipClasses =
    summary.immediateTotal > 0
      ? "border-danger/30 bg-danger/5 dark:border-dangerDark/30 dark:bg-dangerDark/10"
      : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark";

  const readinessChipClasses =
    summary.readiness.label === "IN PROGRESS"
      ? "border-emerald-600 bg-emerald-600 dark:border-emerald-500 dark:bg-emerald-500"
      : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark";

  const overviewCard = (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-1">
          <AppText variant="heading">Session</AppText>
          <AppText variant="caption">Session ID: {sessionId}</AppText>
          <AppText variant="caption">{summary.readiness.reason}</AppText>
        </View>

        <View className="items-end gap-1">
          <View className="flex-row items-center gap-2">
            <Timer size={16} color={theme.colors.mutedLight} />
            <AppText variant="heading">{formatMMSS(sessionSeconds)}</AppText>
          </View>
          <View className={cn("rounded-full border px-3 py-1", readinessChipClasses)}>
            <AppText
              variant={summary.readiness.label === "NOT READY" ? "error" : "caption"}
              className={cn("font-semibold", summary.readiness.label === "IN PROGRESS" && "text-white")}
            >
              {summary.readiness.label}
            </AppText>
          </View>
        </View>
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap gap-3">
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Attempts: {summary.attemptsCount}</AppText>
        </View>
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">
            Score: {summary.scorePercent == null ? "—" : `${summary.scorePercent}%`}
          </AppText>
        </View>
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Critical: {summary.criticalTotal}</AppText>
        </View>
        <View className={cn("rounded-xl border px-3 py-2", immediateChipClasses)}>
          <AppText variant={summary.immediateTotal > 0 ? "error" : "caption"}>
            Immediate: {summary.immediateTotal}
          </AppText>
        </View>
        </View>

        <AppButton
          width="auto"
          variant="secondary"
          className="h-10 w-12 px-0"
          icon={timerRunning ? Pause : Play}
          label=""
          accessibilityLabel={timerRunning ? "Pause" : "Resume"}
          onPress={() => setTimerRunning((r) => !r)}
        />
      </View>

      {immediateFailTriggered ? (
        <View className="rounded-2xl border border-danger/30 bg-danger/5 p-3 dark:border-dangerDark/30 dark:bg-dangerDark/10">
          <View className="flex-row items-start gap-2">
            <TriangleAlert size={18} color={theme.colors.danger} />
            <View className="flex-1 gap-1">
              <AppText variant="error">Immediate fail recorded</AppText>
              <AppText variant="caption">
                The timer is paused. End and review the summary for coaching, or continue anyway.
              </AppText>
            </View>
          </View>
        </View>
      ) : null}
    </AppCard>
  );

  const attemptEntryCard = (
    <AppCard className="gap-4">
      <AppText variant="heading">Record task attempt</AppText>

      <AppStack gap="sm">
        <AppText variant="label">Task type</AppText>
        <View className="flex-row flex-wrap gap-2">
          {fullLicenseMockTestTasks.map((t) => (
            <AppButton
              key={t.id}
              width="auto"
              variant={t.id === taskId ? "primary" : "secondary"}
              label={t.name}
              onPress={() => setTaskId(t.id)}
            />
          ))}
        </View>
      </AppStack>

      <AppStack gap="sm">
        <AppText variant="label">Scenario / variant</AppText>
        <View className="flex-row flex-wrap gap-2">
          {getTask(taskId).variants.map((v) => (
            <AppButton
              key={v}
              width="auto"
              variant={v === variant ? "primary" : "secondary"}
              label={v}
              onPress={() => setVariant(v)}
            />
          ))}
        </View>
      </AppStack>

      <View className="flex-row flex-wrap gap-3">
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Rep: {repTarget > 1 ? `${repIndex}/${repTarget}` : "—"}</AppText>
        </View>
        {mode === "drill" && (taskId === "left_turn" || taskId === "right_turn") ? (
          <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
            <AppText variant="caption">Auto-increments on Save.</AppText>
          </View>
        ) : null}
      </View>

      <AppInput
        label="Location tag (optional)"
        value={locationTag}
        onChangeText={setLocationTag}
        placeholder="e.g., Constellation Dr / Oteha Valley"
      />

      <AppDivider />

      <AppText variant="heading">Hazard Detection and Response</AppText>
      <AppText variant="caption">
        Tap each hazard box to set Yes, No, or N/A. At least one Yes/No response is required per
        task attempt.
      </AppText>

      <AppStack gap="sm">
        {fullLicenseMockTestHazardCategories.map((category) => (
          <View key={category} className="flex-row items-center justify-between gap-3">
            <AppText variant="body" className="w-28">
              {fullLicenseMockTestHazardCategoryLabels[category]}
            </AppText>
            <View className="flex-1 flex-row justify-end gap-2">
              {fullLicenseMockTestHazardDirections.map((direction) => {
                const isInCategory = fullLicenseMockTestHazardLayout[category].includes(direction);
                if (!isInCategory) {
                  return <View key={`${category}:${direction}`} className="h-11 w-11" />;
                }

                const response = hazardResponses[category][direction];
                return (
                  <Pressable
                    key={`${category}:${direction}`}
                    accessibilityRole="button"
                    accessibilityLabel={`${fullLicenseMockTestHazardCategoryLabels[category]} ${hazardDirectionLabel(direction)} response`}
                    className={cn(
                      "h-11 w-11 items-center justify-center rounded-lg border",
                      responseChipClassName(response),
                    )}
                    onPress={() => setHazardPickerTarget({ category, direction })}
                  >
                    <AppText
                      variant="label"
                      className={cn(
                        "text-base",
                        response === "yes" && "text-emerald-700 dark:text-emerald-300",
                        response === "no" && "text-rose-700 dark:text-rose-300",
                      )}
                    >
                      {fullLicenseMockTestHazardDirectionLabels[direction]}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </AppStack>

      <AppDivider />

      <AppText variant="heading">Assessment items (Pass/Fail)</AppText>
      <AppStack gap="sm">
        {fullLicenseMockTestAssessmentItems.map((it) => (
          <View key={it.id} className="flex-row items-center justify-between gap-3">
            <AppText className="flex-1" variant="body">
              {it.label}
            </AppText>
            <AppSegmentedControl<PFValue>
              value={items[it.id]}
              onChange={(next) => setItems((prev) => ({ ...prev, [it.id]: next }))}
              options={[
                { value: "P", label: "Pass" },
                { value: "F", label: "Fail" },
              ]}
              className="w-44"
            />
          </View>
        ))}
      </AppStack>

      <AppDivider />

      <AppInput
        label="Hazard(s) spoken (required)"
        value={hazardsSpoken}
        onChangeText={setHazardsSpoken}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        inputClassName="h-20 py-3"
        placeholder="e.g., pedestrian near crossing, vehicle approaching fast from right"
      />

      <AppButton
        width="auto"
        variant="ghost"
        label={openSuggestions === "hazards" ? "Hide hazard suggestions" : "Show hazard suggestions"}
        onPress={() => toggleSuggestions("hazards")}
      />
      {openSuggestions === "hazards" ? (
        <AppStack gap="sm">
          {hazardSuggestions.map((option) => (
            <AppButton
              key={option}
              width="auto"
              variant={hasSuggestionLine(hazardsSpoken, option) ? "primary" : "secondary"}
              label={option}
              onPress={() => setHazardsSpoken((prev) => toggleSuggestionLine(prev, option))}
            />
          ))}
        </AppStack>
      ) : null}

      <AppInput
        label="Action spoken (required)"
        value={actionsSpoken}
        onChangeText={setActionsSpoken}
        multiline
        numberOfLines={3}
        textAlignVertical="top"
        inputClassName="h-20 py-3"
        placeholder="e.g., I’m slowing, checking mirrors, and waiting for a safe gap"
      />

      <AppButton
        width="auto"
        variant="ghost"
        label={openSuggestions === "actions" ? "Hide action suggestions" : "Show action suggestions"}
        onPress={() => toggleSuggestions("actions")}
      />
      {openSuggestions === "actions" ? (
        <AppStack gap="sm">
          {actionSuggestions.map((option) => (
            <AppButton
              key={option}
              width="auto"
              variant={hasSuggestionLine(actionsSpoken, option) ? "primary" : "secondary"}
              label={option}
              onPress={() => setActionsSpoken((prev) => toggleSuggestionLine(prev, option))}
            />
          ))}
        </AppStack>
      ) : null}

      <AppInput
        label="Instructor notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        inputClassName="h-24 py-3"
        placeholder="Coaching cues, what to improve, what went well"
      />

      <AppButton
        width="auto"
        variant="ghost"
        label={openSuggestions === "notes" ? "Hide note suggestions" : "Show note suggestions"}
        onPress={() => toggleSuggestions("notes")}
      />
      {openSuggestions === "notes" ? (
        <AppStack gap="sm">
          {instructorNotesSuggestions.map((option) => (
            <AppButton
              key={option}
              width="auto"
              variant={hasSuggestionLine(notes, option) ? "primary" : "secondary"}
              label={option}
              onPress={() => setNotes((prev) => toggleSuggestionLine(prev, option))}
            />
          ))}
        </AppStack>
      ) : null}

      <View className="w-full flex-row flex-wrap justify-end gap-2">
        <AppButton
          width="auto"
          variant="secondary"
          label="Clear all"
          icon={RotateCcw}
          onPress={() => {
            setItems(createFullLicenseMockTestEmptyItems());
            setHazardResponses(createFullLicenseMockTestEmptyHazardResponses());
            setHazardPickerTarget(null);
            setHazardsSpoken("");
            setActionsSpoken("");
            setNotes("");
            setLocationTag("");
          }}
        />
        <AppButton width="auto" label="Record task attempt" icon={Flag} onPress={saveAttempt} />
      </View>
    </AppCard>
  );

  const errorsCard = (
    <AppCard className="gap-4">
      <AppText variant="heading">Errors</AppText>

      <AppCollapsibleCard
        title="Critical errors"
        subtitle="Log any time"
        expanded={expandedErrors.critical}
        onToggle={() =>
          setExpandedErrors((prev) => ({ ...prev, critical: !prev.critical }))
        }
      >
        <AppStack gap="sm">
          {fullLicenseMockTestCriticalErrors.map((label) => (
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
                  variant="danger"
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
              label="Critical notes (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputClassName="h-24 py-3"
            />
          )}
        />
      </AppCollapsibleCard>

      <AppCollapsibleCard
        title="Immediate failure errors"
        subtitle="Any one can stop the session"
        expanded={expandedErrors.immediate}
        onToggle={() =>
          setExpandedErrors((prev) => ({ ...prev, immediate: !prev.immediate }))
        }
      >
        <AppStack gap="sm">
          {fullLicenseMockTestImmediateErrors.map((label) => (
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
              label="Immediate notes (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              inputClassName="h-24 py-3"
            />
          )}
        />
      </AppCollapsibleCard>
    </AppCard>
  );

  const liveLogCard = (
    <AppCard className="gap-4">
      <AppText variant="heading">Live log</AppText>

      <View className="flex-row flex-wrap gap-2">
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Attempts: {attempts.length}</AppText>
        </View>
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Critical: {summary.criticalTotal}</AppText>
        </View>
        <View className={cn("rounded-xl border px-3 py-2", immediateChipClasses)}>
          <AppText variant={summary.immediateTotal > 0 ? "error" : "caption"}>
            Immediate: {summary.immediateTotal}
          </AppText>
        </View>
      </View>

      <AppStack gap="sm">
        <AppText variant="heading">Top repeated issues</AppText>
        {Object.entries(summary.failuresByItem)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([id, count]) => {
            const label = fullLicenseMockTestAssessmentItems.find((x) => x.id === id)?.label ?? id;
            return (
              <View
                key={id}
                className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
              >
                <AppText variant="body">{label}</AppText>
                <AppText variant="caption">{count} fail(s)</AppText>
              </View>
            );
          })}
        {attempts.length === 0 ? <AppText variant="caption">No attempts recorded yet.</AppText> : null}
      </AppStack>

      <AppDivider />

      <AppStack gap="sm">
        <AppText variant="heading">Recent attempts</AppText>
        {attempts.slice(0, 4).map((a) => {
          const sc = scoreFullLicenseMockTestAttempt(a);
          return (
            <View
              key={a.id}
              className="rounded-2xl border border-border bg-background p-3 dark:border-borderDark dark:bg-backgroundDark"
            >
              <View className="flex-row items-center justify-between gap-2">
                <AppText className="flex-1" variant="body">
                  {a.taskName}
                </AppText>
                <AppText variant={sc.fails > 0 ? "error" : "caption"}>
                  {sc.fails === 0 ? "All pass" : `${sc.fails}/${sc.total} failed`}
                </AppText>
              </View>
              <AppText className="mt-1" variant="caption" numberOfLines={2}>
                {a.variant}
                {a.repTarget > 1 ? ` · Rep ${a.repIndex}/${a.repTarget}` : ""}
                {a.locationTag ? ` · ${a.locationTag}` : ""}
              </AppText>
            </View>
          );
        })}
        {attempts.length === 0 ? <AppText variant="caption">No attempts recorded yet.</AppText> : null}
      </AppStack>
    </AppCard>
  );

  const summaryCard = (
    <AppCard className="gap-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <AppText variant="heading">Summary</AppText>
          <AppText className="mt-1" variant="caption">
            {summary.readiness.label} · {summary.readiness.reason}
          </AppText>
        </View>
        <View className="items-end">
          <AppText variant="heading">
            {summary.scorePercent == null ? "—" : `${summary.scorePercent}%`}
          </AppText>
          <AppText variant="caption">Score</AppText>
        </View>
      </View>

      <View className="flex-row flex-wrap gap-2">
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Attempts: {summary.attemptsCount}</AppText>
        </View>
        <View className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark">
          <AppText variant="caption">Critical: {summary.criticalTotal}</AppText>
        </View>
        <View className={cn("rounded-xl border px-3 py-2", immediateChipClasses)}>
          <AppText variant={summary.immediateTotal > 0 ? "error" : "caption"}>
            Immediate: {summary.immediateTotal}
          </AppText>
        </View>
      </View>

      <AppDivider />

      <AppText variant="heading">Coaching focus</AppText>
      <AppStack gap="sm">
        {Object.entries(summary.failuresByItem)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([id, count]) => {
            const label = fullLicenseMockTestAssessmentItems.find((x) => x.id === id)?.label ?? id;
            return (
              <View
                key={id}
                className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
              >
                <AppText variant="body">{label}</AppText>
                <AppText variant="caption">{count} fail(s)</AppText>
              </View>
            );
          })}
      </AppStack>
    </AppCard>
  );

  const runContent = isSidebar ? (
    <View className="flex-row gap-4">
      <View className="flex-1 gap-4">
        {overviewCard}
        {attemptEntryCard}
        {errorsCard}
        {stageActions}
      </View>
      <View className="w-96">{liveLogCard}</View>
    </View>
  ) : (
    <AppStack gap="lg">
      {overviewCard}
      {attemptEntryCard}
      {errorsCard}
      {liveLogCard}
      {stageActions}
    </AppStack>
  );

  const selectedHazardResponse = hazardPickerTarget
    ? hazardResponses[hazardPickerTarget.category][hazardPickerTarget.direction]
    : "na";

  const hazardPickerModal = (
    <Modal
      visible={hazardPickerTarget != null}
      transparent
      animationType="fade"
      onRequestClose={() => setHazardPickerTarget(null)}
    >
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <AppCard className="w-full max-w-sm gap-3">
          <AppText variant="heading">Hazard Detection and Response</AppText>
          {hazardPickerTarget ? (
            <AppText variant="body">
              {fullLicenseMockTestHazardCategoryLabels[hazardPickerTarget.category]} -{" "}
              {hazardDirectionLabel(hazardPickerTarget.direction)}
            </AppText>
          ) : null}
          <View className="flex-row gap-2">
            <AppButton
              width="auto"
              className="flex-1"
              variant={selectedHazardResponse === "yes" ? "primary" : "secondary"}
              label="Yes"
              onPress={() => {
                if (!hazardPickerTarget) return;
                setHazardResponse(hazardPickerTarget.category, hazardPickerTarget.direction, "yes");
                setHazardPickerTarget(null);
              }}
            />
            <AppButton
              width="auto"
              className="flex-1"
              variant={selectedHazardResponse === "no" ? "danger" : "secondary"}
              label="No"
              onPress={() => {
                if (!hazardPickerTarget) return;
                setHazardResponse(hazardPickerTarget.category, hazardPickerTarget.direction, "no");
                setHazardPickerTarget(null);
              }}
            />
          </View>
          <View className="flex-row gap-2">
            <AppButton
              width="auto"
              className="flex-1"
              variant={selectedHazardResponse === "na" ? "primary" : "secondary"}
              label="N/A"
              onPress={() => {
                if (!hazardPickerTarget) return;
                setHazardResponse(hazardPickerTarget.category, hazardPickerTarget.direction, "na");
                setHazardPickerTarget(null);
              }}
            />
            <AppButton
              width="auto"
              className="flex-1"
              variant="ghost"
              label="Close"
              onPress={() => setHazardPickerTarget(null)}
            />
          </View>
        </AppCard>
      </View>
    </Modal>
  );

  return (
    <>
      <Screen scroll className={cn(isSidebar && "max-w-6xl")}>
        <AppStack gap="lg">
          {header}
          {studentCard}

          {stage === "details" ? (
            <>
              {setupCard}
              {stageActions}
            </>
          ) : null}

          {stage === "confirm" ? (
            <>
              {confirmCard}
              {stageActions}
            </>
          ) : null}

          {stage === "run" ? runContent : null}

          {stage === "summary" ? (
            <AppStack gap="lg">
              {summaryCard}
              {liveLogCard}
              {stageActions}
            </AppStack>
          ) : null}
        </AppStack>
      </Screen>
      {hazardPickerModal}
    </>
  );
}
