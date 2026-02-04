import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type OrgProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "role"
>;

export async function listOrganizationProfiles(): Promise<OrgProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .order("display_name", { ascending: true })
    .overrideTypes<OrgProfile[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

