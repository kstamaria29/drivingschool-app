import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "nativewind";

export type AppColorScheme = "light" | "dark";

type Value = {
  scheme: AppColorScheme;
  setScheme: (next: AppColorScheme) => void;
  ready: boolean;
};

const STORAGE_KEY = "drivingschool.colorScheme.v1";

const ColorSchemeContext = createContext<Value | null>(null);

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const { setColorScheme } = useColorScheme();
  const [scheme, setSchemeState] = useState<AppColorScheme>("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load() {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (canceled) return;
        const nextScheme: AppColorScheme = stored === "dark" ? "dark" : "light";
        setSchemeState(nextScheme);
        setColorScheme(nextScheme);
      } finally {
        if (!canceled) setReady(true);
      }
    }
    void load();
    return () => {
      canceled = true;
    };
  }, [setColorScheme]);

  const value = useMemo<Value>(
    () => ({
      scheme,
      ready,
      setScheme: (next) => {
        setSchemeState(next);
        setColorScheme(next);
        void AsyncStorage.setItem(STORAGE_KEY, next);
      },
    }),
    [ready, scheme, setColorScheme],
  );

  return <ColorSchemeContext.Provider value={value}>{children}</ColorSchemeContext.Provider>;
}

export function useAppColorScheme() {
  const value = useContext(ColorSchemeContext);
  if (!value) {
    throw new Error("useAppColorScheme must be used within ColorSchemeProvider");
  }
  return value;
}
