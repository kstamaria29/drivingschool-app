// Supabase Edge Function: send-test-notification
// Sends a push notification to all of the caller's registered Expo push tokens.
// Access: authenticated users only.

import { createClient } from "npm:@supabase/supabase-js@2";

const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
} as const;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

type Category = "downloads" | "student_reminders" | "lesson_reminders" | "daily_digest";

function androidChannelId(input: { category: Category; sound: boolean; vibrate: boolean }) {
  const base =
    input.category === "downloads"
      ? "downloads"
      : input.category === "student_reminders"
        ? "student-reminders"
        : input.category === "lesson_reminders"
          ? "lesson-reminders"
          : "daily-digest";
  const soundTag = input.sound ? "sound" : "nosound";
  const vibrateTag = input.vibrate ? "vibrate" : "novibrate";
  return `${base}-${soundTag}-${vibrateTag}`;
}

function toBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function buildTestMessage(category: Category) {
  if (category === "daily_digest") {
    return {
      title: "Test: Today's lessons",
      body: "This is a test daily digest notification.",
    };
  }
  if (category === "lesson_reminders") {
    return {
      title: "Test: Upcoming lesson",
      body: "This is a test upcoming lesson reminder notification.",
    };
  }
  if (category === "student_reminders") {
    return {
      title: "Test: Student reminder",
      body: "This is a test student reminder notification.",
    };
  }
  return {
    title: "Test: Download saved",
    body: "This is a test PDF saved notification.",
  };
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default";
  channelId?: string;
};

async function sendExpoPush(messages: ExpoPushMessage[]) {
  const chunks = chunk(messages, 100);
  const results: Array<{ status: number; ok: boolean; body: unknown }> = [];

  for (const part of chunks) {
    const response = await fetch(EXPO_PUSH_SEND_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(part),
    });

    const raw = await response.text();
    let payload: unknown = raw;
    if (raw) {
      try {
        payload = JSON.parse(raw);
      } catch {
        payload = raw;
      }
    }

    results.push({ status: response.status, ok: response.ok, body: payload });
  }

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "method_not_allowed" });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return json(500, { error: "server_not_configured" });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return json(401, { error: "missing_authorization" });
  }
  const accessToken = authHeader.slice(7).trim();
  if (!accessToken) {
    return json(401, { error: "missing_authorization" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return json(401, { error: "invalid_token" });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const body = payload as Partial<{ category: string }>;
  const category = body.category as Category | undefined;
  const allowed: Category[] = ["downloads", "student_reminders", "lesson_reminders", "daily_digest"];
  if (!category || !allowed.includes(category)) {
    return json(400, { error: "invalid_category" });
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return json(400, { error: "profile_not_found" });
  }

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("profile_id", user.id)
    .maybeSingle();

  const categorySoundEnabled =
    category === "downloads"
      ? toBoolean(settings?.downloads_sound_enabled, true)
      : category === "student_reminders"
        ? toBoolean(settings?.student_reminders_sound_enabled, true)
        : category === "lesson_reminders"
          ? toBoolean(settings?.lesson_reminders_sound_enabled, true)
          : toBoolean(settings?.daily_digest_sound_enabled, false);

  const categoryVibrationEnabled =
    category === "downloads"
      ? toBoolean(settings?.downloads_vibration_enabled, true)
      : category === "student_reminders"
        ? toBoolean(settings?.student_reminders_vibration_enabled, true)
        : category === "lesson_reminders"
          ? toBoolean(settings?.lesson_reminders_vibration_enabled, true)
          : toBoolean(settings?.daily_digest_vibration_enabled, false);

  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("expo_push_token")
    .eq("profile_id", user.id);

  if (tokensError) {
    return json(500, { error: "failed_to_load_push_tokens" });
  }

  const expoTokens = (tokens ?? [])
    .map((row) => row.expo_push_token)
    .filter((value): value is string => typeof value === "string" && value.length > 0);

  if (!expoTokens.length) {
    return json(400, { error: "no_push_tokens_registered" });
  }

  const messageBase = buildTestMessage(category);
  const channelId = androidChannelId({
    category,
    sound: categorySoundEnabled,
    vibrate: categoryVibrationEnabled,
  });

  const messages: ExpoPushMessage[] = expoTokens.map((to) => ({
    to,
    title: messageBase.title,
    body: messageBase.body,
    data: { category, kind: "test" },
    ...(categorySoundEnabled ? { sound: "default" } : null),
    channelId,
  }));

  const results = await sendExpoPush(messages);
  return json(200, { ok: true, sent: messages.length, results });
});
