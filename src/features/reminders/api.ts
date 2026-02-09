import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type StudentReminder = Database["public"]["Tables"]["student_reminders"]["Row"];
export type StudentReminderInsert = Database["public"]["Tables"]["student_reminders"]["Insert"];
export type StudentReminderUpdate = Database["public"]["Tables"]["student_reminders"]["Update"];

export type StudentReminderWithStudent = StudentReminder & {
  students: Pick<Database["public"]["Tables"]["students"]["Row"], "first_name" | "last_name"> | null;
};

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
    .order("reminder_time", { ascending: true })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<StudentReminder[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export type ListUpcomingRemindersInput = {
  instructorId: string;
  fromISODate: string;
  limit?: number;
};

export async function listUpcomingReminders(
  input: ListUpcomingRemindersInput,
): Promise<StudentReminderWithStudent[]> {
  let query = supabase
    .from("student_reminders")
    .select("*, students(first_name, last_name)")
    .eq("instructor_id", input.instructorId)
    .gte("reminder_date", input.fromISODate)
    .order("reminder_date", { ascending: true })
    .order("reminder_time", { ascending: true })
    .order("created_at", { ascending: false });

  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query.overrideTypes<StudentReminderWithStudent[], { merge: false }>();
  if (error) throw error;
  return data ?? [];
}

export type ListRemindersByDateRangeInput = {
  fromISODate: string;
  toISODate: string;
  limit?: number;
};

export async function listRemindersByDateRange(
  input: ListRemindersByDateRangeInput,
): Promise<StudentReminder[]> {
  let query = supabase
    .from("student_reminders")
    .select("*")
    .gte("reminder_date", input.fromISODate)
    .lte("reminder_date", input.toISODate)
    .order("reminder_date", { ascending: true })
    .order("reminder_time", { ascending: true })
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
