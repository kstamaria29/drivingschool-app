import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type StudentSession = Database["public"]["Tables"]["student_sessions"]["Row"];
export type StudentSessionInsert = Database["public"]["Tables"]["student_sessions"]["Insert"];
export type StudentSessionUpdate = Database["public"]["Tables"]["student_sessions"]["Update"];
export type StudentSessionWithStudent = StudentSession & {
  students: Pick<Database["public"]["Tables"]["students"]["Row"], "first_name" | "last_name"> | null;
};

export type ListStudentSessionsInput = {
  studentId: string;
  limit?: number;
};

export type ListRecentStudentSessionsInput = {
  limit?: number;
};

export async function listStudentSessions(input: ListStudentSessionsInput): Promise<StudentSession[]> {
  let query = supabase
    .from("student_sessions")
    .select("*")
    .eq("student_id", input.studentId)
    .order("session_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<StudentSession[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function listRecentStudentSessions(
  input: ListRecentStudentSessionsInput = {},
): Promise<StudentSessionWithStudent[]> {
  let query = supabase
    .from("student_sessions")
    .select("*, students(first_name, last_name)")
    .order("session_at", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<StudentSessionWithStudent[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function createStudentSession(input: StudentSessionInsert): Promise<StudentSession> {
  const { data, error } = await supabase
    .from("student_sessions")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<StudentSession, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function deleteStudentSession(sessionId: string): Promise<StudentSession> {
  const { data, error } = await supabase
    .from("student_sessions")
    .delete()
    .eq("id", sessionId)
    .select("*")
    .single()
    .overrideTypes<StudentSession, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateStudentSession(
  sessionId: string,
  input: StudentSessionUpdate,
): Promise<StudentSession> {
  const { data, error } = await supabase
    .from("student_sessions")
    .update(input)
    .eq("id", sessionId)
    .select("*")
    .single()
    .overrideTypes<StudentSession, { merge: false }>();

  if (error) throw error;
  return data;
}
