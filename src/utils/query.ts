import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function invalidateQueriesByKey(queryClient: QueryClient, queryKeys: readonly QueryKey[]) {
  return Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
