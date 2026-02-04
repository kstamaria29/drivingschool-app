import { z } from "zod";

export const onboardingCreateOrgSchema = z.object({
  organizationName: z.string().min(2, "Enter your driving school name"),
  displayName: z.string().min(2, "Enter your display name"),
});

export type OnboardingCreateOrgFormValues = z.infer<typeof onboardingCreateOrgSchema>;

