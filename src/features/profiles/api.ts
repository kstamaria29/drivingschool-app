import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type OrgProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "display_name" | "role"
>;

export type UploadAvatarInput = {
  userId: string;
  asset: import("expo-image-picker").ImagePickerAsset;
};

function guessFileExtension(asset: UploadAvatarInput["asset"]) {
  const fileName = asset.fileName ?? "";
  const match = /\.([a-z0-9]+)$/i.exec(fileName);
  if (match?.[1]) return match[1].toLowerCase();

  const mimeType = asset.mimeType ?? "";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function guessContentType(asset: UploadAvatarInput["asset"]) {
  return asset.mimeType ?? "image/jpeg";
}

export async function listOrganizationProfiles(): Promise<OrgProfile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .order("display_name", { ascending: true })
    .overrideTypes<OrgProfile[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function uploadMyAvatar(input: UploadAvatarInput) {
  const extension = guessFileExtension(input.asset);
  const contentType = guessContentType(input.asset);
  const objectPath = `${input.userId}/avatar.${extension}`;

  const response = await fetch(input.asset.uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(objectPath, blob, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from("avatars")
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

  if (signedError) throw signedError;

  const { error: rpcError } = await supabase.rpc("set_my_avatar_url", {
    new_avatar_url: signed.signedUrl,
  });

  if (rpcError) throw rpcError;

  return { avatarUrl: signed.signedUrl };
}
