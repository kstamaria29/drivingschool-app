import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { uploadMyAvatar, listOrganizationProfiles, type UploadAvatarInput } from "./api";
import { authKeys } from "../auth/queries";

export const profileKeys = {
  list: () => ["profiles"] as const,
};

export function useOrganizationProfilesQuery(enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: () => listOrganizationProfiles(),
    enabled,
  });
}

export function useUploadMyAvatarMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UploadAvatarInput, "userId">) =>
      uploadMyAvatar({ userId, asset: input.asset }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: authKeys.profile(userId) });
    },
  });
}
