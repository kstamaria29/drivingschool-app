import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Student = Database["public"]["Tables"]["students"]["Row"];
export type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
export type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];

export type ListStudentsInput = {
  archived: boolean;
};

export async function listStudents(input: ListStudentsInput): Promise<Student[]> {
  const base = supabase
    .from("students")
    .select("*")
    .order("last_name", { ascending: true })
    .order("first_name", { ascending: true });

  const query = input.archived ? base.not("archived_at", "is", null) : base.is("archived_at", null);

  const { data, error } = await query.overrideTypes<Student[], { merge: false }>();
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

export async function updateStudent(studentId: string, input: StudentUpdate): Promise<Student> {
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
  const { error } = await supabase.from("students").delete().eq("id", studentId);
  if (error) throw error;
}
