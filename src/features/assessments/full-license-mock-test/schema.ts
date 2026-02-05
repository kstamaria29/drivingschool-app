import { z } from "zod";

import { parseDateInputToISODate } from "../../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

export const fullLicenseMockTestFormSchema = z.object({
  studentId: z.string().uuid("Select a student"),
  date: dateString,
  time: z.string().trim(),
  locationArea: z.string().trim(),
  vehicle: z.string().trim(),
  mode: z.union([z.literal("official"), z.literal("drill")]),
  weather: z.union([z.literal("dry"), z.literal("wet"), z.literal("low_visibility")]),
  criticalNotes: z.string().trim(),
  immediateNotes: z.string().trim(),
  overallNotes: z.string().trim(),
});

export type FullLicenseMockTestFormValues = z.infer<typeof fullLicenseMockTestFormSchema>;

const itemValueSchema = z.union([z.literal("P"), z.literal("F")]);

const attemptSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  taskId: z.string(),
  taskName: z.string(),
  variant: z.string(),
  repIndex: z.number().int().min(1),
  repTarget: z.number().int().min(1),
  items: z.record(z.string(), itemValueSchema).default({}),
  hazardsSpoken: z.string().default(""),
  actionsSpoken: z.string().default(""),
  notes: z.string().default(""),
  locationTag: z.string().default(""),
});

const errorCountsSchema = z.record(z.string(), z.number().int().min(0)).optional().default({});

export const fullLicenseMockTestStoredDataSchema = fullLicenseMockTestFormSchema.extend({
  version: z.number().int().optional(),
  candidateName: z.string().trim().optional().default(""),
  instructor: z.string().trim().optional().default(""),
  drillLeftTarget: z.number().int().min(1).max(30).optional(),
  drillRightTarget: z.number().int().min(1).max(30).optional(),
  startTimeISO: z.string().nullable().optional(),
  endTimeISO: z.string().nullable().optional(),
  remainingSeconds: z.number().int().min(0).optional(),
  attempts: z.array(attemptSchema).optional().default([]),
  critical: errorCountsSchema,
  immediate: errorCountsSchema,
  summary: z
    .object({
      attemptsCount: z.number().int().min(0).optional(),
      criticalTotal: z.number().int().min(0).optional(),
      immediateTotal: z.number().int().min(0).optional(),
      scorePercent: z.number().int().min(0).max(100).nullable().optional(),
      readinessLabel: z.string().optional(),
      readinessReason: z.string().optional(),
    })
    .optional(),
  savedByUserId: z.string().optional(),
});

export type FullLicenseMockTestStoredData = z.infer<typeof fullLicenseMockTestStoredDataSchema>;

