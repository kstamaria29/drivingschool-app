import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { invalidateQueriesByKey } from "../../utils/query";
import {
  createLesson,
  deleteLesson,
  getLesson,
  listLessons,
  updateLesson,
  type LessonInsert,
  type LessonUpdate,
  type ListLessonsInput,
} from "./api";

export const lessonKeys = {
  list: (input: ListLessonsInput) => ["lessons", input] as const,
  detail: (lessonId: string) => ["lesson", { lessonId }] as const,
};

const lessonsRootKey = ["lessons"] as const;

function invalidateLessonListAndDetail(queryClient: QueryClient, lessonId: string) {
  return invalidateQueriesByKey(queryClient, [lessonsRootKey, lessonKeys.detail(lessonId)]);
}

export function useLessonsQuery(input: ListLessonsInput) {
  return useQuery({
    queryKey: lessonKeys.list(input),
    queryFn: () => listLessons(input),
  });
}

export function useLessonQuery(lessonId?: string) {
  return useQuery({
    queryKey: lessonId ? lessonKeys.detail(lessonId) : (["lesson", { lessonId: null }] as const),
    queryFn: () => getLesson(lessonId!),
    enabled: !!lessonId,
  });
}

export function useCreateLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: LessonInsert) => createLesson(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lessonsRootKey });
    },
  });
}

export function useUpdateLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, input }: { lessonId: string; input: LessonUpdate }) =>
      updateLesson(lessonId, input),
    onSuccess: async (lesson) => {
      await invalidateLessonListAndDetail(queryClient, lesson.id);
    },
  });
}

export function useDeleteLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (lessonId: string) => deleteLesson(lessonId),
    onSuccess: async (_data, lessonId) => {
      await invalidateLessonListAndDetail(queryClient, lessonId);
    },
  });
}
