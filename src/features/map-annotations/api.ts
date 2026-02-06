import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type MapAnnotation = Database["public"]["Tables"]["map_annotations"]["Row"];
export type MapAnnotationInsert = Database["public"]["Tables"]["map_annotations"]["Insert"];
export type MapAnnotationUpdate = Database["public"]["Tables"]["map_annotations"]["Update"];

export type ListMapAnnotationsInput = {
  organizationId: string;
  mapPinId?: string | null;
};

export async function listMapAnnotations(input: ListMapAnnotationsInput): Promise<MapAnnotation[]> {
  let query = supabase
    .from("map_annotations")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false });

  if (input.mapPinId) {
    query = query.eq("map_pin_id", input.mapPinId);
  }

  const { data, error } = await query.overrideTypes<MapAnnotation[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function createMapAnnotation(input: MapAnnotationInsert): Promise<MapAnnotation> {
  const { data, error } = await supabase
    .from("map_annotations")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<MapAnnotation, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateMapAnnotation(
  annotationId: string,
  input: MapAnnotationUpdate,
): Promise<MapAnnotation> {
  const { data, error } = await supabase
    .from("map_annotations")
    .update(input)
    .eq("id", annotationId)
    .select("*")
    .single()
    .overrideTypes<MapAnnotation, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function deleteMapAnnotation(annotationId: string): Promise<void> {
  const { error } = await supabase.from("map_annotations").delete().eq("id", annotationId);
  if (error) throw error;
}
