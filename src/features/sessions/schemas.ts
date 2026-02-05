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
  .refine((value) => /^([01]\\d|2[0-3]):[0-5]\\d$/.test(value), {
    message: "Use HH:mm",
  });

export const studentSessionFormSchema = z.object({
  date: dateString,
  time: timeString,
  durationMinutes: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\\d+$/.test(value), { message: "Enter minutes" })
    .refine((value) => {
      if (value === "") return true;
      const minutes = Number(value);
      return minutes >= 15 && minutes <= 8 * 60;
    }, { message: "15–480 minutes" }),
  tasks: z.array(z.string().trim().min(1)).max(50),
  nextFocus: z.string().trim(),
  notes: z.string().trim(),
});

export type StudentSessionFormValues = z.infer<typeof studentSessionFormSchema>;

