type ThemeTone = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  primary: string;
  danger: string;
};

type ThemePreset = {
  name: string;
  description: string;
  accent: string;
  light: ThemeTone;
  dark: ThemeTone;
};

export const APP_THEME_PRESETS = {
  classic: {
    name: "Classic Blue",
    description: "Clean blue and teal for a confident, professional look.",
    accent: "#14b8a6",
    light: {
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      border: "#e2e8f0",
      muted: "#64748b",
      primary: "#1d4ed8",
      danger: "#dc2626",
    },
    dark: {
      background: "#0b1220",
      foreground: "#e2e8f0",
      card: "#111a2a",
      border: "#23324a",
      muted: "#94a3b8",
      primary: "#3b82f6",
      danger: "#f87171",
    },
  },
  sunsetRush: {
    name: "Sunset Rush",
    description: "Warm coral and ember tones with high-energy contrast.",
    accent: "#f97316",
    light: {
      background: "#fff7ed",
      foreground: "#3f1d0f",
      card: "#ffffff",
      border: "#fed7aa",
      muted: "#9a5a2b",
      primary: "#ea580c",
      danger: "#dc2626",
    },
    dark: {
      background: "#1f1308",
      foreground: "#ffedd5",
      card: "#2a190c",
      border: "#7c2d12",
      muted: "#fdba74",
      primary: "#fb923c",
      danger: "#f87171",
    },
  },
  oceanVelocity: {
    name: "Ocean Velocity",
    description: "Electric cyan and deep sea blues tuned for focus.",
    accent: "#06b6d4",
    light: {
      background: "#ecfeff",
      foreground: "#0b2533",
      card: "#ffffff",
      border: "#a5f3fc",
      muted: "#155e75",
      primary: "#0284c7",
      danger: "#e11d48",
    },
    dark: {
      background: "#082f49",
      foreground: "#e0f2fe",
      card: "#0a3a5c",
      border: "#075985",
      muted: "#67e8f9",
      primary: "#38bdf8",
      danger: "#fb7185",
    },
  },
  neonMidnight: {
    name: "Neon Midnight",
    description: "Cyber teal and neon green on inky backgrounds.",
    accent: "#22d3ee",
    light: {
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      border: "#cbd5e1",
      muted: "#475569",
      primary: "#0f766e",
      danger: "#dc2626",
    },
    dark: {
      background: "#020617",
      foreground: "#e2e8f0",
      card: "#0f172a",
      border: "#1e293b",
      muted: "#22d3ee",
      primary: "#22c55e",
      danger: "#fb7185",
    },
  },
  forestCircuit: {
    name: "Forest Circuit",
    description: "Modern green layers with bold chartreuse highlights.",
    accent: "#84cc16",
    light: {
      background: "#f7fee7",
      foreground: "#1a2e05",
      card: "#ffffff",
      border: "#d9f99d",
      muted: "#4d7c0f",
      primary: "#15803d",
      danger: "#dc2626",
    },
    dark: {
      background: "#132a13",
      foreground: "#ecfccb",
      card: "#1b3a1b",
      border: "#365314",
      muted: "#bef264",
      primary: "#22c55e",
      danger: "#fb7185",
    },
  },
  royalPulse: {
    name: "Royal Pulse",
    description: "Premium sapphire and rose accents with strong depth.",
    accent: "#f472b6",
    light: {
      background: "#f8f7ff",
      foreground: "#1e1b4b",
      card: "#ffffff",
      border: "#ddd6fe",
      muted: "#5b4b9a",
      primary: "#4338ca",
      danger: "#e11d48",
    },
    dark: {
      background: "#1f1147",
      foreground: "#ede9fe",
      card: "#2e1c63",
      border: "#4c1d95",
      muted: "#c4b5fd",
      primary: "#818cf8",
      danger: "#fb7185",
    },
  },
  desertDrift: {
    name: "Desert Drift",
    description: "Sandstone neutrals with copper highlights for warmth.",
    accent: "#c2410c",
    light: {
      background: "#fffbeb",
      foreground: "#422006",
      card: "#ffffff",
      border: "#fde68a",
      muted: "#8a5a2b",
      primary: "#b45309",
      danger: "#dc2626",
    },
    dark: {
      background: "#2b1d0e",
      foreground: "#fef3c7",
      card: "#3a2915",
      border: "#7c2d12",
      muted: "#fcd34d",
      primary: "#f59e0b",
      danger: "#f87171",
    },
  },
} as const satisfies Record<string, ThemePreset>;

export type AppThemeKey = keyof typeof APP_THEME_PRESETS;

export type ThemeOption = {
  value: AppThemeKey;
  label: string;
  description: string;
};

export const DEFAULT_APP_THEME_KEY: AppThemeKey = "classic";

const customThemeKeys = Object.keys(APP_THEME_PRESETS).filter(
  (key): key is AppThemeKey => key !== DEFAULT_APP_THEME_KEY,
);

export const CUSTOM_THEME_OPTIONS: ThemeOption[] = customThemeKeys.map((key) => ({
  value: key,
  label: APP_THEME_PRESETS[key].name,
  description: APP_THEME_PRESETS[key].description,
}));

export function isAppThemeKey(value: string | null | undefined): value is AppThemeKey {
  if (!value) return false;
  return value in APP_THEME_PRESETS;
}
