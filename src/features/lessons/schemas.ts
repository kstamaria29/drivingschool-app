import dayjs from "dayjs";
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
  .refine((value) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value), {
    message: "Use HH:mm",
  });

export const lessonFormSchema = z
  .object({
    date: dateString,
    startTime: timeString,
    durationMinutes: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value), { message: "Enter minutes" })
      .refine((value) => {
        const minutes = Number(value);
        return minutes >= 15 && minutes <= 8 * 60;
      }, { message: "15–480 minutes" }),
    studentId: z.string().uuid("Select a student"),
    instructorId: z.string().uuid("Select an instructor"),
    status: z.enum(["scheduled", "completed", "cancelled"]),
    location: z.string().trim(),
    notes: z.string().trim(),
  })
  .refine(
    (value) => {
      const dateISO = parseDateInputToISODate(value.date);
      if (!dateISO) return false;
      const start = dayjs(`${dateISO}T${value.startTime}`);
      if (!start.isValid()) return false;
      const end = start.add(Number(value.durationMinutes), "minute");
      return end.isAfter(start);
    },
    { message: "End time must be after start time", path: ["durationMinutes"] },
  );

export type LessonFormValues = z.infer<typeof lessonFormSchema>;
