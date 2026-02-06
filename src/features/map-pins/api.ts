import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type MapPin = Database["public"]["Tables"]["map_pins"]["Row"];
export type MapPinInsert = Database["public"]["Tables"]["map_pins"]["Insert"];
export type MapPinUpdate = Database["public"]["Tables"]["map_pins"]["Update"];

export type ListMapPinsInput = {
  organizationId: string;
};

export async function listMapPins(input: ListMapPinsInput): Promise<MapPin[]> {
  const { data, error } = await supabase
    .from("map_pins")
    .select("*")
    .eq("organization_id", input.organizationId)
    .order("created_at", { ascending: false })
    .overrideTypes<MapPin[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function createMapPin(input: MapPinInsert): Promise<MapPin> {
  const { data, error } = await supabase
    .from("map_pins")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<MapPin, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateMapPin(mapPinId: string, input: MapPinUpdate): Promise<MapPin> {
  const { data, error } = await supabase
    .from("map_pins")
    .update(input)
    .eq("id", mapPinId)
    .select("*")
    .single()
    .overrideTypes<MapPin, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function deleteMapPin(mapPinId: string): Promise<void> {
  const { error } = await supabase.from("map_pins").delete().eq("id", mapPinId);
  if (error) throw error;
}
