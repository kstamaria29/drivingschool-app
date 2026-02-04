import { AppState, Platform } from "react-native";

import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, processLock } from "@supabase/supabase-js";

import type { Database } from "./types";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";

const createSupabaseClient = () =>
  createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      ...(Platform.OS !== "web" ? { storage: AsyncStorage } : {}),
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      // lock: processLock,
    },
  });

type SupabaseClientType = ReturnType<typeof createSupabaseClient>;

type GlobalSupabase = typeof globalThis & {
  __drivingschool_supabase?: SupabaseClientType;
  __drivingschool_supabase_appstate_listener?: boolean;
};

const globalSupabase = globalThis as GlobalSupabase;

export const supabase = globalSupabase.__drivingschool_supabase ?? createSupabaseClient();

globalSupabase.__drivingschool_supabase = supabase;

if (Platform.OS !== "web" && !globalSupabase.__drivingschool_supabase_appstate_listener) {
  globalSupabase.__drivingschool_supabase_appstate_listener = true;

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      supabase.auth.startAutoRefresh();
      return;
    }
    supabase.auth.stopAutoRefresh();
  });
}
