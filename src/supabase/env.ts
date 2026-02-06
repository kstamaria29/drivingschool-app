import Constants from "expo-constants";

type ExpoExtra = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

function readExtra(): ExpoExtra {
  const fromExpoConfig = Constants.expoConfig?.extra;
  if (fromExpoConfig && typeof fromExpoConfig === "object") {
    return fromExpoConfig as ExpoExtra;
  }

  // Fallbacks for different Expo constants shapes.
  const anyConstants = Constants as unknown as {
    manifest?: { extra?: ExpoExtra };
    manifest2?: { extra?: ExpoExtra };
  };

  return anyConstants.manifest2?.extra ?? anyConstants.manifest?.extra ?? {};
}

const extra = readExtra();

// Note: `EXPO_PUBLIC_*` variables are inlined at build-time and must be accessed statically.
export const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ?? extra.supabaseUrl ?? "";
export const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? extra.supabaseAnonKey ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

