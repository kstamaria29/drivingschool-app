import type { DrawerNavigationOptions } from "@react-navigation/drawer";
import { DarkTheme, DefaultTheme } from "@react-navigation/native";
import type { Theme } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

import type { AppColorScheme } from "../providers/ColorSchemeProvider";
import { theme as appTheme } from "../theme/theme";

function getPalette(scheme: AppColorScheme) {
  const isDark = scheme === "dark";
  return {
    isDark,
    primary: isDark ? appTheme.colors.primaryDark : appTheme.colors.primary,
    background: isDark ? appTheme.colors.backgroundDark : appTheme.colors.backgroundLight,
    card: isDark ? appTheme.colors.cardDark : appTheme.colors.cardLight,
    border: isDark ? appTheme.colors.borderDark : appTheme.colors.borderLight,
    text: isDark ? appTheme.colors.foregroundDark : appTheme.colors.foregroundLight,
    muted: isDark ? appTheme.colors.mutedDark : appTheme.colors.mutedLight,
  };
}

export function getNavigationTheme(scheme: AppColorScheme): Theme {
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  const palette = getPalette(scheme);

  return {
    ...base,
    dark: palette.isDark,
    colors: {
      ...base.colors,
      primary: palette.primary,
      background: palette.background,
      card: palette.card,
      border: palette.border,
      text: palette.text,
      notification: appTheme.colors.accent,
    },
  };
}

export function getNativeStackScreenOptions(
  scheme: AppColorScheme,
): NativeStackNavigationOptions {
  const palette = getPalette(scheme);

  return {
    headerShadowVisible: false,
    headerStyle: { backgroundColor: palette.card },
    headerTintColor: palette.text,
    headerTitleStyle: { color: palette.text },
    contentStyle: { backgroundColor: palette.background },
  };
}

export function getDrawerScreenOptions(
  scheme: AppColorScheme,
  drawerWidth?: number,
): DrawerNavigationOptions {
  const palette = getPalette(scheme);

  return {
    sceneStyle: { backgroundColor: palette.background },
    drawerStyle: {
      backgroundColor: palette.background,
      ...(drawerWidth ? { width: drawerWidth } : null),
    },
    drawerContentStyle: { backgroundColor: palette.background },
  };
}
