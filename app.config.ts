import type { ConfigContext, ExpoConfig } from "expo/config";

// Ensure `.env` is loaded when Expo evaluates this config locally.
// In EAS builds, use EAS Environment Variables / Secrets instead.
import "dotenv/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = (config.extra ?? {}) as Record<string, unknown>;

  return {
    ...config,
    extra: {
      ...extra,
      supabaseUrl:
        process.env.EXPO_PUBLIC_SUPABASE_URL ??
        (typeof extra.supabaseUrl === "string" ? extra.supabaseUrl : undefined),
      supabaseAnonKey:
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
        (typeof extra.supabaseAnonKey === "string" ? extra.supabaseAnonKey : undefined),
    },
  };
};

