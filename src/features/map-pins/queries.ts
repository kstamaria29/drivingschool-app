import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMapPin,
  deleteMapPin,
  listMapPins,
  updateMapPin,
  type ListMapPinsInput,
  type MapPinInsert,
  type MapPinUpdate,
} from "./api";

export const mapPinKeys = {
  all: ["map-pins"] as const,
  list: (organizationId: string) => [...mapPinKeys.all, "list", organizationId] as const,
};

export function useMapPinsQuery(input?: ListMapPinsInput) {
  return useQuery({
    queryKey: input ? mapPinKeys.list(input.organizationId) : [...mapPinKeys.all, "list", null],
    queryFn: () => listMapPins(input!),
    enabled: !!input?.organizationId,
  });
}

export function useCreateMapPinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MapPinInsert) => createMapPin(input),
    onSuccess: async (pin) => {
      await queryClient.invalidateQueries({ queryKey: mapPinKeys.list(pin.organization_id) });
    },
  });
}

export function useUpdateMapPinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mapPinId, input }: { mapPinId: string; input: MapPinUpdate }) =>
      updateMapPin(mapPinId, input),
    onSuccess: async (pin) => {
      await queryClient.invalidateQueries({ queryKey: mapPinKeys.list(pin.organization_id) });
    },
  });
}

export function useDeleteMapPinMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ mapPinId, organizationId }: { mapPinId: string; organizationId: string }) =>
      deleteMapPin(mapPinId).then(() => organizationId),
    onSuccess: async (organizationId) => {
      await queryClient.invalidateQueries({ queryKey: mapPinKeys.list(organizationId) });
    },
  });
}
