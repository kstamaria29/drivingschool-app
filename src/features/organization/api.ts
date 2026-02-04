import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Organization = Database["public"]["Tables"]["organizations"]["Row"];
export type OrganizationSettings = Database["public"]["Tables"]["organization_settings"]["Row"];

export type UploadOrganizationLogoInput = {
  organizationId: string;
  asset: import("expo-image-picker").ImagePickerAsset;
};

function guessFileExtension(asset: UploadOrganizationLogoInput["asset"]) {
  const fileName = asset.fileName ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  if (match?.[1]) return match[1].toLowerCase();

  const mimeType = asset.mimeType ?? "";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function guessContentType(asset: UploadOrganizationLogoInput["asset"]) {
  return asset.mimeType ?? "image/jpeg";
}

export async function getOrganization(organizationId: string): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", organizationId)
    .maybeSingle()
    .overrideTypes<Organization, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

export async function getOrganizationSettings(
  organizationId: string,
): Promise<OrganizationSettings | null> {
  const { data, error } = await supabase
    .from("organization_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle()
    .overrideTypes<OrganizationSettings, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

export async function updateOrganizationLogoUrl(organizationId: string, logoUrl: string | null) {
  const { error } = await supabase.from("organization_settings").upsert(
    {
      organization_id: organizationId,
      logo_url: logoUrl,
    },
    { onConflict: "organization_id" },
  );

  if (error) throw error;
}

export async function uploadOrganizationLogo(input: UploadOrganizationLogoInput) {
  const extension = guessFileExtension(input.asset);
  const contentType = guessContentType(input.asset);
  const objectPath = `${input.organizationId}/logo.${extension}`;

  const response = await fetch(input.asset.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("org-logos")
    .upload(objectPath, blob, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from("org-logos")
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

  if (signedError) throw signedError;

  await updateOrganizationLogoUrl(input.organizationId, signed.signedUrl);

  return { logoUrl: signed.signedUrl };
}

export function toUserFacingOrganizationError(error: unknown) {
  const postgrest = error as Partial<PostgrestError> | null;
  if (postgrest?.message) return postgrest.message;
  return "Something went wrong. Please try again.";
}
