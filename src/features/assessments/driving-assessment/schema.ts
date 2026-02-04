import { z } from "zod";

const dateString = z
  .string()
  .trim()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use YYYY-MM-DD",
  });

const optionalDateString = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: "Use YYYY-MM-DD",
  });

const optionalEmail = z
  .string()
  .trim()
  .refine((value) => value === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value), {
    message: "Enter a valid email",
  });

export const drivingAssessmentFormSchema = z.object({
  studentId: z.string().uuid("Select a student"),

  clientName: z.string().trim(),
  address: z.string().trim(),
  contact: z.string().trim(),
  email: optionalEmail,
  licenseNumber: z.string().trim(),
  licenseVersion: z.string().trim(),
  classHeld: z.string().trim(),
  issueDate: optionalDateString,
  expiryDate: optionalDateString,

  weather: z.string().trim(),
  date: dateString,
  instructor: z.string().trim(),

  scores: z.record(
    z.string(),
    z.union([z.record(z.string(), z.string().trim()), z.array(z.string().trim())]),
  ),

  strengths: z.string().trim(),
  improvements: z.string().trim(),
  recommendation: z.string().trim(),
  nextSteps: z.string().trim(),
});

export type DrivingAssessmentFormValues = z.infer<typeof drivingAssessmentFormSchema>;
