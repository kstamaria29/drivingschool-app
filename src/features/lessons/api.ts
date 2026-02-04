import type { PostgrestError } from "@supabase/supabase-js";

import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Lesson = Database["public"]["Tables"]["lessons"]["Row"];
export type LessonInsert = Database["public"]["Tables"]["lessons"]["Insert"];
export type LessonUpdate = Database["public"]["Tables"]["lessons"]["Update"];

export type LessonWithStudent = Lesson & {
  students: Pick<Database["public"]["Tables"]["students"]["Row"], "first_name" | "last_name"> | null;
};

export type ListLessonsInput = {
  fromISO: string;
  toISO: string;
};

export async function listLessons(input: ListLessonsInput): Promise<LessonWithStudent[]> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*, students(first_name, last_name)")
    .gte("start_time", input.fromISO)
    .lt("start_time", input.toISO)
    .order("start_time", { ascending: true })
    .overrideTypes<LessonWithStudent[], { merge: false }>();

  if (error) throw error;
  return data ?? [];
}

export async function getLesson(lessonId: string): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle()
    .overrideTypes<Lesson, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

export async function createLesson(input: LessonInsert): Promise<Lesson> {
  const { data, error } = await supabase
    .from("lessons")
    .insert(input)
    .select("*")
    .single()
    .overrideTypes<Lesson, { merge: false }>();

  if (error) throw error;
  return data;
}

export async function updateLesson(lessonId: string, input: LessonUpdate): Promise<Lesson> {
  const { data, error } = await supabase
    .from("lessons")
    .update(input)
    .eq("id", lessonId)
    .select("*")
    .single()
    .overrideTypes<Lesson, { merge: false }>();

  if (error) throw error;
  return data;
}

export function toUserFacingLessonError(error: unknown) {
  const postgrest = error as Partial<PostgrestError> | null;
  if (postgrest?.message) return postgrest.message;
  return "Something went wrong. Please try again.";
}

