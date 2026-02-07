import { z } from "zod";

export const editNameSchema = z.object({
  firstName: z.string().min(2, "Enter a first name"),
  lastName: z.string().min(2, "Enter a last name"),
});

export type EditNameFormValues = z.infer<typeof editNameSchema>;

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(6, "Enter your current password"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmNewPassword: z.string().min(8, "Confirm your new password"),
  })
  .refine((v) => v.newPassword === v.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export const roleDisplaySchema = z.object({
  roleDisplayName: z
    .string()
    .trim()
    .min(2, "Enter at least 2 characters")
    .max(40, "Use 40 characters or fewer"),
});

export type RoleDisplayFormValues = z.infer<typeof roleDisplaySchema>;
