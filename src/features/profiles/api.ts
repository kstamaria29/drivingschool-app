import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";
import { base64ToUint8Array } from "../../utils/base64";

export type OrgProfile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  | "id"
  | "display_name"
  | "role"
  | "first_name"
  | "last_name"
  | "avatar_url"
  | "email"
  | "contact_no"
  | "address"
>;

export type MemberLessonPreview = Pick<
  Database["public"]["Tables"]["lessons"]["Row"],
  "id" | "start_time" | "end_time" | "status" | "location"
> & {
  students: Pick<Database["public"]["Tables"]["students"]["Row"], "first_name" | "last_name"> | null;
};

export type OrganizationMemberDetails = {
  profile: OrgProfile | null;
  activeStudentsCount: number;
  nextLessons: MemberLessonPreview[];
};

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
    .select("id, display_name, role, first_name, last_name, avatar_url, email, contact_no, address")
    .order("display_name", { ascending: true })
    .overrideTypes<OrgProfile[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

async function getOrganizationMemberProfile(memberId: string): Promise<OrgProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, first_name, last_name, avatar_url, email, contact_no, address")
    .eq("id", memberId)
    .maybeSingle()
    .overrideTypes<OrgProfile, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

async function getActiveStudentsCountForMember(memberId: string): Promise<number> {
  const { count, error } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("assigned_instructor_id", memberId)
    .is("archived_at", null);

  if (error) throw error;
  return count ?? 0;
}

async function getNextLessonsForMember(memberId: string): Promise<MemberLessonPreview[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("lessons")
    .select("id, start_time, end_time, status, location, students(first_name, last_name)")
    .eq("instructor_id", memberId)
    .gte("start_time", nowIso)
    .order("start_time", { ascending: true })
    .limit(3)
    .overrideTypes<MemberLessonPreview[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function getOrganizationMemberDetails(
  memberId: string,
): Promise<OrganizationMemberDetails> {
  const [profile, activeStudentsCount, nextLessons] = await Promise.all([
    getOrganizationMemberProfile(memberId),
    getActiveStudentsCountForMember(memberId),
    getNextLessonsForMember(memberId),
  ]);

  return {
    profile,
    activeStudentsCount,
    nextLessons,
  };
}

export async function uploadMyAvatar(input: UploadAvatarInput) {
  const extension = guessFileExtension(input.asset);
  const contentType = guessContentType(input.asset);
  const objectPath = `${input.userId}/avatar.${extension}`;

  if (!input.asset.base64) {
    throw new Error("Avatar upload failed. Please choose the image again.");
  }

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(objectPath, base64ToUint8Array(input.asset.base64), { contentType, upsert: true });

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
