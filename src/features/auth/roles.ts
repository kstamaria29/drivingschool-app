import type { Profile } from "./api";

export function isOwnerOrAdminRole(role: Profile["role"] | null | undefined) {
  return role === "owner" || role === "admin";
}

export function toRoleLabel(role: Profile["role"] | null | undefined) {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  if (role === "instructor") return "Instructor";
  return "Unknown";
}

type RoleDisplayProfile = {
  role: Profile["role"] | null | undefined;
  role_display_name?: string | null;
};

export function getRoleDisplayLabel(profile: RoleDisplayProfile) {
  const custom = (profile.role_display_name ?? "").trim();
  if (custom) return custom;
  return toRoleLabel(profile.role);
}
