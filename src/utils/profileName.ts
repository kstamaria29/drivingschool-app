export type ProfileNameFields = {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
};

export function getProfileFullName(profile: ProfileNameFields) {
  const first = (profile.first_name ?? "").trim();
  const last = (profile.last_name ?? "").trim();

  const fromParts = `${first} ${last}`.trim();
  if (first && last) return fromParts;

  const display = (profile.display_name ?? "").trim();
  return display || fromParts;
}

