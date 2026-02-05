import { useMutation, useQueryClient } from "@tanstack/react-query";

import { profileKeys } from "../profiles/queries";

import { createInstructor, type CreateInstructorInput } from "./api";

export function useCreateInstructorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateInstructorInput) => createInstructor(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: profileKeys.list() });
    },
  });
}

