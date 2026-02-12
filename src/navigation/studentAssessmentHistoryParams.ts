import type { Assessment } from "../features/assessments/api";

export type StudentAssessmentHistoryParams = {
  studentId: string;
  initialAssessmentType?: Assessment["assessment_type"];
};
