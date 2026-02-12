import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];
export type AssessmentInsert = Database["public"]["Tables"]["assessments"]["Insert"];
export type AssessmentUpdate = Database["public"]["Tables"]["assessments"]["Update"];
export type AssessmentWithStudent = Assessment & {
  students: Pick<
    Database["public"]["Tables"]["students"]["Row"],
    "first_name" | "last_name" | "organization_name"
  > | null;
};

export type ListAssessmentsInput = {
  studentId?: string;
  assessmentType?: Assessment["assessment_type"];
  limit?: number;
};

export type ListRecentAssessmentsInput = {
  limit?: number;
};

export async function listAssessments(input: ListAssessmentsInput): Promise<Assessment[]> {
  let query = supabase
    .from("assessments")
    .select("*")
    .order("assessment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.studentId) query = query.eq("student_id", input.studentId);
  if (input.assessmentType) query = query.eq("assessment_type", input.assessmentType);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<Assessment[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function listRecentAssessments(
  input: ListRecentAssessmentsInput = {},
): Promise<AssessmentWithStudent[]> {
  let query = supabase
    .from("assessments")
    .select("*, students(first_name, last_name, organization_name)")
    .order("assessment_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<AssessmentWithStudent[], { merge: false }>();
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

export async function deleteAssessment(assessmentId: string): Promise<Assessment> {
  const { data, error } = await supabase
    .from("assessments")
    .delete()
    .eq("id", assessmentId)
    .select("*")
    .single()
    .overrideTypes<Assessment, { merge: false }>();

  if (error) throw error;
  return data;
}
