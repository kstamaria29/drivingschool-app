import { supabase } from "../../supabase/client";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "../../supabase/env";

export type CreateInstructorInput = {
  email: string;
  firstName: string;
  lastName: string;
};

export type CreateInstructorResult = {
  userId: string;
  email: string;
  temporaryPassword: string;
};

function readErrorMessage(payload: unknown, status: number, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    const error = typeof record.error === "string" ? record.error : null;
    const message = typeof record.message === "string" ? record.message : null;
    if (error) return `${fallback} (${status}): ${error}`;
    if (message) return `${fallback} (${status}): ${message}`;
  }
  return `${fallback} (${status})`;
}

export async function createInstructor(input: CreateInstructorInput): Promise<CreateInstructorResult> {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error("You're not signed in. Please sign in again and retry.");
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/create-instructor`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    throw new Error(readErrorMessage(payload, response.status, "Instructor creation failed"));
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Instructor creation failed: invalid function response.");
  }

  const record = payload as Partial<CreateInstructorResult>;
  if (!record.userId || !record.email || !record.temporaryPassword) {
    throw new Error("Instructor creation failed: incomplete function response.");
  }

  return {
    userId: record.userId,
    email: record.email,
    temporaryPassword: record.temporaryPassword,
  };
}
