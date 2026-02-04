function getRequiredEnv(key: string) {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export const SUPABASE_URL = getRequiredEnv("EXPO_PUBLIC_SUPABASE_URL");
export const SUPABASE_ANON_KEY = getRequiredEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

