import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type AssessmentInsert = Database["public"]["Tables"]["assessments"]["Insert"];
export type AssessmentUpdate = Database["public"]["Tables"]["assessments"]["Update"];

export type ListAssessmentsInput = {
  studentId?: string;
  limit?: number;
};

export async function listAssessments(input: ListAssessmentsInput): Promise<Assessment[]> {
  let query = supabase
    .from("assessments")
    .select("*")
    .order("assessment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.studentId) query = query.eq("student_id", input.studentId);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<Assessment[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function createAssessment(input: AssessmentInsert): Promise<Assessment> {
  const { data, error } = await supabase
    .from("assessments")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<Assessment, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateAssessment(
  assessmentId: string,
  input: AssessmentUpdate,
): Promise<Assessment> {
  const { data, error } = await supabase
    .from("assessments")
    .update(input)
    .eq("id", assessmentId)
    .select("*")
    .single()
    .overrideTypes<Assessment, { merge: false }>();

  if (error) throw error;
  return data;
}

