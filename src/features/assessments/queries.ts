import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAssessment,
  deleteAssessment,
  listAssessments,
  type AssessmentInsert,
  type ListAssessmentsInput,
} from "./api";

export const assessmentKeys = {
  list: (input: ListAssessmentsInput) => ["assessments", input] as const,
};

export function useAssessmentsQuery(input: ListAssessmentsInput) {
  return useQuery({
    queryKey: assessmentKeys.list(input),
    queryFn: () => listAssessments(input),
  });
}

export function useCreateAssessmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AssessmentInsert) => createAssessment(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useDeleteAssessmentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (assessmentId: string) => deleteAssessment(assessmentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}
