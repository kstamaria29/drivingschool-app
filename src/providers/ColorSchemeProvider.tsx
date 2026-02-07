import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useColorScheme, vars } from "nativewind";

import {
  DEFAULT_DARK_THEME_KEY,
  DEFAULT_LIGHT_THEME_KEY,
  isDarkThemeKey,
  isLightThemeKey,
  type DarkThemeKey,
  type LightThemeKey,
  type AppThemeKey,
} from "../theme/palettes";
import { applyThemeColors, getThemeColorVariables } from "../theme/theme";

export type AppColorScheme = "light" | "dark";

type Value = {
  scheme: AppColorScheme;
  setScheme: (next: AppColorScheme) => void;
  themeKey: AppThemeKey;
  setThemeKey: (next: AppThemeKey) => void;
  lightThemeKey: LightThemeKey;
  setLightThemeKey: (next: LightThemeKey) => void;
  darkThemeKey: DarkThemeKey;
  setDarkThemeKey: (next: DarkThemeKey) => void;
  ready: boolean;
};

const SCHEME_STORAGE_KEY = "drivingschool.colorScheme.v1";
const LIGHT_THEME_STORAGE_KEY = "drivingschool.lightTheme.v1";
const DARK_THEME_STORAGE_KEY = "drivingschool.darkTheme.v1";
const LEGACY_THEME_STORAGE_KEY = "drivingschool.customTheme.v1";

const LEGACY_THEME_KEY_MAP: Record<string, { light: LightThemeKey; dark: DarkThemeKey }> = {
  classic: { light: "lightDefault", dark: "darkDefault" },
  sunsetRush: { light: "sunriseBoulevard", dark: "emberNight" },
  oceanVelocity: { light: "coastalPaper", dark: "deepOcean" },
  neonMidnight: { light: "slateSignal", dark: "carbonNeon" },
  forestCircuit: { light: "mintLedger", dark: "graphiteLime" },
  royalPulse: { light: "roseQuartz", dark: "obsidianRose" },
  desertDrift: { light: "amberStudio", dark: "emberNight" },
};

const ColorSchemeContext = createContext<Value | null>(null);

export function ColorSchemeProvider({ children }: PropsWithChildren) {
  const { setColorScheme } = useColorScheme();
  const [scheme, setSchemeState] = useState<AppColorScheme>("light");
  const [lightThemeKey, setLightThemeKeyState] = useState<LightThemeKey>(DEFAULT_LIGHT_THEME_KEY);
  const [darkThemeKey, setDarkThemeKeyState] = useState<DarkThemeKey>(DEFAULT_DARK_THEME_KEY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let canceled = false;
    async function load() {
      try {
        const [storedScheme, storedLightTheme, storedDarkTheme, legacyTheme] = await Promise.all([
          AsyncStorage.getItem(SCHEME_STORAGE_KEY),
          AsyncStorage.getItem(LIGHT_THEME_STORAGE_KEY),
          AsyncStorage.getItem(DARK_THEME_STORAGE_KEY),
          AsyncStorage.getItem(LEGACY_THEME_STORAGE_KEY),
        ]);
        if (canceled) return;

        const nextScheme: AppColorScheme = storedScheme === "dark" ? "dark" : "light";
        const mappedLegacy = legacyTheme ? LEGACY_THEME_KEY_MAP[legacyTheme] : undefined;
        const nextLightTheme = isLightThemeKey(storedLightTheme)
          ? storedLightTheme
          : mappedLegacy?.light ?? DEFAULT_LIGHT_THEME_KEY;
        const nextDarkTheme = isDarkThemeKey(storedDarkTheme)
          ? storedDarkTheme
          : mappedLegacy?.dark ?? DEFAULT_DARK_THEME_KEY;

        setSchemeState(nextScheme);
        setLightThemeKeyState(nextLightTheme);
        setDarkThemeKeyState(nextDarkTheme);
        setColorScheme(nextScheme);
        applyThemeColors(nextLightTheme, nextDarkTheme, nextScheme);
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
    applyThemeColors(lightThemeKey, darkThemeKey, scheme);
  }, [darkThemeKey, lightThemeKey, scheme]);

  const themeVariables = useMemo(
    () => vars(getThemeColorVariables(lightThemeKey, darkThemeKey, scheme)),
    [darkThemeKey, lightThemeKey, scheme],
  );

  const activeThemeKey: AppThemeKey = scheme === "dark" ? darkThemeKey : lightThemeKey;

  const value = useMemo<Value>(
    () => ({
      scheme,
      themeKey: activeThemeKey,
      lightThemeKey,
      darkThemeKey,
      ready,
      setScheme: (next) => {
        setSchemeState(next);
        setColorScheme(next);
        void AsyncStorage.setItem(SCHEME_STORAGE_KEY, next);
      },
      setLightThemeKey: (next) => {
        if (!isLightThemeKey(next)) return;
        setLightThemeKeyState(next);
        void AsyncStorage.setItem(LIGHT_THEME_STORAGE_KEY, next);
        void AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      },
      setDarkThemeKey: (next) => {
        if (!isDarkThemeKey(next)) return;
        setDarkThemeKeyState(next);
        void AsyncStorage.setItem(DARK_THEME_STORAGE_KEY, next);
        void AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      },
      setThemeKey: (next) => {
        if (scheme === "dark") {
          if (!isDarkThemeKey(next)) return;
          setDarkThemeKeyState(next);
          void AsyncStorage.setItem(DARK_THEME_STORAGE_KEY, next);
        } else {
          if (!isLightThemeKey(next)) return;
          setLightThemeKeyState(next);
          void AsyncStorage.setItem(LIGHT_THEME_STORAGE_KEY, next);
        }
        void AsyncStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      },
    }),
    [activeThemeKey, darkThemeKey, lightThemeKey, ready, scheme, setColorScheme],
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
