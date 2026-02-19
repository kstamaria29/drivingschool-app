import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type NotificationSettingsRow = Database["public"]["Tables"]["notification_settings"]["Row"];
export type NotificationSettingsInsert = Database["public"]["Tables"]["notification_settings"]["Insert"];
export type NotificationSettingsUpdate = Database["public"]["Tables"]["notification_settings"]["Update"];

export type PushTokenRow = Database["public"]["Tables"]["push_tokens"]["Row"];
export type PushTokenInsert = Database["public"]["Tables"]["push_tokens"]["Insert"];

export async function getOrCreateNotificationSettings(input: {
  profileId: string;
  organizationId: string;
}) {
  const { data, error } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("profile_id", input.profileId)
    .maybeSingle()
    .overrideTypes<NotificationSettingsRow, { merge: false }>();

  if (error) throw error;
  if (data) return data;

  const { data: created, error: insertError } = await supabase
    .from("notification_settings")
    .insert({
      profile_id: input.profileId,
      organization_id: input.organizationId,
    } satisfies NotificationSettingsInsert)
    .select("*")
    .single()
    .overrideTypes<NotificationSettingsRow, { merge: false }>();

  if (insertError) throw insertError;
  return created;
}

export async function upsertNotificationSettings(input: {
  profileId: string;
  organizationId: string;
  patch: Omit<NotificationSettingsUpdate, "profile_id" | "organization_id" | "created_at" | "updated_at">;
}) {
  const { data, error } = await supabase
    .from("notification_settings")
    .upsert(
      {
        profile_id: input.profileId,
        organization_id: input.organizationId,
        ...input.patch,
      } satisfies NotificationSettingsInsert,
      { onConflict: "profile_id" },
    )
    .select("*")
    .single()
    .overrideTypes<NotificationSettingsRow, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function listMyPushTokens(profileId: string) {
  const { data, error } = await supabase
    .from("push_tokens")
    .select("*")
    .eq("profile_id", profileId)
    .order("last_seen_at", { ascending: false })
    .overrideTypes<PushTokenRow[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function upsertMyPushToken(input: {
  profileId: string;
  organizationId: string;
  expoPushToken: string;
  platform: "ios" | "android";
}) {
  const { data, error } = await supabase
    .from("push_tokens")
    .upsert(
      {
        profile_id: input.profileId,
        organization_id: input.organizationId,
        expo_push_token: input.expoPushToken,
        platform: input.platform,
        last_seen_at: new Date().toISOString(),
      } satisfies PushTokenInsert,
      { onConflict: "profile_id,expo_push_token" },
    )
    .select("*")
    .single()
    .overrideTypes<PushTokenRow, { merge: false }>();

  if (error) throw error;
  return data;
}

