import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { Pressable, View } from "react-native";
import { ClipboardCheck, ClipboardList, ClipboardPen, RefreshCw } from "lucide-react-native";

import { CenteredLoadingState, ErrorStateCard } from "../../components/AsyncState";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import type { AssessmentWithStudent, Assessment } from "../../features/assessments/api";
import { useRecentAssessmentsQuery } from "../../features/assessments/queries";
import {
  calculateFullLicenseMockTestSummary,
  type FullLicenseMockTestAttempt,
} from "../../features/assessments/full-license-mock-test/scoring";
import { fullLicenseMockTestStoredDataSchema } from "../../features/assessments/full-license-mock-test/schema";
import { calculateRestrictedMockTestSummary } from "../../features/assessments/restricted-mock-test/scoring";
import { restrictedMockTestStoredDataSchema } from "../../features/assessments/restricted-mock-test/schema";
import { normalizeStudentOrganization } from "../../features/students/constants";
import { DISPLAY_DATE_FORMAT } from "../../utils/dates";
import { toErrorMessage } from "../../utils/errors";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "AssessmentsMain">;
type AssessmentType = Assessment["assessment_type"];

const assessmentTypeLabels: Record<AssessmentType, string> = {
  driving_assessment: "Driving Assessment",
  second_assessment: "Mock Test - Restricted Licence",
  third_assessment: "Mock Test - Full License",
};

function getAssessmentTypeLabel(type: AssessmentType) {
  return assessmentTypeLabels[type] ?? "Assessment";
}

function getStudentName(assessment: AssessmentWithStudent) {
  const student = assessment.students ?? null;
  if (!student) return "Unknown student";
  return `${student.first_name} ${student.last_name}`.trim() || "Unknown student";
}

function getStudentOrganizationName(assessment: AssessmentWithStudent) {
  const student = assessment.students ?? null;
  if (!student) return "Unknown organization";
  const organization = normalizeStudentOrganization(student.organization_name ?? "");
  return organization || "Unknown organization";
}

function getStudentNameWithOrganization(assessment: AssessmentWithStudent) {
  return `${getStudentName(assessment)} (${getStudentOrganizationName(assessment)})`;
}

function formatAssessmentDate(assessment: AssessmentWithStudent) {
  const raw = assessment.assessment_date ?? assessment.created_at;
  const parsed = dayjs(raw);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : "Unknown date";
}

function getAssessmentResultSummary(assessment: AssessmentWithStudent) {
  if (assessment.assessment_type === "driving_assessment") {
    if (assessment.total_score == null) return null;
    return `Score: ${assessment.total_score}%`;
  }

  if (assessment.assessment_type === "second_assessment") {
    const parsed = restrictedMockTestStoredDataSchema.safeParse(assessment.form_data);
    if (!parsed.success) return null;

    const values = parsed.data;
    const computed = calculateRestrictedMockTestSummary({
      stagesState: values.stagesState,
      critical: values.critical,
      immediate: values.immediate,
    });
    const summary = values.summary ? { ...computed, ...values.summary } : computed;

    if ((summary.immediateTotal ?? 0) > 0) {
      return `Result: FAIL - Immediate errors: ${summary.immediateTotal ?? 0}`;
    }

    const stageFaults = (summary.stage1Faults ?? 0) + (summary.stage2Faults ?? 0);
    return `Result: No immediate fail - Critical: ${summary.criticalTotal ?? 0} - Faults: ${stageFaults}`;
  }

  if (assessment.assessment_type === "third_assessment") {
    const parsed = fullLicenseMockTestStoredDataSchema.safeParse(assessment.form_data);
    if (!parsed.success) return null;

    const values = parsed.data;
    const computed = calculateFullLicenseMockTestSummary({
      attempts: (values.attempts ?? []) as unknown as FullLicenseMockTestAttempt[],
      critical: values.critical || {},
      immediate: values.immediate || {},
    });

    const readiness = values.summary?.readinessLabel ?? computed.readiness.label;
    const score = computed.scorePercent == null ? "-" : `${computed.scorePercent}%`;
    return `Readiness: ${readiness} - Score: ${score} - Attempts: ${computed.attemptsCount}`;
  }

  return null;
}

export function AssessmentsListScreen({ navigation }: Props) {
  const { isSidebar, isCompact } = useNavigationLayout();
  const recentAssessmentsQuery = useRecentAssessmentsQuery({ limit: 5 });

  const drivingCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-3"}>
      <AppText variant="heading">Driving Assessment</AppText>
      <AppText variant="body">
        Score key driving competencies, record feedback, and export a PDF summary.
      </AppText>
      <AppButton
        width="auto"
        label="Start Driving Assessment"
        icon={ClipboardCheck}
        onPress={() => navigation.navigate("DrivingAssessment")}
      />
    </AppCard>
  );

  const restrictedCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-2"}>
      <AppText variant="heading">Mock Test - Restricted Licence</AppText>
      <AppText variant="body">
        Structured mock test with Stage 1 & Stage 2 tasks, critical errors, immediate-fail errors,
        and PDF export.
      </AppText>
      <AppButton
        width="auto"
        label="Start Restricted Mock Test"
        icon={ClipboardList}
        onPress={() => navigation.navigate("RestrictedMockTest")}
      />
    </AppCard>
  );

  const fullCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-2"}>
      <AppText variant="heading">Mock Test - Full License</AppText>
      <AppText variant="body">
        Full License mock test with assessable tasks, hazards spoken, critical/immediate errors,
        and PDF export.
      </AppText>
      <AppButton
        width="auto"
        label="Start Full License Mock Test"
        icon={ClipboardPen}
        onPress={() => navigation.navigate("FullLicenseMockTest")}
      />
    </AppCard>
  );

  const recentAssessmentsCard = (
    <AppCard className="gap-3">
      <AppText variant="heading">Last 5 Assessments</AppText>

      {recentAssessmentsQuery.isPending ? (
        <CenteredLoadingState label="Loading recent assessments..." className="py-6" />
      ) : recentAssessmentsQuery.isError ? (
        <ErrorStateCard
          title="Couldn't load recent assessments"
          message={toErrorMessage(recentAssessmentsQuery.error)}
          onRetry={() => recentAssessmentsQuery.refetch()}
          retryIcon={RefreshCw}
          retryVariant="secondary"
          retryPlacement="inside"
        />
      ) : (recentAssessmentsQuery.data?.length ?? 0) === 0 ? (
        <AppText variant="body">No assessments recorded yet.</AppText>
      ) : (
        <AppStack gap="sm">
          {(recentAssessmentsQuery.data ?? []).map((assessment) => {
            const summary = getAssessmentResultSummary(assessment);
            return (
              <Pressable
                key={assessment.id}
                accessibilityRole="button"
                onPress={() =>
                  navigation.navigate("StudentAssessmentHistory", {
                    studentId: assessment.student_id,
                    initialAssessmentType: assessment.assessment_type,
                  })
                }
                className="rounded-xl border border-border bg-card px-4 py-3 dark:border-borderDark dark:bg-cardDark"
              >
                <View className="flex-row items-start justify-between gap-3">
                  <AppText className="flex-1" variant="label">
                    {getStudentNameWithOrganization(assessment)}
                  </AppText>
                  <AppText variant="caption">{formatAssessmentDate(assessment)}</AppText>
                </View>
                <AppText className="mt-1" variant="body">
                  {getAssessmentTypeLabel(assessment.assessment_type)}
                </AppText>
                {summary ? (
                  <AppText className="mt-1" variant="caption">
                    {summary}
                  </AppText>
                ) : null}
              </Pressable>
            );
          })}
        </AppStack>
      )}
    </AppCard>
  );

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Assessments</AppText>
          <AppText className="mt-2" variant="body">
            Create and export structured student assessments.
          </AppText>
        </View>

        {isSidebar ? (
          <>
            <View className="flex-row flex-wrap gap-6">
              {drivingCard}
              {restrictedCard}
              {fullCard}
            </View>
            {recentAssessmentsCard}
          </>
        ) : (
          <>
            {drivingCard}
            {restrictedCard}
            {fullCard}
            {recentAssessmentsCard}
          </>
        )}
      </AppStack>
    </Screen>
  );
}

