import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type FieldPath,
} from "react-hook-form";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { ArrowLeft, FileDown, Play, RefreshCw, X } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { useCreateAssessmentMutation } from "../../features/assessments/queries";
import {
  drivingAssessmentCriteria,
  drivingAssessmentFeedbackOptions,
} from "../../features/assessments/driving-assessment/constants";
import { exportDrivingAssessmentPdf } from "../../features/assessments/driving-assessment/pdf";
import {
  calculateDrivingAssessmentScore,
  generateDrivingAssessmentFeedbackSummary,
} from "../../features/assessments/driving-assessment/scoring";
import {
  drivingAssessmentFormSchema,
  type DrivingAssessmentFormValues,
} from "../../features/assessments/driving-assessment/schema";
import { ensureAndroidDownloadsDirectoryUri } from "../../features/assessments/android-downloads";
import { notifyPdfSaved } from "../../features/notifications/download-notifications";
import { useOrganizationQuery } from "../../features/organization/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import {
  DISPLAY_DATE_FORMAT,
  formatIsoDateToDisplay,
  parseDateInputToISODate,
} from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";
import { openPdfUri } from "../../utils/open-pdf";
import { AssessmentStudentDropdown } from "../components/AssessmentStudentDropdown";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "DrivingAssessment">;

type DrivingAssessmentStage = "details" | "test";
type DrivingAssessmentCategoryKey = keyof typeof drivingAssessmentCriteria;

function scoreFieldName(
  category: DrivingAssessmentCategoryKey,
  index: number,
): FieldPath<DrivingAssessmentFormValues> {
  return `scores.${category}.${index}` as FieldPath<DrivingAssessmentFormValues>;
}

function hydrateFromStudent(
  form: ReturnType<typeof useForm<DrivingAssessmentFormValues>>,
  student: {
    first_name: string;
    last_name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    license_number: string | null;
    license_version: string | null;
    class_held: string | null;
    issue_date: string | null;
    expiry_date: string | null;
  },
) {
  form.setValue("clientName", `${student.first_name} ${student.last_name}`.trim());
  form.setValue("address", student.address ?? "");
  form.setValue("contact", student.phone ?? "");
  form.setValue("email", student.email ?? "");
  form.setValue("licenseNumber", student.license_number ?? "");
  form.setValue("licenseVersion", student.license_version ?? "");
  form.setValue("classHeld", student.class_held ?? "");
  form.setValue(
    "issueDate",
    student.issue_date ? formatIsoDateToDisplay(student.issue_date) : "",
  );
  form.setValue(
    "expiryDate",
    student.expiry_date ? formatIsoDateToDisplay(student.expiry_date) : "",
  );
}

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

type FeedbackKey = "strengths" | "improvements" | "recommendation" | "nextSteps";

function FeedbackField({
  fieldKey,
  label,
  value,
  onChangeText,
  suggestions,
  suggestionsOpen,
  onToggleSuggestions,
  onYLayout,
}: {
  fieldKey: FeedbackKey;
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  suggestions: readonly string[];
  suggestionsOpen: boolean;
  onToggleSuggestions: (key: FeedbackKey) => void;
  onYLayout: (key: FeedbackKey, y: number) => void;
}) {
  return (
    <View
      onLayout={(e) => onYLayout(fieldKey, e.nativeEvent.layout.y)}
      // keep layout stable for measurement
      className="gap-4"
    >
      <AppCard className="gap-4">
        <AppInput
          label={label}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
          inputClassName="h-32 py-3"
          value={value}
          onChangeText={onChangeText}
        />

        <AppButton
          width="auto"
          variant="ghost"
          label={suggestionsOpen ? "Hide suggestions" : "Show suggestions"}
          onPress={() => onToggleSuggestions(fieldKey)}
        />

        {suggestionsOpen ? (
          <AppStack gap="sm">
            {suggestions.map((option) => (
              <AppButton
                key={option}
                width="auto"
                variant={hasSuggestionLine(value, option) ? "primary" : "secondary"}
                label={option}
                onPress={() => onChangeText(toggleSuggestionLine(value, option))}
              />
            ))}
          </AppStack>
        ) : null}
      </AppCard>
    </View>
  );
}

export function DrivingAssessmentScreen({ navigation, route }: Props) {
  const { profile, userId } = useCurrentUser();

  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const studentsQuery = useStudentsQuery({ archived: false });
  const createAssessment = useCreateAssessmentMutation();

  const [stage, setStage] = useState<DrivingAssessmentStage>("details");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [startTestModalVisible, setStartTestModalVisible] = useState(false);

  const scrollRef = useRef<ScrollView | null>(null);
  const [openSuggestions, setOpenSuggestions] = useState<FeedbackKey | null>(null);
  const [feedbackFieldY, setFeedbackFieldY] = useState<
    Partial<Record<FeedbackKey, number>>
  >({});

  function onToggleSuggestions(key: FeedbackKey) {
    setOpenSuggestions((current) => (current === key ? null : key));
  }

  function onFeedbackYLayout(key: FeedbackKey, y: number) {
    setFeedbackFieldY((current) =>
      current[key] === y ? current : { ...current, [key]: y },
    );
  }

  useEffect(() => {
    if (stage !== "test") setOpenSuggestions(null);
  }, [stage]);

  useEffect(() => {
    if (!openSuggestions) return;

    const y = feedbackFieldY[openSuggestions];
    if (y == null) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, y - 20), animated: true });
    });
  }, [feedbackFieldY, openSuggestions]);

  const form = useForm<DrivingAssessmentFormValues>({
    resolver: zodResolver(drivingAssessmentFormSchema),
    defaultValues: {
      studentId: "",
      clientName: "",
      address: "",
      contact: "",
      email: "",
      licenseNumber: "",
      licenseVersion: "",
      classHeld: "",
      issueDate: "",
      expiryDate: "",
      date: dayjs().format(DISPLAY_DATE_FORMAT),
      instructor: getProfileFullName(profile),
      scores: {},
      strengths: "",
      improvements: "",
      recommendation: "",
      nextSteps: "",
    },
  });

  const watchedScores = useWatch({ control: form.control, name: "scores" });

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
    if (selectedStudentId) return;
    const initialStudent = (studentsQuery.data ?? []).find(
      (student) => student.id === initialStudentId,
    );
    if (!initialStudent) return;
    setSelectedStudentId(initialStudentId);
    form.setValue("studentId", initialStudentId, { shouldValidate: true });
    hydrateFromStudent(form, initialStudent);
  }, [form, route.params?.studentId, selectedStudentId, studentsQuery.data]);

  useEffect(() => {
    setStage("details");
  }, [selectedStudentId]);

  const scoreResult = useMemo(() => {
    return calculateDrivingAssessmentScore(watchedScores);
  }, [watchedScores]);

  const feedbackSummary = useMemo(() => {
    if (scoreResult.percentAnswered == null) return "";
    return generateDrivingAssessmentFeedbackSummary(scoreResult.percentAnswered);
  }, [scoreResult.percentAnswered]);

  const saving = createAssessment.isPending;
  const organizationName = organizationQuery.data?.name ?? "Driving School";

  async function submitAndGeneratePdf(values: DrivingAssessmentFormValues) {
    if (!selectedStudent) {
      Alert.alert("Select a student", "Please select a student first.");
      return;
    }

    try {
      const score = calculateDrivingAssessmentScore(values.scores);
      const assessmentDateISO = parseDateInputToISODate(values.date);
      if (!assessmentDateISO) {
        Alert.alert("Check the form", "Use DD/MM/YYYY for the assessment date.");
        return;
      }

      const assessment = await createAssessment.mutateAsync({
        organization_id: profile.organization_id,
        student_id: selectedStudent.id,
        instructor_id: selectedStudent.assigned_instructor_id,
        assessment_type: "driving_assessment",
        assessment_date: assessmentDateISO,
        total_score: score.percentAnswered,
        form_data: {
          ...values,
          totalScoreRaw: score.totalRaw,
          totalScorePercentAnswered: score.percentAnswered,
          totalScorePercentOverall: score.percentOverall,
          scoredCount: score.scoredCount,
          totalCriteriaCount: score.totalCriteriaCount,
          maxRaw: score.maxRaw,
          feedbackSummary,
          savedByUserId: userId,
        },
      });

      try {
        const fileName = `${selectedStudent.first_name} ${selectedStudent.last_name} ${dayjs(assessmentDateISO).format("DD-MM-YY")}`;
        const androidDirectoryUri =
          Platform.OS === "android"
            ? await ensureAndroidDownloadsDirectoryUri()
            : undefined;
        const saved = await exportDrivingAssessmentPdf({
          assessmentId: assessment.id,
          organizationName,
          fileName,
          androidDirectoryUri: androidDirectoryUri ?? undefined,
          criteria: drivingAssessmentCriteria,
          values: {
            ...values,
            totalScorePercent: score.percentAnswered,
            totalScoreRaw: score.totalRaw,
            feedbackSummary,
          },
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
                navigation.goBack();
              },
            },
            { text: "Done", onPress: () => navigation.goBack() },
          ],
        );
      } catch (error) {
        Alert.alert(
          "Saved, but couldn't generate the PDF",
          `The assessment was saved successfully.\n\n${toErrorMessage(error)}`,
        );
      }
    } catch (error) {
      Alert.alert("Couldn't submit assessment", toErrorMessage(error));
    }
  }

  function onInvalidSubmit(errors: FieldErrors<DrivingAssessmentFormValues>) {
    const message =
      errors.studentId?.message ||
      errors.date?.message ||
      errors.email?.message ||
      errors.issueDate?.message ||
      errors.expiryDate?.message ||
      "Please check the form and try again.";
    Alert.alert("Check the form", message);
  }

  return (
    <>
      <Screen scroll={false}>
      <ScrollView ref={scrollRef} contentContainerClassName="gap-4 pb-6">
        <AppStack gap="lg">
          <View>
            <AppText variant="title">Driving Assessment</AppText>
            <AppText className="mt-2" variant="body">
              {stage === "test"
                ? "Score criteria, record feedback, and export a PDF."
                : "Select a student and review their details before starting the test."}
            </AppText>
          </View>

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
              <View className={cn("items-center justify-center py-6", theme.text.base)}>
                <ActivityIndicator />
                <AppText className="mt-3 text-center" variant="body">
                  Loading students...
                </AppText>
              </View>
            ) : studentsQuery.isError ? (
              <AppStack gap="md">
                <AppText variant="error">{toErrorMessage(studentsQuery.error)}</AppText>
                <AppButton
                  label="Retry students"
                  variant="secondary"
                  icon={RefreshCw}
                  onPress={() => studentsQuery.refetch()}
                />
              </AppStack>
            ) : (
              <>
                {form.formState.errors.studentId?.message ? (
                  <AppText variant="error">
                    {form.formState.errors.studentId.message}
                  </AppText>
                ) : null}

                {stage === "details" ? (
                  <AssessmentStudentDropdown
                    students={studentsQuery.data ?? []}
                    selectedStudentId={selectedStudentId}
                    currentUserId={profile.id}
                    onSelectStudent={(student) => {
                      setSelectedStudentId(student.id);
                      form.setValue("studentId", student.id, { shouldValidate: true });
                      hydrateFromStudent(form, student);
                    }}
                  />
                ) : null}
              </>
            )}
          </AppCard>

          {stage !== "test" ? (
            <AppCard className="gap-4">
              <AppText variant="heading">Student Assessment details</AppText>

              {!selectedStudent ? (
                <AppText variant="caption">
                  Select a student to view their details.
                </AppText>
              ) : (
                <AppStack gap="sm">
                  <AppText variant="body">
                    Name: {selectedStudent.first_name} {selectedStudent.last_name}
                  </AppText>
                  <AppText variant="body">Email: {selectedStudent.email ?? ""}</AppText>
                  <AppText variant="body">Phone: {selectedStudent.phone ?? ""}</AppText>
                  <AppText variant="body">
                    Address: {selectedStudent.address ?? ""}
                  </AppText>
                  <AppText variant="body">
                    Licence number: {selectedStudent.license_number ?? ""}
                  </AppText>
                  <AppText variant="body">
                    Version: {selectedStudent.license_version ?? ""}
                  </AppText>
                  <AppText variant="body">
                    Class held: {selectedStudent.class_held ?? ""}
                  </AppText>
                  <AppText variant="body">
                    Issue date:{" "}
                    {selectedStudent.issue_date
                      ? formatIsoDateToDisplay(selectedStudent.issue_date)
                      : ""}
                  </AppText>
                  <AppText variant="body">
                    Expiry date:{" "}
                    {selectedStudent.expiry_date
                      ? formatIsoDateToDisplay(selectedStudent.expiry_date)
                      : ""}
                  </AppText>

                  <Controller
                    control={form.control}
                    name="date"
                    render={({ field, fieldState }) => (
                      <AppDateInput
                        label="Date of assessment"
                        value={field.value}
                        onChangeText={field.onChange}
                        error={fieldState.error?.message}
                      />
                    )}
                  />

                  <Controller
                    control={form.control}
                    name="instructor"
                    render={({ field }) => (
                      <AppInput
                        label="Instructor"
                        value={field.value}
                        onChangeText={field.onChange}
                      />
                    )}
                  />
                </AppStack>
              )}
            </AppCard>
          ) : null}

          {stage === "details" ? (
            <AppButton
              label="Start Test"
              disabled={!selectedStudent}
              icon={Play}
              onPress={() => setStartTestModalVisible(true)}
            />
          ) : null}

          {stage === "test" ? (
            <>
              <AppCard className="gap-3">
                <AppText variant="heading">Scores</AppText>
                <AppText variant="caption">
                  Tap a number for each criterion (1 = Unsatisfactory, 5 = Excellent). Use
                  N/A to leave a criterion unanswered.
                </AppText>
                <AppText variant="body">
                  Total:{" "}
                  {scoreResult.percentAnswered == null
                    ? "N/A"
                    : `${scoreResult.percentAnswered}% (${scoreResult.scoredCount} answered)`}
                </AppText>
                <AppText variant="caption">
                  {feedbackSummary
                    ? `Summary: ${feedbackSummary}`
                    : "Add scores to generate a summary."}
                </AppText>
              </AppCard>

              {(
                Object.keys(drivingAssessmentCriteria) as DrivingAssessmentCategoryKey[]
              ).map((category) => (
                <AppCard key={category} className="gap-4">
                  <AppText variant="heading">
                    {category
                      .replace(/([A-Z])/g, " $1")
                      .replace(/^./, (s) => s.toUpperCase())}
                  </AppText>

                  {drivingAssessmentCriteria[category].map((label, index) => (
                    <Controller
                      key={`${category}-${index}`}
                      control={form.control}
                      name={scoreFieldName(category, index)}
                      defaultValue="" // ✅ ensure Zod gets a string, not undefined
                      render={({ field }) => {
                        const currentValue = field.value ?? ""; // ✅ normalize for button variants

                        return (
                          <AppStack gap="sm">
                            <AppText variant="body">{label}</AppText>
                            <View className="flex-row gap-2">
                              {[1, 2, 3, 4, 5].map((value) => (
                                <AppButton
                                  key={value}
                                  width="auto"
                                  className="h-10 flex-1 px-0"
                                  label={String(value)}
                                  variant={
                                    currentValue === String(value)
                                      ? "primary"
                                      : "secondary"
                                  }
                                  onPress={() => field.onChange(String(value))}
                                />
                              ))}
                              <AppButton
                                width="auto"
                                className="h-10 flex-1 px-0"
                                label="N/A"
                                variant={currentValue === "" ? "primary" : "secondary"}
                                onPress={() => field.onChange("")}
                              />
                            </View>
                          </AppStack>
                        );
                      }}
                    />
                  ))}
                </AppCard>
              ))}

              <FeedbackField
                fieldKey="strengths"
                label="Strengths"
                value={form.watch("strengths")}
                onChangeText={(next) => form.setValue("strengths", next)}
                suggestions={drivingAssessmentFeedbackOptions.strengths.slice(0, 6)}
                suggestionsOpen={openSuggestions === "strengths"}
                onToggleSuggestions={onToggleSuggestions}
                onYLayout={onFeedbackYLayout}
              />

              <FeedbackField
                fieldKey="improvements"
                label="Improvements"
                value={form.watch("improvements")}
                onChangeText={(next) => form.setValue("improvements", next)}
                suggestions={drivingAssessmentFeedbackOptions.improvements.slice(0, 6)}
                suggestionsOpen={openSuggestions === "improvements"}
                onToggleSuggestions={onToggleSuggestions}
                onYLayout={onFeedbackYLayout}
              />

              <FeedbackField
                fieldKey="recommendation"
                label="Recommendation"
                value={form.watch("recommendation")}
                onChangeText={(next) => form.setValue("recommendation", next)}
                suggestions={drivingAssessmentFeedbackOptions.recommendation.slice(0, 6)}
                suggestionsOpen={openSuggestions === "recommendation"}
                onToggleSuggestions={onToggleSuggestions}
                onYLayout={onFeedbackYLayout}
              />

              <FeedbackField
                fieldKey="nextSteps"
                label="Next steps"
                value={form.watch("nextSteps")}
                onChangeText={(next) => form.setValue("nextSteps", next)}
                suggestions={drivingAssessmentFeedbackOptions.nextSteps.slice(0, 6)}
                suggestionsOpen={openSuggestions === "nextSteps"}
                onToggleSuggestions={onToggleSuggestions}
                onYLayout={onFeedbackYLayout}
              />

              {createAssessment.isError ? (
                <AppText variant="error">
                  {toErrorMessage(createAssessment.error)}
                </AppText>
              ) : null}

              <AppButton
                label={saving ? "Submitting..." : "Submit and generate PDF"}
                disabled={saving}
                icon={FileDown}
                onPress={form.handleSubmit(
                  (values) => {
                    Alert.alert(
                      "Submit assessment?",
                      "This will save the assessment and open your device share sheet to export the PDF.",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Submit",
                          onPress: () => void submitAndGeneratePdf(values),
                        },
                      ],
                    );
                  },
                  (errors) => onInvalidSubmit(errors),
                )}
              />
            </>
          ) : null}

          <AppButton
            label="Cancel"
            icon={X}
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </AppStack>
      </ScrollView>
      </Screen>

      <Modal
        visible={startTestModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStartTestModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/40 px-6 py-10"
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
                  icon={ArrowLeft}
                  onPress={() => setStartTestModalVisible(false)}
                />
                <AppButton
                  width="auto"
                  label="Start"
                  icon={Play}
                  disabled={!selectedStudent}
                  onPress={() => {
                    setStartTestModalVisible(false);
                    setStage("test");
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
