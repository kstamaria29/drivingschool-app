import {
  fullLicenseMockTestAssessmentItems,
  fullLicenseMockTestHazardCategories,
  fullLicenseMockTestHazardDirections,
  fullLicenseMockTestHazardLayout,
  fullLicenseMockTestCriticalErrors,
  fullLicenseMockTestImmediateErrors,
  type FullLicenseMockTestAssessmentItemId,
  type FullLicenseMockTestHazardCategory,
  type FullLicenseMockTestHazardDirection,
  type FullLicenseMockTestHazardResponse,
} from "./constants";

export type FullLicenseMockTestItemValue = "P" | "F";

export type FullLicenseMockTestHazardResponses = Record<
  FullLicenseMockTestHazardCategory,
  Record<FullLicenseMockTestHazardDirection, FullLicenseMockTestHazardResponse>
>;

export type FullLicenseMockTestAttempt = {
  id: string;
  createdAt: string;
  taskId: string;
  taskName: string;
  variant: string;
  repIndex: number;
  repTarget: number;
  items: Record<FullLicenseMockTestAssessmentItemId, FullLicenseMockTestItemValue>;
  hazardResponses: FullLicenseMockTestHazardResponses;
  hazardsSpoken: string;
  actionsSpoken: string;
  notes: string;
  locationTag: string;
};

export type FullLicenseMockTestErrorCounts = Record<string, number>;

export type FullLicenseMockTestReadinessLabel =
  | "NOT READY"
  | "NEEDS COACHING"
  | "IN PROGRESS"
  | "LOOKING GOOD";

export type FullLicenseMockTestReadiness = { label: FullLicenseMockTestReadinessLabel; reason: string };

export type FullLicenseMockTestSummary = {
  attemptsCount: number;
  totalItemChecks: number;
  totalItemFails: number;
  scorePercent: number | null;
  failuresByItem: Record<FullLicenseMockTestAssessmentItemId, number>;
  criticalTotal: number;
  immediateTotal: number;
  readiness: FullLicenseMockTestReadiness;
};

export function createFullLicenseMockTestEmptyItems(): Record<
  FullLicenseMockTestAssessmentItemId,
  FullLicenseMockTestItemValue
> {
  return fullLicenseMockTestAssessmentItems.reduce((acc, item) => {
    acc[item.id] = "P";
    return acc;
  }, {} as Record<FullLicenseMockTestAssessmentItemId, FullLicenseMockTestItemValue>);
}

export function createFullLicenseMockTestEmptyHazardResponses(): FullLicenseMockTestHazardResponses {
  return fullLicenseMockTestHazardCategories.reduce((categoryAcc, category) => {
    const directionMap = fullLicenseMockTestHazardDirections.reduce((directionAcc, direction) => {
      directionAcc[direction] = "na";
      return directionAcc;
    }, {} as Record<FullLicenseMockTestHazardDirection, FullLicenseMockTestHazardResponse>);

    categoryAcc[category] = directionMap;
    return categoryAcc;
  }, {} as FullLicenseMockTestHazardResponses);
}

export function hasFullLicenseMockTestHazardResponse(
  responses: FullLicenseMockTestHazardResponses,
): boolean {
  return fullLicenseMockTestHazardCategories.some((category) =>
    fullLicenseMockTestHazardLayout[category].some(
      (direction) => responses[category][direction] !== "na",
    ),
  );
}

export function scoreFullLicenseMockTestAttempt(attempt: Pick<FullLicenseMockTestAttempt, "items">) {
  const fails = fullLicenseMockTestAssessmentItems.reduce((acc, item) => {
    return acc + (attempt.items[item.id] === "F" ? 1 : 0);
  }, 0);

  return { fails, total: fullLicenseMockTestAssessmentItems.length };
}

export function calculateFullLicenseMockTestSummary(input: {
  attempts: FullLicenseMockTestAttempt[];
  critical: FullLicenseMockTestErrorCounts;
  immediate: FullLicenseMockTestErrorCounts;
}): FullLicenseMockTestSummary {
  const failuresByItem = fullLicenseMockTestAssessmentItems.reduce(
    (acc, item) => {
      acc[item.id] = 0;
      return acc;
    },
    {} as Record<FullLicenseMockTestAssessmentItemId, number>,
  );

  let totalItemFails = 0;

  input.attempts.forEach((attempt) => {
    fullLicenseMockTestAssessmentItems.forEach((item) => {
      if (attempt.items[item.id] !== "F") return;
      failuresByItem[item.id] += 1;
      totalItemFails += 1;
    });
  });

  const totalItemChecks = input.attempts.length * fullLicenseMockTestAssessmentItems.length;
  const scorePercent =
    totalItemChecks === 0 ? null : Math.round(((totalItemChecks - totalItemFails) / totalItemChecks) * 100);

  const criticalTotal = fullLicenseMockTestCriticalErrors.reduce((sum, label) => {
    return sum + (input.critical[label] ?? 0);
  }, 0);

  const immediateTotal = fullLicenseMockTestImmediateErrors.reduce((sum, label) => {
    return sum + (input.immediate[label] ?? 0);
  }, 0);

  const readiness = calculateFullLicenseMockTestReadiness({
    attemptsCount: input.attempts.length,
    criticalTotal,
    immediateTotal,
    failuresByItem,
  });

  return {
    attemptsCount: input.attempts.length,
    totalItemChecks,
    totalItemFails,
    scorePercent: immediateTotal > 0 ? 0 : scorePercent,
    failuresByItem,
    criticalTotal,
    immediateTotal,
    readiness,
  };
}

export function calculateFullLicenseMockTestReadiness(input: {
  attemptsCount: number;
  criticalTotal: number;
  immediateTotal: number;
  failuresByItem: Record<FullLicenseMockTestAssessmentItemId, number>;
}): FullLicenseMockTestReadiness {
  if (input.immediateTotal > 0) {
    return { label: "NOT READY", reason: "Immediate failure recorded." };
  }

  if (input.criticalTotal >= 2) {
    return { label: "NOT READY", reason: "Repeated critical errors recorded." };
  }

  const biggestItemFail = Math.max(...Object.values(input.failuresByItem));
  if (biggestItemFail >= 3) {
    return { label: "NEEDS COACHING", reason: "Repeated errors in a core assessment item." };
  }

  if (input.attemptsCount < 4) {
    return { label: "IN PROGRESS", reason: "Not enough attempts recorded yet." };
  }

  return { label: "LOOKING GOOD", reason: "No major error patterns detected." };
}
