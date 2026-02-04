import type { AuthError, Session } from "@supabase/supabase-js";

import { supabase } from "../../supabase/client";
import type { Database } from "../../supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export async function getMyProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle()
    .overrideTypes<Profile, { merge: false }>();

  if (error) throw error;
  return data ?? null;
}

export type SignInWithPasswordInput = {
  email: string;
  password: string;
};

export async function signInWithPassword(input: SignInWithPasswordInput) {
  const { data, error } = await supabase.auth.signInWithPassword(input);
  if (error) throw error;
  return data;
}

export type SignUpWithPasswordInput = {
  email: string;
  password: string;
};

export type SignUpWithPasswordResult =
  | { kind: "signed-in"; session: Session }
  | { kind: "needs-email-confirmation" };

export async function signUpWithPassword(
  input: SignUpWithPasswordInput,
): Promise<SignUpWithPasswordResult> {
  const { data, error } = await supabase.auth.signUp(input);
  if (error) throw error;

  if (data.session) {
    return { kind: "signed-in", session: data.session };
  }

  return { kind: "needs-email-confirmation" };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function toUserFacingAuthError(error: unknown) {
  const authError = error as Partial<AuthError> | null;
  if (authError?.message) return authError.message;
  return "Something went wrong. Please try again.";
}
