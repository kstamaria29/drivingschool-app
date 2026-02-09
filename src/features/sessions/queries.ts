import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createStudentSession,
  deleteStudentSession,
  listStudentSessions,
  updateStudentSession,
  type ListStudentSessionsInput,
  type StudentSessionInsert,
  type StudentSessionUpdate,
} from "./api";

export const studentSessionKeys = {
  list: (input: ListStudentSessionsInput) => ["studentSessions", input] as const,
};

export function useStudentSessionsQuery(input?: ListStudentSessionsInput) {
  return useQuery({
    queryKey: input ? studentSessionKeys.list(input) : (["studentSessions", { studentId: null }] as const),
    queryFn: () => listStudentSessions(input!),
    enabled: !!input?.studentId,
  });
}

export function useCreateStudentSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StudentSessionInsert) => createStudentSession(input),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({
        queryKey: studentSessionKeys.list({ studentId: session.student_id }),
      });
    },
  });
}

export function useDeleteStudentSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => deleteStudentSession(sessionId),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({
        queryKey: studentSessionKeys.list({ studentId: session.student_id }),
      });
    },
  });
}

type UpdateStudentSessionInput = {
  sessionId: string;
  input: StudentSessionUpdate;
};

export function useUpdateStudentSessionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateStudentSessionInput) => updateStudentSession(payload.sessionId, payload.input),
    onSuccess: async (session) => {
      await queryClient.invalidateQueries({
        queryKey: studentSessionKeys.list({ studentId: session.student_id }),
      });
    },
  });
}
