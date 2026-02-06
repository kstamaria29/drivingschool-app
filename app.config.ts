import type { ConfigContext, ExpoConfig } from "expo/config";

// Ensure `.env` is loaded when Expo evaluates this config locally.
// In EAS builds, use EAS Environment Variables / Secrets instead.
import "dotenv/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = (config.extra ?? {}) as Record<string, unknown>;
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY;
  const iosConfig = config.ios ?? {};
  const androidConfig = config.android ?? {};
  const androidNativeConfig = (androidConfig.config ?? {}) as Record<string, unknown>;
  const existingGoogleMapsConfig = (androidNativeConfig.googleMaps ?? {}) as Record<string, unknown>;

  const resolvedIosNativeConfig = googleMapsApiKey
    ? {
        ...(iosConfig.config ?? {}),
        googleMapsApiKey,
      }
    : iosConfig.config;

  const resolvedAndroidNativeConfig = googleMapsApiKey
    ? {
        ...androidNativeConfig,
        googleMaps: {
          ...existingGoogleMapsConfig,
          apiKey: googleMapsApiKey,
        },
      }
    : androidConfig.config;

  return {
    ...config,
    ios: {
      ...iosConfig,
      ...(resolvedIosNativeConfig ? { config: resolvedIosNativeConfig } : null),
    },
    android: {
      ...androidConfig,
      ...(resolvedAndroidNativeConfig ? { config: resolvedAndroidNativeConfig } : null),
    },
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
