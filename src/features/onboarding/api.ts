import type { ImagePickerAsset } from "expo-image-picker";

import { supabase } from "../../supabase/client";

export type CompleteOnboardingInput = {
  userId: string;
  organizationName: string;
  displayName: string;
  logoAsset?: ImagePickerAsset;
};

function guessFileExtension(asset: ImagePickerAsset) {
  const fileName = asset.fileName ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  if (match?.[1]) return match[1].toLowerCase();

  const mimeType = asset.mimeType ?? "";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function guessContentType(asset: ImagePickerAsset) {
  return asset.mimeType ?? "image/jpeg";
}

export async function completeOnboarding(input: CompleteOnboardingInput) {
  const { data: organizationId, error: rpcError } = await supabase.rpc(
    "create_organization_for_owner",
    {
      organization_name: input.organizationName,
      owner_display_name: input.displayName,
    },
  );

  if (rpcError) throw rpcError;
  if (!organizationId) throw new Error("Organization creation failed.");

  if (input.logoAsset) {
    const extension = guessFileExtension(input.logoAsset);
    const contentType = guessContentType(input.logoAsset);
    const objectPath = `${organizationId}/logo.${extension}`;

    const response = await fetch(input.logoAsset.uri);
    const blob = await response.blob();

    const { error: uploadError } = await supabase.storage
      .from("org-logos")
      .upload(objectPath, blob, { contentType, upsert: true });

    if (uploadError) throw uploadError;

    const { data: signed, error: signedError } = await supabase.storage
      .from("org-logos")
      .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

    if (signedError) throw signedError;

    const { error: updateError } = await supabase.from("organization_settings").upsert(
      {
        organization_id: organizationId,
        logo_url: signed.signedUrl,
      },
      { onConflict: "organization_id" },
    );

    if (updateError) throw updateError;
  }

  return { organizationId };
}
