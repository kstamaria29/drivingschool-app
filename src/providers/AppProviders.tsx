import type { PropsWithChildren } from "react";

import { AuthSessionProvider } from "../features/auth/session";

import { ColorSchemeProvider } from "./ColorSchemeProvider";
import { QueryProvider } from "./QueryProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ColorSchemeProvider>
      <QueryProvider>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </QueryProvider>
    </ColorSchemeProvider>
  );
}
