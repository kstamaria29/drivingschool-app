import { useQuery } from "@tanstack/react-query";

import { listOrganizationProfiles } from "./api";

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

