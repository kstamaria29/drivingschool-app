import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveStudent,
  createStudent,
  getStudent,
  listStudents,
  unarchiveStudent,
  updateStudent,
  type ListStudentsInput,
  type StudentInsert,
  type StudentUpdate,
} from "./api";

export const studentKeys = {
  list: (input: ListStudentsInput) => ["students", input] as const,
  detail: (studentId: string) => ["student", { studentId }] as const,
};

export function useStudentsQuery(input: ListStudentsInput) {
  return useQuery({
    queryKey: studentKeys.list(input),
    queryFn: () => listStudents(input),
  });
}

export function useStudentQuery(studentId?: string) {
  return useQuery({
    queryKey: studentId ? studentKeys.detail(studentId) : (["student", { studentId: null }] as const),
    queryFn: () => getStudent(studentId!),
    enabled: !!studentId,
  });
}

export function useCreateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StudentInsert) => createStudent(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });
}

export function useUpdateStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: string; input: StudentUpdate }) =>
      updateStudent(studentId, input),
    onSuccess: async (student) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: studentKeys.detail(student.id) }),
      ]);
    },
  });
}

export function useArchiveStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => archiveStudent(studentId),
    onSuccess: async (student) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: studentKeys.detail(student.id) }),
      ]);
    },
  });
}

export function useUnarchiveStudentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (studentId: string) => unarchiveStudent(studentId),
    onSuccess: async (student) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["students"] }),
        queryClient.invalidateQueries({ queryKey: studentKeys.detail(student.id) }),
      ]);
    },
  });
}

