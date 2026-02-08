import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";
import { readUriAsUint8Array } from "../../utils/file-bytes";

export type Student = Database["public"]["Tables"]["students"]["Row"];
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];
export type StudentLicenseImageSide = "front" | "back";

export type UploadStudentLicenseImageInput = {
  organizationId: string;
  studentId: string;
  side: StudentLicenseImageSide;
  asset: import("expo-image-picker").ImagePickerAsset;
};
export type RemoveStudentLicenseImageInput = {
  organizationId: string;
  studentId: string;
  side: StudentLicenseImageSide;
};

export type ListStudentsInput = {
  archived: boolean;
};

export async function listStudents(
  input: ListStudentsInput,
): Promise<Student[]> {
  const base = supabase
    .from("students")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const query = input.archived
    ? base.not("archived_at", "is", null)
    : base.is("archived_at", null);

  const { data, error } = await query.overrideTypes<
    Student[],
    { merge: false }
  >();
  if (error) throw error;
  return data ?? [];
}

export async function getStudent(studentId: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", studentId)
    .maybeSingle()
    .overrideTypes<Student, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

export async function createStudent(input: StudentInsert): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<Student, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateStudent(
  studentId: string,
  input: StudentUpdate,
): Promise<Student> {
  const { data, error } = await supabase
    .from("students")
    .update(input)
    .eq("id", studentId)
    .select("*")
    .single()
    .overrideTypes<Student, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function archiveStudent(studentId: string): Promise<Student> {
  return updateStudent(studentId, { archived_at: new Date().toISOString() });
}

export async function unarchiveStudent(studentId: string): Promise<Student> {
  return updateStudent(studentId, { archived_at: null });
}

export async function deleteStudent(studentId: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", studentId);
  if (error) throw error;
}

function guessFileExtension(asset: UploadStudentLicenseImageInput["asset"]) {
  const fileName = asset.fileName ?? "";
  const fileNameMatch = /\.([a-z0-9]+)$/i.exec(fileName);
  if (fileNameMatch?.[1]) return fileNameMatch[1].toLowerCase();

  const uriMatch = /\.([a-z0-9]+)(?:$|\?|#)/i.exec(asset.uri);
  if (uriMatch?.[1]) return uriMatch[1].toLowerCase();

  const mimeType = asset.mimeType ?? "";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function guessContentType(asset: UploadStudentLicenseImageInput["asset"]) {
  const extension = guessFileExtension(asset);
  if (asset.mimeType) return asset.mimeType;
  if (extension === "png") return "image/png";
  if (extension === "webp") return "image/webp";
  return "image/jpeg";
}

async function removeExistingLicenseImageFilesForSide(
  organizationId: string,
  studentId: string,
  side: StudentLicenseImageSide,
) {
  const folder = `${organizationId}/${studentId}`;

  const { data, error } = await supabase.storage
    .from("student-licenses")
    .list(folder, { limit: 100 });

  if (error) throw error;

  const toRemove = (data ?? [])
    .filter((file) => file.name.startsWith(`${side}.`))
    .map((file) => `${folder}/${file.name}`);

  if (toRemove.length === 0) return;

  const { error: removeError } = await supabase.storage
    .from("student-licenses")
    .remove(toRemove);

  if (removeError) throw removeError;
}

export async function uploadStudentLicenseImage(
  input: UploadStudentLicenseImageInput,
): Promise<Student> {
  const extension = guessFileExtension(input.asset);
  const contentType = guessContentType(input.asset);
  const objectPath = `${input.organizationId}/${input.studentId}/${input.side}.${extension}`;

  await removeExistingLicenseImageFilesForSide(
    input.organizationId,
    input.studentId,
    input.side,
  );

  const bytes = await readUriAsUint8Array(input.asset.uri);
  const { error: uploadError } = await supabase.storage
    .from("student-licenses")
    .upload(objectPath, bytes, { contentType, upsert: true });

  if (uploadError) throw uploadError;

  const { data: signed, error: signedError } = await supabase.storage
    .from("student-licenses")
    .createSignedUrl(objectPath, 60 * 60 * 24 * 365);

  if (signedError) throw signedError;

  const studentUpdate: StudentUpdate =
    input.side === "front"
      ? { license_front_image_url: signed.signedUrl }
      : { license_back_image_url: signed.signedUrl };

  return updateStudent(input.studentId, studentUpdate);
}

export async function removeStudentLicenseImage(
  input: RemoveStudentLicenseImageInput,
): Promise<Student> {
  await removeExistingLicenseImageFilesForSide(
    input.organizationId,
    input.studentId,
    input.side,
  );

  const studentUpdate: StudentUpdate =
    input.side === "front"
      ? { license_front_image_url: null }
      : { license_back_image_url: null };

  return updateStudent(input.studentId, studentUpdate);
}
