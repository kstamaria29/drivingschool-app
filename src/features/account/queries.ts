import { useMutation, useQueryClient } from "@tanstack/react-query";

import { authKeys } from "../auth/queries";
import { profileKeys } from "../profiles/queries";

import {
  changeMyPassword,
  clearMyAvatar,
  updateMyDetails,
  updateMyName,
  updateMyRoleDisplay,
  type ChangeMyPasswordInput,
  type UpdateMyDetailsInput,
  type UpdateMyRoleDisplayInput,
} from "./api";

export function useUpdateMyNameMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateMyName,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["profiles", "member"] }),
      ]);
    },
  });
}

export function useUpdateMyDetailsMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMyDetailsInput) => updateMyDetails(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["profiles", "member"] }),
      ]);
    },
  });
}

export function useClearMyAvatarMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearMyAvatar(userId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["profiles", "member"] }),
      ]);
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

export function useUpdateMyRoleDisplayMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMyRoleDisplayInput) => updateMyRoleDisplay(input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) }),
        queryClient.invalidateQueries({ queryKey: profileKeys.list() }),
        queryClient.invalidateQueries({ queryKey: ["profiles", "member"] }),
      ]);
    },
  });
}
