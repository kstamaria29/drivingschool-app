import type { PropsWithChildren } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthSessionProvider } from "../features/auth/session";

import { ColorSchemeProvider } from "./ColorSchemeProvider";
import { QueryProvider } from "./QueryProvider";

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <ColorSchemeProvider>
        <QueryProvider>
          <AuthSessionProvider>{children}</AuthSessionProvider>
        </QueryProvider>
      </ColorSchemeProvider>
    </SafeAreaProvider>
  );
}
