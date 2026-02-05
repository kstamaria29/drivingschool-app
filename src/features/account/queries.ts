import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "../auth/queries";

import { changeMyPassword, clearMyAvatar, updateMyName, type ChangeMyPasswordInput } from "./api";

export function useUpdateMyNameMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyName,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) });
    },
  });
}

export function useClearMyAvatarMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearMyAvatar(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) });
    },
  });
}

export function useChangeMyPasswordMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ChangeMyPasswordInput) => changeMyPassword(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) });
    },
  });
}

