import { z } from "zod";

import { parseDateInputToISODate } from "../../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

const optionalDateString = z
  .string()
  .trim()
  .refine((value) => value === "" || parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
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

export const drivingAssessmentStoredDataSchema = drivingAssessmentFormSchema.extend({
  totalScoreRaw: z.number().optional(),
  totalScorePercentAnswered: z.number().nullable().optional(),
  totalScorePercentOverall: z.number().nullable().optional(),
  scoredCount: z.number().optional(),
  totalCriteriaCount: z.number().optional(),
  maxRaw: z.number().optional(),
  feedbackSummary: z.string().optional(),
  savedByUserId: z.string().optional(),
});

export type DrivingAssessmentStoredData = z.infer<typeof drivingAssessmentStoredDataSchema>;
