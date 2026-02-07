import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useColorScheme, vars } from "nativewind";

import {
  APP_THEME_PRESETS,
  DEFAULT_APP_THEME_KEY,
  isAppThemeKey,
  type AppThemeKey,
} from "../theme/palettes";
import { applyThemeColors, getThemeColorVariables } from "../theme/theme";

export type AppColorScheme = "light" | "dark";

type Value = {
  scheme: AppColorScheme;
  setScheme: (next: AppColorScheme) => void;
  themeKey: AppThemeKey;
  setThemeKey: (next: AppThemeKey) => void;
  ready: boolean;
};

const SCHEME_STORAGE_KEY = "drivingschool.colorScheme.v1";
const THEME_STORAGE_KEY = "drivingschool.customTheme.v1";

const ColorSchemeContext = createContext<Value | null>(null);

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const { setColorScheme } = useColorScheme();
  const [scheme, setSchemeState] = useState<AppColorScheme>("light");
  const [themeKey, setThemeKeyState] = useState<AppThemeKey>(DEFAULT_APP_THEME_KEY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load() {
      try {
        const [storedScheme, storedTheme] = await Promise.all([
          AsyncStorage.getItem(SCHEME_STORAGE_KEY),
          AsyncStorage.getItem(THEME_STORAGE_KEY),
        ]);
        if (canceled) return;
        const nextScheme: AppColorScheme = storedScheme === "dark" ? "dark" : "light";
        const nextTheme = isAppThemeKey(storedTheme) ? storedTheme : DEFAULT_APP_THEME_KEY;
        setSchemeState(nextScheme);
        setThemeKeyState(nextTheme);
        setColorScheme(nextScheme);
        applyThemeColors(nextTheme);
      } finally {
        if (!canceled) setReady(true);
      }
    }
    void load();
    return () => {
      canceled = true;
    };
  }, [setColorScheme]);

  useEffect(() => {
    applyThemeColors(themeKey);
  }, [themeKey]);

  const themeVariables = useMemo(() => vars(getThemeColorVariables(themeKey)), [themeKey]);

  const value = useMemo<Value>(
    () => ({
      scheme,
      themeKey,
      ready,
      setScheme: (next) => {
        setSchemeState(next);
        setColorScheme(next);
        void AsyncStorage.setItem(SCHEME_STORAGE_KEY, next);
      },
      setThemeKey: (next) => {
        if (!(next in APP_THEME_PRESETS)) return;
        setThemeKeyState(next);
        void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
      },
    }),
    [ready, scheme, setColorScheme, themeKey],
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      <View className="flex-1" style={themeVariables}>
        {children}
      </View>
    </ColorSchemeContext.Provider>
  );
}

export function useAppColorScheme() {
  const value = useContext(ColorSchemeContext);
  if (!value) {
    throw new Error("useAppColorScheme must be used within ColorSchemeProvider");
  }
  return value;
}
