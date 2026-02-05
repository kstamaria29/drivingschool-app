import { z } from "zod";

export const addInstructorSchema = z.object({
  firstName: z.string().min(2, "Enter a first name"),
  lastName: z.string().min(2, "Enter a last name"),
  email: z.string().email("Enter a valid email"),
});

export type AddInstructorFormValues = z.infer<typeof addInstructorSchema>;

