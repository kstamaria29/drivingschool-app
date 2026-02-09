import { z } from "zod";

import { parseDateInputToISODate } from "../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

const timeString = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, { message: "Use HH:mm" });

export const studentReminderFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(120, "Keep title under 120 characters"),
  date: dateString,
  time: timeString,
  notificationOffsets: z
    .array(z.number().int().positive().max(10080))
    .min(1, "Select at least one notification option")
    .refine((value) => new Set(value).size === value.length, {
      message: "Duplicate notification options are not allowed",
    }),
});

export type StudentReminderFormValues = z.infer<typeof studentReminderFormSchema>;
