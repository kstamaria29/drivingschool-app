import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createMapAnnotation,
  deleteMapAnnotation,
  listMapAnnotations,
  updateMapAnnotation,
  type ListMapAnnotationsInput,
  type MapAnnotationInsert,
  type MapAnnotationUpdate,
} from "./api";

export const mapAnnotationKeys = {
  all: ["map-annotations"] as const,
  list: (organizationId: string, mapPinId?: string | null) =>
    [...mapAnnotationKeys.all, "list", organizationId, mapPinId ?? null] as const,
};

export function useMapAnnotationsQuery(input?: ListMapAnnotationsInput) {
  return useQuery({
    queryKey: input
      ? mapAnnotationKeys.list(input.organizationId, input.mapPinId ?? null)
      : [...mapAnnotationKeys.all, "list", null, null],
    queryFn: () => listMapAnnotations(input!),
    enabled: !!input?.organizationId,
  });
}

export function useCreateMapAnnotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: MapAnnotationInsert) => createMapAnnotation(input),
    onSuccess: async (annotation) => {
      await queryClient.invalidateQueries({
        queryKey: mapAnnotationKeys.list(annotation.organization_id),
      });
    },
  });
}

export function useUpdateMapAnnotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      annotationId,
      input,
    }: {
      annotationId: string;
      input: MapAnnotationUpdate;
    }) => updateMapAnnotation(annotationId, input),
    onSuccess: async (annotation) => {
      await queryClient.invalidateQueries({
        queryKey: mapAnnotationKeys.list(annotation.organization_id),
      });
    },
  });
}

export function useDeleteMapAnnotationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      annotationId,
      organizationId,
    }: {
      annotationId: string;
      organizationId: string;
    }) => deleteMapAnnotation(annotationId).then(() => organizationId),
    onSuccess: async (organizationId) => {
      await queryClient.invalidateQueries({
        queryKey: mapAnnotationKeys.list(organizationId),
      });
    },
  });
}
