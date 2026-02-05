import { supabase } from "../../supabase/client";

export type CreateInstructorInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreateInstructorResult = {
  userId: string;
  email: string;
  temporaryPassword: string;
};

export async function createInstructor(input: CreateInstructorInput): Promise<CreateInstructorResult> {
  const { data, error } = await supabase.functions.invoke<CreateInstructorResult>(
    "create-instructor",
    { body: input },
  );

  if (error) throw error;
  if (!data) throw new Error("Instructor creation failed. Please try again.");

  return data;
}

