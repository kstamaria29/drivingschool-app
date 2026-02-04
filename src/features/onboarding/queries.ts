import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "../auth/queries";

import { completeOnboarding, type CompleteOnboardingInput } from "./api";

type Input = Omit<CompleteOnboardingInput, "userId">;

export function useCompleteOnboardingMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Input) => completeOnboarding({ ...input, userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) });
    },
  });
}

