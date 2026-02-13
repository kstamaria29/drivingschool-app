import type { PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Font from "expo-font";

import { fonts, type FontPack } from "../theme/fonts";
import { getPremiumFontPackConfig } from "../theme/premiumFonts";

import { useAppColorScheme } from "./ColorSchemeProvider";

type Value = {
  fonts: FontPack;
};

const ThemeFontsContext = createContext<Value | null>(null);

export function ThemeFontsProvider({ children }: PropsWithChildren) {
  const { themeKey } = useAppColorScheme();
  const [activeFonts, setActiveFonts] = useState<FontPack>(fonts);

  useEffect(() => {
    let canceled = false;

    async function applyFontsForTheme() {
      const premiumConfig = getPremiumFontPackConfig(themeKey);
      if (!premiumConfig) {
        setActiveFonts(fonts);
        return;
      }

      try {
        await Font.loadAsync(premiumConfig.sources);
        if (canceled) return;
        setActiveFonts(premiumConfig.pack);
      } catch {
        if (canceled) return;
        setActiveFonts(fonts);
      }
    }

    void applyFontsForTheme();

    return () => {
      canceled = true;
    };
  }, [themeKey]);

  const value = useMemo<Value>(() => ({ fonts: activeFonts }), [activeFonts]);

  return <ThemeFontsContext.Provider value={value}>{children}</ThemeFontsContext.Provider>;
}

export function useThemeFonts() {
  const value = useContext(ThemeFontsContext);
  if (!value) {
    throw new Error("useThemeFonts must be used within ThemeFontsProvider");
  }
  return value;
}

