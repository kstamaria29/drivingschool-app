export const STUDENT_ORGANIZATION_OPTIONS = [
  "Private",
  "UMMA Trust",
  "Renaissance",
  "Lifeskill",
] as const;

export function normalizeStudentOrganization(value: string) {
  return value.trim().replace(/\s+/g, " ");
}
