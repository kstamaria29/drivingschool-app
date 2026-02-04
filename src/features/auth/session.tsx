import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../supabase/client";

type AuthSessionValue = {
  session: Session | null;
  isLoading: boolean;
};

const AuthSessionContext = createContext<AuthSessionValue | null>(null);

export function AuthSessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    async function init() {
      const maxAttempts = 4;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const { data, error } = await supabase.auth.getSession();
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

        setSession(data.session);
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
