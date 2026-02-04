import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLesson,
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
      await queryClient.invalidateQueries({ queryKey: ["lessons"] });
    },
  });
}

export function useUpdateLessonMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ lessonId, input }: { lessonId: string; input: LessonUpdate }) =>
      updateLesson(lessonId, input),
    onSuccess: async (lesson) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["lessons"] }),
        queryClient.invalidateQueries({ queryKey: lessonKeys.detail(lesson.id) }),
      ]);
    },
  });
}

