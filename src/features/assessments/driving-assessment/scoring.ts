import type { DrivingAssessmentCategoryKey } from "./constants";
import { drivingAssessmentCriteria } from "./constants";

export type DrivingAssessmentScoreResult = {
  totalRaw: number;
  scoredCount: number;
  totalCriteriaCount: number;
  maxRaw: number;
  percentAnswered: number | null;
  percentOverall: number | null;
};

export function calculateDrivingAssessmentScore(
  scores: Record<string, Record<string, string>> | undefined,
): DrivingAssessmentScoreResult {
  let totalRaw = 0;
  let scoredCount = 0;

  const totalCriteriaCount = (Object.keys(drivingAssessmentCriteria) as DrivingAssessmentCategoryKey[])
    .reduce((count, category) => count + drivingAssessmentCriteria[category].length, 0);

  for (const category of Object.keys(drivingAssessmentCriteria) as DrivingAssessmentCategoryKey[]) {
    const criteria = drivingAssessmentCriteria[category];
    for (let index = 0; index < criteria.length; index++) {
      const rawValue = scores?.[category]?.[String(index)] ?? "";
      const parsed = Number.parseInt(rawValue, 10);
      if (!Number.isFinite(parsed)) continue;
      if (parsed < 1 || parsed > 5) continue;
      totalRaw += parsed;
      scoredCount += 1;
    }
  }

  const maxRaw = totalCriteriaCount * 5;
  const percentAnswered =
    scoredCount > 0 ? Math.round((totalRaw / (scoredCount * 5)) * 100) : null;
  const percentOverall = scoredCount > 0 ? Math.round((totalRaw / maxRaw) * 100) : null;

  return { totalRaw, scoredCount, totalCriteriaCount, maxRaw, percentAnswered, percentOverall };
}

export function generateDrivingAssessmentFeedbackSummary(scorePercent: number) {
  if (scorePercent >= 90)
    return "Excellent: Outstanding readiness for solo driving. Keep maintaining this high standard.";
  if (scorePercent >= 80)
    return "Good: Strong driving skills with minor areas for improvement.";
  if (scorePercent >= 68)
    return "Competent: Keep practicing to reinforce core driving skills.";
  if (scorePercent >= 52)
    return "Needs Improvement: Focused practice required to improve consistency.";
  if (scorePercent >= 32)
    return "At Risk: More coaching and structured lessons recommended.";

  return "Significant Support Needed: A foundational skill set that needs further development.";
}

