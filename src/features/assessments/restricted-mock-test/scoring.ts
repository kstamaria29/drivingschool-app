import {
  restrictedMockTestCriticalErrors,
  restrictedMockTestImmediateErrors,
  restrictedMockTestTaskItems,
  type RestrictedMockTestStageId,
  type RestrictedMockTestTaskItemId,
} from "./constants";

export type RestrictedMockTestTaskState = {
  items: Record<RestrictedMockTestTaskItemId, number>;
  location: string;
  notes: string;
  repetitions: number;
};

export type RestrictedMockTestStagesState = Record<
  RestrictedMockTestStageId,
  Record<string, RestrictedMockTestTaskState>
>;

export type RestrictedMockTestErrorCounts = Record<string, number>;

export type RestrictedMockTestSummary = {
  stage1Faults: number;
  stage2Faults: number;
  criticalTotal: number;
  immediateTotal: number;
  immediateList: string;
  resultText: string;
  resultTone: "danger" | "success";
};

export function calculateRestrictedMockTestSummary(input: {
  stagesState: RestrictedMockTestStagesState;
  critical: RestrictedMockTestErrorCounts;
  immediate: RestrictedMockTestErrorCounts;
}): RestrictedMockTestSummary {
  let stage1Faults = 0;
  let stage2Faults = 0;

  (["stage1", "stage2"] as const).forEach((stageId) => {
    const stageTasks = input.stagesState[stageId] ?? {};
    const isStage1 = stageId === "stage1";

    Object.values(stageTasks).forEach((taskState) => {
      if (!taskState?.items) return;

      restrictedMockTestTaskItems.forEach((taskItem) => {
        const count = taskState.items?.[taskItem.id] ?? 0;
        if (count <= 0) return;
        if (isStage1) stage1Faults += count;
        else stage2Faults += count;
      });
    });
  });

  const criticalTotal = restrictedMockTestCriticalErrors.reduce((sum, label) => {
    return sum + (input.critical[label] ?? 0);
  }, 0);

  const immediateTotal = restrictedMockTestImmediateErrors.reduce((sum, label) => {
    return sum + (input.immediate[label] ?? 0);
  }, 0);

  const immediateList = restrictedMockTestImmediateErrors
    .map((label) => {
      const count = input.immediate[label] ?? 0;
      return count > 0 ? `${label} (${count})` : null;
    })
    .filter(Boolean)
    .join("; ");

  if (immediateTotal > 0) {
    return {
      stage1Faults,
      stage2Faults,
      criticalTotal,
      immediateTotal,
      immediateList,
      resultText:
        "Automatic FAIL (immediate failure error recorded). Use notes for coaching and re-test planning.",
      resultTone: "danger",
    };
  }

  return {
    stage1Faults,
    stage2Faults,
    criticalTotal,
    immediateTotal,
    immediateList,
    resultText:
      "No immediate failure errors recorded. Use Stage 1 & 2 task faults and critical errors to decide readiness for the real test.",
    resultTone: "success",
  };
}

export function getRestrictedMockTestTaskFaults(task: RestrictedMockTestTaskState) {
  const faults: string[] = [];
  restrictedMockTestTaskItems.forEach((item) => {
    const count = task.items[item.id] ?? 0;
    if (count <= 0) return;
    faults.push(count > 1 ? `${item.label} (${count})` : item.label);
  });
  return faults;
}
