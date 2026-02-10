import { z } from "zod";

import { parseDateInputToISODate } from "../../../utils/dates";

const dateString = z
  .string()
  .trim()
  .refine((value) => parseDateInputToISODate(value) != null, {
    message: "Use DD/MM/YYYY",
  });

export const restrictedMockTestFormSchema = z.object({
  studentId: z.string().uuid("Select a student"),
  date: dateString,
  time: z.string().trim(),
  vehicleInfo: z.string().trim(),
  routeInfo: z.string().trim(),
  preDriveNotes: z.string().trim(),
  criticalNotes: z.string().trim(),
  immediateNotes: z.string().trim(),
});

export type RestrictedMockTestFormValues = z.infer<typeof restrictedMockTestFormSchema>;

const faultValue = z.union([z.literal(""), z.literal("fault")]);

const taskStateSchema = z.object({
  items: z.record(z.string(), faultValue).default({}),
  location: z.string().default(""),
  notes: z.string().default(""),
  repetitions: z.number().int().min(0).default(0),
});

const stageTasksSchema = z.record(z.string(), taskStateSchema).default({});

const stagesStateSchema = z
  .object({
    stage1: stageTasksSchema,
    stage2: stageTasksSchema,
  })
  .default({ stage1: {}, stage2: {} });

const errorCountsSchema = z.record(z.string(), z.number().int().min(0)).optional().default({});

export const restrictedMockTestStoredDataSchema = restrictedMockTestFormSchema.extend({
  version: z.number().int().optional(),
  candidateName: z.string().trim().optional().default(""),
  instructor: z.string().trim().optional().default(""),
  stage2Enabled: z.boolean().optional().default(false),
  stagesState: stagesStateSchema,
  critical: errorCountsSchema,
  immediate: errorCountsSchema,
  summary: z
    .object({
      stage1Faults: z.number().int().min(0).optional(),
      stage2Faults: z.number().int().min(0).optional(),
      criticalTotal: z.number().int().min(0).optional(),
      immediateTotal: z.number().int().min(0).optional(),
      immediateList: z.string().optional(),
      resultText: z.string().optional(),
      resultTone: z.union([z.literal("danger"), z.literal("success")]).optional(),
    })
    .optional(),
  savedByUserId: z.string().optional(),
});

export type RestrictedMockTestStoredData = z.infer<typeof restrictedMockTestStoredDataSchema>;
