import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateQueriesByKey } from "../../utils/query";
import {
  getOrganizationMemberDetails,
  listOrganizationProfiles,
  uploadMyAvatar,
  type UploadAvatarInput,
} from "./api";
import { authKeys } from "../auth/queries";

export const profileKeys = {
  list: () => ["profiles"] as const,
  memberRoot: () => ["profiles", "member"] as const,
  memberDetail: (memberId: string) => ["profiles", "member", { memberId }] as const,
};

export function useOrganizationProfilesQuery(enabled: boolean) {
  return useQuery({
    queryKey: profileKeys.list(),
    queryFn: () => listOrganizationProfiles(),
    enabled,
  });
}

export function useOrganizationMemberDetailsQuery(memberId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: memberId ? profileKeys.memberDetail(memberId) : (["profiles", "member", { memberId: null }] as const),
    queryFn: () => getOrganizationMemberDetails(memberId!),
    enabled: enabled && !!memberId,
  });
}

export function useUploadMyAvatarMutation(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Omit<UploadAvatarInput, "userId">) =>
      uploadMyAvatar({ userId, asset: input.asset }),
    onSuccess: async () => {
      await invalidateQueriesByKey(queryClient, [
        authKeys.profile(userId),
        profileKeys.list(),
        profileKeys.memberRoot(),
      ]);
    },
  });
}
