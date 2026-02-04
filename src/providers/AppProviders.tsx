import type { PropsWithChildren } from "react";

import { AuthSessionProvider } from "../features/auth/session";

import { QueryProvider } from "./QueryProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryProvider>
      <AuthSessionProvider>{children}</AuthSessionProvider>
    </QueryProvider>
  );
}

