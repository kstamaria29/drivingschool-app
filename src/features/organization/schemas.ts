import { z } from "zod";

export const organizationNameSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(80, "Use 80 characters or fewer"),
});

export type OrganizationNameFormValues = z.infer<typeof organizationNameSchema>;
