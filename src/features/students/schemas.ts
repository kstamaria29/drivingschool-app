import { z } from "zod";

import { parseDateInputToISODate } from "../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => value === "" || parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

export const studentFormSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: z
    .string()
    .trim()
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email",
    }),
  phone: z.string().trim(),
  address: z.string().trim(),
  assignedInstructorId: z.string().uuid("Select an instructor"),
  licenseType: z.enum(["learner", "restricted", "full"]).or(z.literal("")),
  licenseNumber: z.string().trim(),
  licenseVersion: z.string().trim(),
  classHeld: z.string().trim(),
  issueDate: dateString,
  expiryDate: dateString,
  notes: z.string().trim(),
});

export type StudentFormValues = z.infer<typeof studentFormSchema>;
