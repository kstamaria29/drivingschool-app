import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudentReminder,
  deleteStudentReminder,
  listStudentReminders,
  type ListStudentRemindersInput,
  type StudentReminderInsert,
} from "./api";

export const studentReminderKeys = {
  list: (input: ListStudentRemindersInput) => ["studentReminders", input] as const,
};

export function useStudentRemindersQuery(input?: ListStudentRemindersInput) {
  return useQuery({
    queryKey: input
      ? studentReminderKeys.list(input)
      : (["studentReminders", { studentId: null }] as const),
    queryFn: () => listStudentReminders(input!),
    enabled: !!input?.studentId,
  });
}

export function useCreateStudentReminderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StudentReminderInsert) => createStudentReminder(input),
    onSuccess: async (reminder) => {
      await queryClient.invalidateQueries({
        queryKey: studentReminderKeys.list({ studentId: reminder.student_id }),
      });
    },
  });
}

export function useDeleteStudentReminderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reminderId: string) => deleteStudentReminder(reminderId),
    onSuccess: async (reminder) => {
      await queryClient.invalidateQueries({
        queryKey: studentReminderKeys.list({ studentId: reminder.student_id }),
      });
    },
  });
}

