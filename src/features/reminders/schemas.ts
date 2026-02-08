import { z } from "zod";

import { parseDateInputToISODate } from "../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

export const studentReminderFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Reminder title is required")
    .max(120, "Keep title under 120 characters"),
  date: dateString,
  notificationOffsets: z
    .array(z.number().int().positive().max(10080))
    .min(1, "Select at least one notification option")
    .refine((value) => new Set(value).size === value.length, {
      message: "Duplicate notification options are not allowed",
    }),
});

export type StudentReminderFormValues = z.infer<typeof studentReminderFormSchema>;

