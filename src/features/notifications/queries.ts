import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateQueriesByKey } from "../../utils/query";
import {
  getOrCreateNotificationSettings,
  listMyPushTokens,
  upsertMyPushToken,
  upsertNotificationSettings,
} from "./settings";

export const notificationKeys = {
  settings: (profileId: string) => ["notification-settings", { profileId }] as const,
  pushTokens: (profileId: string) => ["push-tokens", { profileId }] as const,
};

const notificationsRootKey = ["notification-settings"] as const;

export function useMyNotificationSettingsQuery(input: { profileId: string; organizationId: string }) {
  return useQuery({
    queryKey: notificationKeys.settings(input.profileId),
    queryFn: () => getOrCreateNotificationSettings(input),
  });
}

export function useUpdateNotificationSettingsMutation(input: {
  profileId: string;
  organizationId: string;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: Omit<
      Parameters<typeof upsertNotificationSettings>[0]["patch"],
      never
    >) => upsertNotificationSettings({ ...input, patch }),
    onSuccess: async (next) => {
      await queryClient.setQueryData(notificationKeys.settings(input.profileId), next);
      await invalidateQueriesByKey(queryClient, [notificationsRootKey]);
    },
  });
}

export function useMyPushTokensQuery(profileId: string) {
  return useQuery({
    queryKey: notificationKeys.pushTokens(profileId),
    queryFn: () => listMyPushTokens(profileId),
  });
}

export function useUpsertMyPushTokenMutation(input: { profileId: string; organizationId: string }) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (variables: { expoPushToken: string; platform: "ios" | "android" }) =>
      upsertMyPushToken({ ...input, ...variables }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.pushTokens(input.profileId) });
    },
  });
}
