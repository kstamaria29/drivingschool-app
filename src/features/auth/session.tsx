import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../supabase/client";
import { isSupabaseConfigured } from "../../supabase/env";

type AuthSessionValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

type AuthLikeError = {
  code?: string;
  message?: string;
  status?: number;
};

function isStaleSessionError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const authError = error as AuthLikeError;
  const message = authError.message?.toLowerCase() ?? "";

  if (authError.status === 401 || authError.status === 403 || authError.status === 404) {
    return true;
  }

  return (
    message.includes("auth session missing") ||
    message.includes("invalid jwt") ||
    message.includes("jwt expired") ||
    message.includes("session_not_found") ||
    message.includes("user from sub claim in jwt does not exist")
  );
}

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(() => isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setSession(null);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const clearLocalSession = async () => {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) {
        // Keep startup resilient even if storage cleanup fails.
        console.warn("Failed to clear local Supabase session", error);
      }
    };
    const validateRestoredSession = async (nextSession: Session | null) => {
      if (!nextSession) return null;

      const { data, error } = await supabase.auth.getUser(nextSession.access_token);
      if (error) {
        if (isStaleSessionError(error)) {
          await clearLocalSession();
          return null;
        }

        return nextSession;
      }

      if (!data.user) {
        await clearLocalSession();
        return null;
      }

      return nextSession;
    };

    async function init() {
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        let nextSession: Session | null = null;
        let error: unknown = null;

        try {
          const result = await supabase.auth.getSession();
          nextSession = result.data.session;
          error = result.error;
        } catch (e) {
          error = e;
        }

        if (!isMounted) return;

        if (error) {
          const isAcquireTimeout =
            typeof error === "object" && error !== null && "isAcquireTimeout" in error
              ? Boolean((error as { isAcquireTimeout?: unknown }).isAcquireTimeout)
              : false;

          if (isAcquireTimeout && attempt < maxAttempts) {
            await sleep(200 * attempt);
            continue;
          }

          setSession(null);
          setIsLoading(false);
          return;
        }

        const validatedSession = await validateRestoredSession(nextSession);
        if (!isMounted) return;

        setSession(validatedSession);
        setIsLoading(false);
        return;
      }

      if (!isMounted) return;
      setIsLoading(false);
    }

    void init();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthSessionValue>(() => ({ session, isLoading }), [session, isLoading]);

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const value = useContext(AuthSessionContext);
  if (!value) {
    throw new Error("useAuthSession must be used within AuthSessionProvider");
  }
  return value;
}
