import type { Profile } from "./api";

export function isOwnerOrAdminRole(role: Profile["role"] | null | undefined) {
  return role === "owner" || role === "admin";
}
