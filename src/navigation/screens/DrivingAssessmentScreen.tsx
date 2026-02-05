import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { ActivityIndicator, Alert, Platform, View } from "react-native";
import { ArrowLeft, FileDown, Play, RefreshCw, Users, X } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDateInput } from "../../components/AppDateInput";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { useCreateAssessmentMutation } from "../../features/assessments/queries";
import { drivingAssessmentCriteria, drivingAssessmentFeedbackOptions } from "../../features/assessments/driving-assessment/constants";
import { exportDrivingAssessmentPdf } from "../../features/assessments/driving-assessment/pdf";
import { calculateDrivingAssessmentScore, generateDrivingAssessmentFeedbackSummary } from "../../features/assessments/driving-assessment/scoring";
import { drivingAssessmentFormSchema, type DrivingAssessmentFormValues } from "../../features/assessments/driving-assessment/schema";
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
import { openPdfUri } from "../../utils/open-pdf";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "DrivingAssessment">;

type DrivingAssessmentStage = "details" | "confirm" | "test";

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
  form.setValue("issueDate", student.issue_date ? formatIsoDateToDisplay(student.issue_date) : "");
  form.setValue("expiryDate", student.expiry_date ? formatIsoDateToDisplay(student.expiry_date) : "");
}

function FeedbackField({
  label,
  value,
  onChangeText,
  suggestions,
}: {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  suggestions: readonly string[];
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  return (
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
        label={showSuggestions ? "Hide suggestions" : "Show suggestions"}
        onPress={() => setShowSuggestions((s) => !s)}
      />

      {showSuggestions ? (
        <AppStack gap="sm">
          {suggestions.map((option) => (
            <AppButton
              key={option}
              variant="secondary"
              label={option}
              onPress={() => onChangeText(option)}
            />
          ))}
        </AppStack>
      ) : null}
    </AppCard>
  );
}

export function DrivingAssessmentScreen({ navigation, route }: Props) {
  const { profile, userId } = useCurrentUser();

  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const studentsQuery = useStudentsQuery({ archived: false });
  const createAssessment = useCreateAssessmentMutation();

  const [stage, setStage] = useState<DrivingAssessmentStage>("details");
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(() => !route.params?.studentId);

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
      instructor: profile.display_name,
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
    const initialStudentId = route.params?.studentId ?? null;
    if (!initialStudentId) return;
    if (!studentsQuery.data) return;
    const student = studentsQuery.data.find((s) => s.id === initialStudentId);
    if (!student) return;
    setSelectedStudentId(student.id);
    setShowStudentPicker(false);
    form.setValue("studentId", student.id, { shouldValidate: true });
    hydrateFromStudent(form, student);
  }, [form, route.params?.studentId, studentsQuery.data]);

  useEffect(() => {
    setStage("details");
  }, [selectedStudentId]);

  const studentOptions = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    const all = studentsQuery.data ?? [];
    if (!needle) return all;
    return all.filter((s) => {
      const fullName = `${s.first_name} ${s.last_name}`.toLowerCase();
      const email = (s.email ?? "").toLowerCase();
      const phone = (s.phone ?? "").toLowerCase();
      return fullName.includes(needle) || email.includes(needle) || phone.includes(needle);
    });
  }, [studentSearch, studentsQuery.data]);

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
          Platform.OS === "android" ? await ensureAndroidDownloadsDirectoryUri() : undefined;
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
    <Screen scroll>
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
          <AppText variant="heading">Student</AppText>

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
                <AppText variant="error">{form.formState.errors.studentId.message}</AppText>
              ) : null}

              {selectedStudent ? (
                <AppStack gap="sm">
                  <AppText variant="body">
                    Selected: {selectedStudent.first_name} {selectedStudent.last_name}
                  </AppText>
                  {stage === "details" ? (
                    <AppButton
                      width="auto"
                      variant="ghost"
                      label={showStudentPicker ? "Hide student list" : "Change student"}
                      icon={Users}
                      onPress={() => setShowStudentPicker((s) => !s)}
                    />
                  ) : null}
                </AppStack>
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
                            hydrateFromStudent(form, student);
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

        {stage !== "test" ? (
          <AppCard className="gap-4">
            <AppText variant="heading">Student Assessment details</AppText>

            {!selectedStudent ? (
              <AppText variant="caption">Select a student to view their details.</AppText>
            ) : (
              <AppStack gap="sm">
                <AppText variant="body">
                  Name: {selectedStudent.first_name} {selectedStudent.last_name}
                </AppText>
                <AppText variant="body">Email: {selectedStudent.email ?? ""}</AppText>
                <AppText variant="body">Phone: {selectedStudent.phone ?? ""}</AppText>
                <AppText variant="body">Address: {selectedStudent.address ?? ""}</AppText>
                <AppText variant="body">Licence number: {selectedStudent.license_number ?? ""}</AppText>
                <AppText variant="body">Version: {selectedStudent.license_version ?? ""}</AppText>
                <AppText variant="body">Class held: {selectedStudent.class_held ?? ""}</AppText>
                <AppText variant="body">
                  Issue date:{" "}
                  {selectedStudent.issue_date ? formatIsoDateToDisplay(selectedStudent.issue_date) : ""}
                </AppText>
                <AppText variant="body">
                  Expiry date:{" "}
                  {selectedStudent.expiry_date ? formatIsoDateToDisplay(selectedStudent.expiry_date) : ""}
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
                    <AppInput label="Instructor" value={field.value} onChangeText={field.onChange} />
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
            onPress={() => setStage("confirm")}
          />
        ) : null}

        {stage === "confirm" ? (
          <AppCard className="gap-3">
            <AppText variant="heading">Start test?</AppText>
            <AppText variant="body">
              {selectedStudent
                ? `You're about to start scoring ${selectedStudent.first_name} ${selectedStudent.last_name}.`
                : "Select a student first."}
            </AppText>
            <AppStack gap="sm">
              <AppButton
                width="auto"
                variant="secondary"
                label="Back"
                icon={ArrowLeft}
                onPress={() => setStage("details")}
              />
              <AppButton
                width="auto"
                label="Start"
                icon={Play}
                disabled={!selectedStudent}
                onPress={() => setStage("test")}
              />
            </AppStack>
          </AppCard>
        ) : null}

        {stage === "test" ? (
          <>
            <AppCard className="gap-3">
              <AppText variant="heading">Scores</AppText>
              <AppText variant="caption">
                Tap a number for each criterion (1 = Unsatisfactory, 5 = Excellent).
              </AppText>
              <AppText variant="body">
                Total:{" "}
                {scoreResult.percentAnswered == null
                  ? "N/A"
                  : `${scoreResult.percentAnswered}% (scored ${scoreResult.scoredCount}/${scoreResult.totalCriteriaCount})`}
              </AppText>
              <AppText variant="caption">
                {feedbackSummary ? `Summary: ${feedbackSummary}` : "Add scores to generate a summary."}
              </AppText>
            </AppCard>

            {(Object.keys(drivingAssessmentCriteria) as Array<keyof typeof drivingAssessmentCriteria>).map(
              (category) => (
                <AppCard key={category} className="gap-4">
                  <AppText variant="heading">
                    {category.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase())}
                  </AppText>

                  {drivingAssessmentCriteria[category].map((label, index) => (
                    <Controller
                      key={`${category}-${index}`}
                      control={form.control}
                      name={`scores.${category}.${index}` as any}
                      render={({ field }) => (
                        <AppStack gap="sm">
                          <AppText variant="body">{label}</AppText>
                          <View className="flex-row gap-2">
                            {[1, 2, 3, 4, 5].map((value) => (
                              <AppButton
                                key={value}
                                width="auto"
                                className="h-10 flex-1 px-0"
                                label={String(value)}
                                variant={field.value === String(value) ? "primary" : "secondary"}
                                onPress={() => field.onChange(String(value))}
                              />
                            ))}
                          </View>
                        </AppStack>
                      )}
                    />
                  ))}
                </AppCard>
              ),
            )}

            <FeedbackField
              label="Strengths"
              value={form.watch("strengths")}
              onChangeText={(next) => form.setValue("strengths", next)}
              suggestions={drivingAssessmentFeedbackOptions.strengths}
            />

            <FeedbackField
              label="Improvements"
              value={form.watch("improvements")}
              onChangeText={(next) => form.setValue("improvements", next)}
              suggestions={drivingAssessmentFeedbackOptions.improvements}
            />

            <FeedbackField
              label="Recommendation"
              value={form.watch("recommendation")}
              onChangeText={(next) => form.setValue("recommendation", next)}
              suggestions={drivingAssessmentFeedbackOptions.recommendation}
            />

            <FeedbackField
              label="Next steps"
              value={form.watch("nextSteps")}
              onChangeText={(next) => form.setValue("nextSteps", next)}
              suggestions={drivingAssessmentFeedbackOptions.nextSteps}
            />

            {createAssessment.isError ? (
              <AppText variant="error">{toErrorMessage(createAssessment.error)}</AppText>
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
                      { text: "Submit", onPress: () => void submitAndGeneratePdf(values) },
                    ],
                  );
                },
                (errors) => onInvalidSubmit(errors),
              )}
            />
          </>
        ) : null}

        <AppButton label="Cancel" icon={X} variant="ghost" onPress={() => navigation.goBack()} />
      </AppStack>
    </Screen>
  );
}
