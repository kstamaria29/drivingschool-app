import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type StudentReminder = Database["public"]["Tables"]["student_reminders"]["Row"];
export type StudentReminderInsert = Database["public"]["Tables"]["student_reminders"]["Insert"];
export type StudentReminderUpdate = Database["public"]["Tables"]["student_reminders"]["Update"];

export type ListStudentRemindersInput = {
  studentId: string;
  limit?: number;
};

export async function listStudentReminders(input: ListStudentRemindersInput): Promise<StudentReminder[]> {
  let query = supabase
    .from("student_reminders")
    .select("*")
    .eq("student_id", input.studentId)
    .order("reminder_date", { ascending: true })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<StudentReminder[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export async function createStudentReminder(input: StudentReminderInsert): Promise<StudentReminder> {
  const { data, error } = await supabase
    .from("student_reminders")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<StudentReminder, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function deleteStudentReminder(reminderId: string): Promise<StudentReminder> {
  const { data, error } = await supabase
    .from("student_reminders")
    .delete()
    .eq("id", reminderId)
    .select("*")
    .single()
    .overrideTypes<StudentReminder, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateStudentReminder(
  reminderId: string,
  input: StudentReminderUpdate,
): Promise<StudentReminder> {
  const { data, error } = await supabase
    .from("student_reminders")
    .update(input)
    .eq("id", reminderId)
    .select("*")
    .single()
    .overrideTypes<StudentReminder, { merge: false }>();

  if (error) throw error;
  return data;
}

