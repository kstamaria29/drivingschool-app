// Supabase Edge Function: create-instructor
// Creates an instructor auth user + profile row for the caller's organization.
// Access: authenticated owners/admins only.

import { createClient } from "npm:@supabase/supabase-js@2";

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

function generateTemporaryPassword() {
  const rand = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  const suffix = String(rand % 10_000).padStart(4, "0");
  return `Drive-${suffix}`;
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
    data: { user: caller },
    error: callerError,
  } = await supabase.auth.getUser(accessToken);

  if (callerError || !caller) {
    return json(401, { error: "invalid_token" });
  }

  const { data: callerProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, organization_id, role")
    .eq("id", caller.id)
    .maybeSingle();

  if (profileError) {
    return json(500, { error: "failed_to_load_profile" });
  }

  const canManageInstructors =
    callerProfile?.role === "owner" || callerProfile?.role === "admin";

  if (!canManageInstructors) {
    return json(403, { error: "forbidden" });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "invalid_json" });
  }

  const input = payload as Partial<{ email: string; firstName: string; lastName: string }>;
  const email = (input.email ?? "").trim().toLowerCase();
  const firstName = (input.firstName ?? "").trim();
  const lastName = (input.lastName ?? "").trim();

  if (!email || !email.includes("@")) return json(400, { error: "email_required" });
  if (!firstName) return json(400, { error: "first_name_required" });
  if (!lastName) return json(400, { error: "last_name_required" });

  const temporaryPassword = generateTemporaryPassword();

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });

  if (createError || !created.user) {
    return json(400, { error: createError?.message ?? "create_user_failed" });
  }

  const newUserId = created.user.id;
  const displayName = `${firstName} ${lastName}`.trim();

  const { error: insertError } = await supabase.from("profiles").insert({
    id: newUserId,
    organization_id: callerProfile.organization_id,
    role: "instructor",
    display_name: displayName,
    first_name: firstName,
    last_name: lastName,
    must_change_password: true,
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(newUserId);
    return json(400, { error: insertError.message });
  }

  return json(200, { userId: newUserId, email, temporaryPassword });
});
