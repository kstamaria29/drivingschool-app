import { APP_THEME_PRESETS, DEFAULT_APP_THEME_KEY, type AppThemeKey } from "./palettes";

type ThemeColorSet = {
  placeholder: string;
  backgroundLight: string;
  backgroundDark: string;
  foregroundLight: string;
  foregroundDark: string;
  cardLight: string;
  cardDark: string;
  borderLight: string;
  borderDark: string;
  mutedLight: string;
  mutedDark: string;
  primary: string;
  primaryDark: string;
  primaryForeground: string;
  accent: string;
  accentForeground: string;
  danger: string;
  dangerDark: string;
};

function resolveThemeColors(themeKey: AppThemeKey): ThemeColorSet {
  const palette = APP_THEME_PRESETS[themeKey];
  return {
    placeholder: palette.light.muted,
    backgroundLight: palette.light.background,
    backgroundDark: palette.dark.background,
    foregroundLight: palette.light.foreground,
    foregroundDark: palette.dark.foreground,
    cardLight: palette.light.card,
    cardDark: palette.dark.card,
    borderLight: palette.light.border,
    borderDark: palette.dark.border,
    mutedLight: palette.light.muted,
    mutedDark: palette.dark.muted,
    primary: palette.light.primary,
    primaryDark: palette.dark.primary,
    primaryForeground: "#ffffff",
    accent: palette.accent,
    accentForeground: palette.dark.foreground,
    danger: palette.light.danger,
    dangerDark: palette.dark.danger,
  };
}

function hexToRgbChannels(hex: string) {
  const normalized = hex.replace("#", "");
  const sixCharHex =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const parsed = Number.parseInt(sixCharHex, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return `${r} ${g} ${b}`;
}

export function getThemeColorVariables(themeKey: AppThemeKey) {
  const colors = resolveThemeColors(themeKey);
  return {
    "--color-placeholder": hexToRgbChannels(colors.placeholder),
    "--color-background": hexToRgbChannels(colors.backgroundLight),
    "--color-background-dark": hexToRgbChannels(colors.backgroundDark),
    "--color-foreground": hexToRgbChannels(colors.foregroundLight),
    "--color-foreground-dark": hexToRgbChannels(colors.foregroundDark),
    "--color-card": hexToRgbChannels(colors.cardLight),
    "--color-card-dark": hexToRgbChannels(colors.cardDark),
    "--color-border": hexToRgbChannels(colors.borderLight),
    "--color-border-dark": hexToRgbChannels(colors.borderDark),
    "--color-muted": hexToRgbChannels(colors.mutedLight),
    "--color-muted-dark": hexToRgbChannels(colors.mutedDark),
    "--color-primary": hexToRgbChannels(colors.primary),
    "--color-primary-dark": hexToRgbChannels(colors.primaryDark),
    "--color-primary-foreground": hexToRgbChannels(colors.primaryForeground),
    "--color-accent": hexToRgbChannels(colors.accent),
    "--color-accent-foreground": hexToRgbChannels(colors.accentForeground),
    "--color-danger": hexToRgbChannels(colors.danger),
    "--color-danger-dark": hexToRgbChannels(colors.dangerDark),
  } as const;
}

const activeColors: ThemeColorSet = resolveThemeColors(DEFAULT_APP_THEME_KEY);

export function applyThemeColors(themeKey: AppThemeKey) {
  Object.assign(activeColors, resolveThemeColors(themeKey));
}

export const theme = {
  colors: activeColors,
  screen: {
    safeArea: "flex-1 bg-background dark:bg-backgroundDark",
    scrollContent: "flex-grow",
    container: "flex-1 w-full max-w-[720px] self-center px-6 py-6",
  },
  text: {
    base: "text-foreground dark:text-foregroundDark",
    variant: {
      title: "text-3xl",
      heading: "text-xl",
      body: "text-base",
      caption: "text-sm text-muted dark:text-mutedDark",
      label: "text-sm",
      error: "text-sm text-danger dark:text-dangerDark",
      button: "text-base",
    },
  },
  button: {
    base: "items-center justify-center rounded-xl border shadow-sm shadow-black/5 dark:shadow-black/30",
    disabled: "opacity-60",
    size: {
      md: "h-12 px-4",
      lg: "h-14 px-5",
      icon: "h-10 w-10 p-0",
    },
    variant: {
      primary: "bg-primary border-primary dark:bg-primaryDark dark:border-primaryDark",
      secondary: "bg-card border-border dark:bg-cardDark dark:border-borderDark",
      danger: "bg-danger border-danger dark:bg-dangerDark dark:border-dangerDark",
      ghost: "bg-transparent border-0 shadow-none",
    },
    labelBase: "",
    labelVariant: {
      primary: "text-primaryForeground",
      secondary: "text-foreground dark:text-foregroundDark",
      danger: "text-primaryForeground",
      ghost: "text-primary dark:text-primaryDark",
    },
  },
  input: {
    wrapper: "",
    base: "mt-2 h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground dark:border-borderDark dark:bg-cardDark dark:text-foregroundDark",
    error: "border-danger dark:border-dangerDark",
  },
  card: {
    base: "rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 dark:border-borderDark dark:bg-cardDark dark:shadow-black/30",
  },
};
