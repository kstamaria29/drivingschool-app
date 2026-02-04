import dayjs from "dayjs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppDivider } from "../../components/AppDivider";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { type Assessment } from "../../features/assessments/api";
import { useAssessmentsQuery, useDeleteAssessmentMutation } from "../../features/assessments/queries";
import { ensureAndroidDownloadsDirectoryUri } from "../../features/assessments/android-downloads";
import {
  drivingAssessmentCriteria,
  type DrivingAssessmentCategoryKey,
} from "../../features/assessments/driving-assessment/constants";
import { exportDrivingAssessmentPdf } from "../../features/assessments/driving-assessment/pdf";
import {
  calculateDrivingAssessmentScore,
  generateDrivingAssessmentFeedbackSummary,
} from "../../features/assessments/driving-assessment/scoring";
import { drivingAssessmentStoredDataSchema } from "../../features/assessments/driving-assessment/schema";
import { notifyPdfSaved } from "../../features/notifications/download-notifications";
import { useOrganizationQuery } from "../../features/organization/queries";
import { useStudentQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { DISPLAY_DATE_FORMAT, parseDateInputToISODate } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";
import { openPdfUri } from "../../utils/open-pdf";
import { useNavigationLayout } from "../useNavigationLayout";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentAssessmentHistory">;

type AssessmentType = Assessment["assessment_type"];

const assessmentTypes: Array<{ type: AssessmentType; label: string }> = [
  { type: "driving_assessment", label: "Driving Assessment" },
  { type: "second_assessment", label: "2nd Assessment" },
  { type: "third_assessment", label: "3rd Assessment" },
];

function formatCategoryTitle(category: string) {
  return category.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

function formatAssessmentDate(assessment: Assessment) {
  const raw = assessment.assessment_date ?? null;
  const parsed = raw ? dayjs(raw) : dayjs(assessment.created_at);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : "Unknown date";
}

function getDrivingAssessmentSummary(assessment: Assessment) {
  if (assessment.assessment_type !== "driving_assessment") return null;

  const parsed = drivingAssessmentStoredDataSchema.safeParse(assessment.form_data);
  if (parsed.success && parsed.data.feedbackSummary?.trim()) {
    return parsed.data.feedbackSummary.trim();
  }

  if (assessment.total_score == null) return null;
  return generateDrivingAssessmentFeedbackSummary(assessment.total_score);
}

function getDrivingAssessmentImprovements(assessment: Assessment) {
  if (assessment.assessment_type !== "driving_assessment") return null;
  const parsed = drivingAssessmentStoredDataSchema.safeParse(assessment.form_data);
  if (!parsed.success) return null;
  return parsed.data.improvements?.trim() ? parsed.data.improvements.trim() : null;
}

function ScoreChip({ score }: { score: number | null }) {
  if (score == null) return null;
  return (
    <View className="rounded-full border border-primary/30 bg-primary/15 px-3 py-1">
      <AppText className="text-primary" variant="caption">
        Total score: {score}
      </AppText>
    </View>
  );
}

export function StudentAssessmentHistoryScreen({ route }: Props) {
  const { studentId } = route.params;
  const { isTablet, isLandscape } = useNavigationLayout();
  const { profile } = useCurrentUser();

  const [assessmentType, setAssessmentType] = useState<AssessmentType>("driving_assessment");
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null);
  const [downloadingAssessmentId, setDownloadingAssessmentId] = useState<string | null>(null);
  const [deletingAssessmentId, setDeletingAssessmentId] = useState<string | null>(null);

  const studentQuery = useStudentQuery(studentId);
  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const assessmentsQuery = useAssessmentsQuery({ studentId, assessmentType });
  const deleteAssessmentMutation = useDeleteAssessmentMutation();

  const twoPane = isTablet && isLandscape;

  useEffect(() => {
    setSelectedAssessmentId(null);
  }, [assessmentType, studentId]);

  useEffect(() => {
    if (selectedAssessmentId) return;
    const first = assessmentsQuery.data?.[0];
    if (first) setSelectedAssessmentId(first.id);
  }, [assessmentsQuery.data, selectedAssessmentId]);

  const selectedAssessment = useMemo(() => {
    const list = assessmentsQuery.data ?? [];
    if (!selectedAssessmentId) return null;
    return list.find((a) => a.id === selectedAssessmentId) ?? null;
  }, [assessmentsQuery.data, selectedAssessmentId]);

  function onDeletePress(assessment: Assessment) {
    Alert.alert(
      "Delete assessment?",
      "This permanently deletes the assessment and cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => void deleteAssessment(assessment),
        },
      ],
    );
  }

  async function deleteAssessment(assessment: Assessment) {
    setDeletingAssessmentId(assessment.id);
    try {
      await deleteAssessmentMutation.mutateAsync(assessment.id);
      setSelectedAssessmentId(null);
    } catch (error) {
      Alert.alert("Couldn't delete assessment", toErrorMessage(error));
    } finally {
      setDeletingAssessmentId(null);
    }
  }

  async function onDownloadPdfPress(assessment: Assessment) {
    if (assessment.assessment_type !== "driving_assessment") {
      Alert.alert("Not available", "PDF export is only available for Driving Assessment.");
      return;
    }

    const student = studentQuery.data ?? null;
    if (!student) {
      Alert.alert("Couldn't load student", "Please try again once the student details are loaded.");
      return;
    }

    const parsed = drivingAssessmentStoredDataSchema.safeParse(assessment.form_data);
    if (!parsed.success) {
      Alert.alert(
        "Couldn't export PDF",
        "This assessment is missing required data. Try creating a new assessment.",
      );
      return;
    }

    const values = parsed.data;
    const score = calculateDrivingAssessmentScore(values.scores);
    const totalPercent = assessment.total_score ?? score.percentAnswered;
    const feedbackSummary =
      values.feedbackSummary?.trim() ||
      (totalPercent == null ? "" : generateDrivingAssessmentFeedbackSummary(totalPercent));

    const assessmentDateISO = parseDateInputToISODate(values.date) ?? values.date;
    const issueDateISO = values.issueDate ? parseDateInputToISODate(values.issueDate) : null;
    const expiryDateISO = values.expiryDate ? parseDateInputToISODate(values.expiryDate) : null;
    const fileName = `${student.first_name} ${student.last_name} ${dayjs(assessmentDateISO).format("DD-MM-YY")}`;
    const organizationName = organizationQuery.data?.name ?? "Driving School";

    setDownloadingAssessmentId(assessment.id);
    try {
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
          date: dayjs(assessmentDateISO).format(DISPLAY_DATE_FORMAT),
          issueDate: issueDateISO ? dayjs(issueDateISO).format(DISPLAY_DATE_FORMAT) : values.issueDate,
          expiryDate: expiryDateISO ? dayjs(expiryDateISO).format(DISPLAY_DATE_FORMAT) : values.expiryDate,
          totalScorePercent: totalPercent,
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
        "PDF saved",
        saved.savedTo === "downloads"
          ? "Saved to Downloads."
          : "Saved inside the app (your device may restrict global downloads).",
        [{ text: "Open", onPress: () => void openPdfUri(saved.uri) }, { text: "Done" }],
      );
    } catch (error) {
      Alert.alert("Couldn't export PDF", toErrorMessage(error));
    } finally {
      setDownloadingAssessmentId(null);
    }
  }

  const header = (
    <View>
      <AppText variant="title">Assessment History</AppText>
      {studentQuery.data ? (
        <AppText className="mt-2" variant="body">
          {studentQuery.data.first_name} {studentQuery.data.last_name}
        </AppText>
      ) : (
        <AppText className="mt-2" variant="body">
          Student assessments by type.
        </AppText>
      )}
    </View>
  );

  const tabs = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-2"
    >
      {assessmentTypes.map((tab) => (
        <AppButton
          key={tab.type}
          width="auto"
          variant={tab.type === assessmentType ? "primary" : "secondary"}
          label={tab.label}
          onPress={() => setAssessmentType(tab.type)}
        />
      ))}
    </ScrollView>
  );

  const listContent = assessmentsQuery.isPending ? (
    <View className={cn("items-center justify-center py-10", theme.text.base)}>
      <ActivityIndicator />
      <AppText className="mt-3 text-center" variant="body">
        Loading assessments...
      </AppText>
    </View>
  ) : assessmentsQuery.isError ? (
    <AppStack gap="md">
      <AppCard className="gap-2">
        <AppText variant="heading">Couldn't load assessments</AppText>
        <AppText variant="body">{toErrorMessage(assessmentsQuery.error)}</AppText>
      </AppCard>
      <AppButton label="Retry" onPress={() => assessmentsQuery.refetch()} />
    </AppStack>
  ) : (assessmentsQuery.data ?? []).length === 0 ? (
    <AppCard className="gap-2">
      <AppText variant="heading">No assessments yet</AppText>
      <AppText variant="body">
        Create a new assessment from the student profile to see it appear here.
      </AppText>
    </AppCard>
  ) : (
    <AppStack gap="sm">
      {(assessmentsQuery.data ?? []).map((assessment) => {
        const isSelected = assessment.id === selectedAssessmentId;
        const summary = getDrivingAssessmentSummary(assessment);
        const improvements = getDrivingAssessmentImprovements(assessment);

        return (
          <Pressable
            key={assessment.id}
            accessibilityRole="button"
            onPress={() => setSelectedAssessmentId(assessment.id)}
            className="w-full"
          >
            <AppCard
              className={cn(
                "gap-2",
                isSelected && "border-primary bg-primary/5",
                twoPane && "py-3",
              )}
            >
              <View className="flex-row items-center justify-between gap-3">
                <AppText variant="heading">{formatAssessmentDate(assessment)}</AppText>
                <AppText variant="caption">
                  Score: {assessment.total_score == null ? "—" : String(assessment.total_score)}
                </AppText>
              </View>

              {summary ? (
                <AppText numberOfLines={2} variant="caption">
                  {summary}
                </AppText>
              ) : null}
              {improvements ? (
                <AppText numberOfLines={2} variant="caption">
                  {improvements}
                </AppText>
              ) : null}
            </AppCard>
          </Pressable>
        );
      })}
    </AppStack>
  );

  function renderDetail(assessment: Assessment | null) {
    if (!assessment) {
      return (
        <AppCard className="gap-2">
          <AppText variant="heading">Select an assessment</AppText>
          <AppText variant="body">Tap an entry to view details.</AppText>
        </AppCard>
      );
    }

    if (assessment.assessment_type !== "driving_assessment") {
      return (
        <AppStack gap="md">
          <AppCard className="gap-2">
            <AppText variant="heading">Assessment on {formatAssessmentDate(assessment)}</AppText>
            <AppText variant="body">This assessment type doesn't have a detailed view yet.</AppText>
          </AppCard>

          <AppButton
            variant="danger"
            label={deletingAssessmentId === assessment.id ? "Deleting..." : "Delete assessment"}
            disabled={deletingAssessmentId === assessment.id}
            onPress={() => onDeletePress(assessment)}
          />
        </AppStack>
      );
    }

    const parsed = drivingAssessmentStoredDataSchema.safeParse(assessment.form_data);
    if (!parsed.success) {
      return (
        <AppCard className="gap-2">
          <AppText variant="heading">Couldn't read assessment</AppText>
          <AppText variant="body">
            This assessment is missing required data, so it can't be displayed.
          </AppText>
        </AppCard>
      );
    }

    const values = parsed.data;
    const score = calculateDrivingAssessmentScore(values.scores);
    const totalPercent = assessment.total_score ?? score.percentAnswered;
    const feedbackSummary =
      values.feedbackSummary?.trim() ||
      (totalPercent == null ? "" : generateDrivingAssessmentFeedbackSummary(totalPercent));

    return (
      <AppStack gap="md">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <AppText variant="heading">Assessment on {formatAssessmentDate(assessment)}</AppText>
            <AppText className="mt-1" variant="caption">
              Instructor: {values.instructor || "—"}
            </AppText>
          </View>

          <ScoreChip score={totalPercent} />
        </View>

        <AppButton
          width="auto"
          label={downloadingAssessmentId === assessment.id ? "Saving PDF..." : "Download PDF"}
          disabled={downloadingAssessmentId === assessment.id || deletingAssessmentId === assessment.id}
          onPress={() => void onDownloadPdfPress(assessment)}
        />

        <AppDivider />

        <View className="flex-row flex-wrap gap-4">
          <View className="min-w-56 flex-1 gap-2">
            <AppText variant="label">Feedback summary</AppText>
            <AppText variant="body">{feedbackSummary || "—"}</AppText>
          </View>

          <View className="min-w-56 flex-1 gap-2">
            <AppText variant="label">Strengths</AppText>
            <AppText variant="body">{values.strengths?.trim() ? values.strengths.trim() : "—"}</AppText>
          </View>

          <View className="min-w-56 flex-1 gap-2">
            <AppText variant="label">Improvements</AppText>
            <AppText variant="body">
              {values.improvements?.trim() ? values.improvements.trim() : "—"}
            </AppText>
          </View>

          <View className="min-w-56 flex-1 gap-2">
            <AppText variant="label">Recommendation</AppText>
            <AppText variant="body">
              {values.recommendation?.trim() ? values.recommendation.trim() : "—"}
            </AppText>
          </View>

          <View className="min-w-56 flex-1 gap-2">
            <AppText variant="label">Next steps</AppText>
            <AppText variant="body">{values.nextSteps?.trim() ? values.nextSteps.trim() : "—"}</AppText>
          </View>
        </View>

        <AppDivider />

        <AppText variant="heading">Scores by criteria</AppText>

        {(Object.keys(drivingAssessmentCriteria) as DrivingAssessmentCategoryKey[]).map((category) => {
          const criteria = drivingAssessmentCriteria[category];
          const categoryScores = values.scores?.[category];

          return (
            <AppCard key={category} className="gap-3">
              <AppText variant="heading">{formatCategoryTitle(category)}</AppText>

              {criteria.map((label, index) => {
                const raw =
                  (Array.isArray(categoryScores)
                    ? categoryScores[index]
                    : (categoryScores as Record<string, string> | undefined)?.[String(index)]) ?? "";
                const scoreText = raw?.trim() ? raw.trim() : "—";

                return (
                  <View key={`${category}-${index}`} className="flex-row items-start justify-between gap-3">
                    <AppText className="flex-1" variant="body">
                      {label}
                    </AppText>
                    <View className="min-w-9 items-center rounded-lg border border-border bg-background px-2 py-1">
                      <AppText variant="caption">{scoreText}</AppText>
                    </View>
                  </View>
                );
              })}
            </AppCard>
          );
        })}

        <AppDivider />

        <AppButton
          variant="danger"
          label={deletingAssessmentId === assessment.id ? "Deleting..." : "Delete assessment"}
          disabled={deletingAssessmentId === assessment.id || downloadingAssessmentId === assessment.id}
          onPress={() => onDeletePress(assessment)}
        />
      </AppStack>
    );
  }

  const content = twoPane ? (
    <View className="flex-1 flex-row gap-4">
      <ScrollView className="w-80" contentContainerClassName="gap-3 pb-6">
        {listContent}
      </ScrollView>

      <ScrollView className="flex-1" contentContainerClassName="gap-4 pb-6">
        {renderDetail(selectedAssessment)}
      </ScrollView>
    </View>
  ) : (
    <AppStack gap="lg">
      {listContent}
      {renderDetail(selectedAssessment)}
    </AppStack>
  );

  return (
    <Screen scroll={!twoPane} className={cn(twoPane && "max-w-6xl")}>
      <AppStack gap="lg" className={cn(twoPane && "flex-1")}>
        {header}
        {tabs}
        {studentQuery.isError ? (
          <AppCard className="gap-2">
            <AppText variant="heading">Couldn't load student</AppText>
            <AppText variant="body">{toErrorMessage(studentQuery.error)}</AppText>
          </AppCard>
        ) : null}
        {content}
      </AppStack>
    </Screen>
  );
}
