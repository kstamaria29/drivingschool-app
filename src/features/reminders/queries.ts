import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudentReminder,
  deleteStudentReminder,
  listStudentReminders,
  listRemindersByDateRange,
  listUpcomingReminders,
  updateStudentReminder,
  type ListRemindersByDateRangeInput,
  type ListUpcomingRemindersInput,
  type ListStudentRemindersInput,
  type StudentReminderInsert,
  type StudentReminderUpdate,
} from "./api";

export const studentReminderKeys = {
  list: (input: ListStudentRemindersInput) => ["studentReminders", input] as const,
  range: (input: ListRemindersByDateRangeInput) => ["studentReminders", "range", input] as const,
  upcoming: (input: ListUpcomingRemindersInput) => ["studentReminders", "upcoming", input] as const,
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

export function useUpcomingRemindersQuery(input?: ListUpcomingRemindersInput) {
  return useQuery({
    queryKey: input
      ? studentReminderKeys.upcoming(input)
      : (["studentReminders", "upcoming", { instructorId: null, fromISODate: null }] as const),
    queryFn: () => listUpcomingReminders(input!),
    enabled: Boolean(input?.instructorId) && Boolean(input?.fromISODate),
  });
}

export function useRemindersByDateRangeQuery(input?: ListRemindersByDateRangeInput) {
  return useQuery({
    queryKey: input
      ? studentReminderKeys.range(input)
      : (["studentReminders", "range", { fromISODate: null, toISODate: null }] as const),
    queryFn: () => listRemindersByDateRange(input!),
    enabled: Boolean(input?.fromISODate) && Boolean(input?.toISODate),
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
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "upcoming"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "range"],
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
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "upcoming"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "range"],
      });
    },
  });
}

export function useUpdateStudentReminderMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { reminderId: string; values: StudentReminderUpdate }) =>
      updateStudentReminder(input.reminderId, input.values),
    onSuccess: async (reminder) => {
      await queryClient.invalidateQueries({
        queryKey: studentReminderKeys.list({ studentId: reminder.student_id }),
      });
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "upcoming"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["studentReminders", "range"],
      });
    },
  });
}
