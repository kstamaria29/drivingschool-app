import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { authKeys } from "../auth/queries";
import { profileKeys } from "../profiles/queries";
import { invalidateQueriesByKey } from "../../utils/query";

import {
  changeMyPassword,
  clearMyAvatar,
  updateMyDetails,
  updateMyRoleDisplay,
  type ChangeMyPasswordInput,
  type UpdateMyDetailsInput,
  type UpdateMyRoleDisplayInput,
} from "./api";

function invalidateProfileCaches(queryClient: QueryClient, userId: string) {
  return invalidateQueriesByKey(queryClient, [
    authKeys.profile(userId),
    profileKeys.list(),
    profileKeys.memberRoot(),
  ]);
}

export function useUpdateMyDetailsMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateMyDetailsInput) => updateMyDetails(input),
    onSuccess: async () => {
      await invalidateProfileCaches(queryClient, userId);
    },
  });
}

export function useClearMyAvatarMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => clearMyAvatar(userId),
    onSuccess: async () => {
      await invalidateProfileCaches(queryClient, userId);
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
      await invalidateProfileCaches(queryClient, userId);
    },
  });
}
