import dayjs from "dayjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { ActivityIndicator, Alert, Platform, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
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

  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

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
      weather: "",
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
    form.setValue("studentId", student.id, { shouldValidate: true });
    hydrateFromStudent(form, student);
  }, [form, route.params?.studentId, studentsQuery.data]);

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
            Select a student, score criteria, and record feedback.
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
                onPress={() => studentsQuery.refetch()}
              />
            </AppStack>
          ) : (
            <>
              {form.formState.errors.studentId?.message ? (
                <AppText variant="error">{form.formState.errors.studentId.message}</AppText>
              ) : null}

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
          )}
        </AppCard>

        <AppCard className="gap-4">
          <AppText variant="heading">Student & licence details</AppText>

          <Controller
            control={form.control}
            name="clientName"
            render={({ field }) => (
              <AppInput label="Client name" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field }) => (
              <AppInput label="Address" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="contact"
            render={({ field }) => (
              <AppInput label="Contact" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <AppInput
                label="Email"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="licenseNumber"
            render={({ field }) => (
              <AppInput label="Licence number" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="licenseVersion"
            render={({ field }) => (
              <AppInput label="Version" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="classHeld"
            render={({ field }) => (
              <AppInput label="Class held" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="issueDate"
            render={({ field, fieldState }) => (
              <AppInput
                label="Issue date (DD/MM/YYYY)"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="expiryDate"
            render={({ field, fieldState }) => (
              <AppInput
                label="Expiry date (DD/MM/YYYY)"
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="weather"
            render={({ field }) => (
              <AppInput label="Weather" value={field.value} onChangeText={field.onChange} />
            )}
          />

          <Controller
            control={form.control}
            name="date"
            render={({ field, fieldState }) => (
              <AppInput
                label="Date of assessment (DD/MM/YYYY)"
                autoCapitalize="none"
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
        </AppCard>

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

        <AppButton label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </AppStack>
    </Screen>
  );
}
