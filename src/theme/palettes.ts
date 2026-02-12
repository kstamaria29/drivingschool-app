type ThemeTone = {
  background: string;
  foreground: string;
  card: string;
  border: string;
  muted: string;
  primary: string;
  danger: string;
};

export type ThemeBackdropKind =
  | "brick"
  | "wood"
  | "floral"
  | "marble"
  | "blueprint"
  | "carbon"
  | "neon"
  | "metal";

export type ThemeBackdrop = {
  kind: ThemeBackdropKind;
  intensity?: number;
};

export type ThemePreset = {
  name: string;
  description: string;
  accent: string;
  tone: ThemeTone;
  premium?: boolean;
  backdrop?: ThemeBackdrop;
};

export const LIGHT_THEME_PRESETS = {
  lightDefault: {
    name: "Classic Light",
    description: "Balanced blue neutrals for a clean daytime interface.",
    accent: "#0ea5e9",
    tone: {
      background: "#f8fafc",
      foreground: "#0f172a",
      card: "#ffffff",
      border: "#e2e8f0",
      muted: "#64748b",
      primary: "#1d4ed8",
      danger: "#dc2626",
    },
  },
  sunriseBoulevard: {
    name: "Sunrise Boulevard",
    description: "Soft peach and amber layers with warm contrast.",
    accent: "#f97316",
    tone: {
      background: "#fff7ed",
      foreground: "#4a220d",
      card: "#ffffff",
      border: "#fed7aa",
      muted: "#9a5a2b",
      primary: "#ea580c",
      danger: "#dc2626",
    },
  },
  mintLedger: {
    name: "Mint Ledger",
    description: "Fresh mint surfaces with confident green action color.",
    accent: "#14b8a6",
    tone: {
      background: "#f0fdf4",
      foreground: "#12361e",
      card: "#ffffff",
      border: "#bbf7d0",
      muted: "#3f7757",
      primary: "#15803d",
      danger: "#dc2626",
    },
  },
  coastalPaper: {
    name: "Coastal Paper",
    description: "Breezy aqua canvas tuned for high readability.",
    accent: "#06b6d4",
    tone: {
      background: "#ecfeff",
      foreground: "#103447",
      card: "#ffffff",
      border: "#a5f3fc",
      muted: "#1f6b8a",
      primary: "#0284c7",
      danger: "#e11d48",
    },
  },
  amberStudio: {
    name: "Amber Studio",
    description: "Premium sand and amber tones with warm depth.",
    accent: "#d97706",
    tone: {
      background: "#fffbeb",
      foreground: "#422006",
      card: "#ffffff",
      border: "#fde68a",
      muted: "#8a5a2b",
      primary: "#b45309",
      danger: "#dc2626",
    },
  },
  roseQuartz: {
    name: "Rose Quartz",
    description: "Elegant blush highlights with crisp slate text.",
    accent: "#ec4899",
    tone: {
      background: "#fff1f2",
      foreground: "#3f1d2e",
      card: "#ffffff",
      border: "#fbcfe8",
      muted: "#9d4f74",
      primary: "#be185d",
      danger: "#dc2626",
    },
  },
  slateSignal: {
    name: "Slate Signal",
    description: "Modern slate neutrals with vivid blue actions.",
    accent: "#3b82f6",
    tone: {
      background: "#f4f7fb",
      foreground: "#10233d",
      card: "#ffffff",
      border: "#d6e0ee",
      muted: "#4f637b",
      primary: "#2563eb",
      danger: "#dc2626",
    },
  },
  brickCourtyard: {
    name: "Brick Courtyard",
    description: "Premium terracotta + plaster with subtle brick texture.",
    accent: "#f97316",
    premium: true,
    backdrop: { kind: "brick", intensity: 0.55 },
    tone: {
      background: "#fff7f0",
      foreground: "#2a1711",
      card: "#ffffff",
      border: "#f2d2c5",
      muted: "#8a5a4a",
      primary: "#c2410c",
      danger: "#dc2626",
    },
  },
  walnutWorkshop: {
    name: "Walnut Workshop",
    description: "Premium walnut warmth with brass accents and woodgrain depth.",
    accent: "#fbbf24",
    premium: true,
    backdrop: { kind: "wood", intensity: 0.5 },
    tone: {
      background: "#faf6f0",
      foreground: "#1f2937",
      card: "#ffffff",
      border: "#e7dccf",
      muted: "#7c6f63",
      primary: "#1e3a8a",
      danger: "#dc2626",
    },
  },
  sakuraSilk: {
    name: "Sakura Silk",
    description: "Premium sakura blush with porcelain surfaces and soft floral detail.",
    accent: "#fb7185",
    premium: true,
    backdrop: { kind: "floral", intensity: 0.45 },
    tone: {
      background: "#fff7f7",
      foreground: "#2b1b1b",
      card: "#ffffff",
      border: "#f7d1d1",
      muted: "#7f6b6b",
      primary: "#1e40af",
      danger: "#dc2626",
    },
  },
  marbleGallery: {
    name: "Marble Gallery",
    description: "Premium cool marble neutrals with indigo ink and golden highlights.",
    accent: "#f59e0b",
    premium: true,
    backdrop: { kind: "marble", intensity: 0.4 },
    tone: {
      background: "#f4f6f9",
      foreground: "#101827",
      card: "#ffffff",
      border: "#dde3eb",
      muted: "#5f6b7a",
      primary: "#4f46e5",
      danger: "#dc2626",
    },
  },
  blueprintStudio: {
    name: "Blueprint Studio",
    description: "Premium drafting-paper blues with crisp grid texture and high focus.",
    accent: "#06b6d4",
    premium: true,
    backdrop: { kind: "blueprint", intensity: 0.6 },
    tone: {
      background: "#f0f7ff",
      foreground: "#0b1a2b",
      card: "#ffffff",
      border: "#c7dff8",
      muted: "#355a7a",
      primary: "#0b4dbb",
      danger: "#dc2626",
    },
  },
} as const satisfies Record<string, ThemePreset>;

export const DARK_THEME_PRESETS = {
  darkDefault: {
    name: "Classic Dark",
    description: "Deep slate surfaces with trusted blue contrast.",
    accent: "#38bdf8",
    tone: {
      background: "#0b1220",
      foreground: "#e2e8f0",
      card: "#111a2a",
      border: "#23324a",
      muted: "#94a3b8",
      primary: "#3b82f6",
      danger: "#f87171",
    },
  },
  midnightAurora: {
    name: "Midnight Aurora",
    description: "Midnight indigo with icy cyan highlights.",
    accent: "#22d3ee",
    tone: {
      background: "#090f1f",
      foreground: "#e3ecff",
      card: "#111933",
      border: "#243255",
      muted: "#90a2c8",
      primary: "#38bdf8",
      danger: "#fb7185",
    },
  },
  carbonNeon: {
    name: "Carbon Neon",
    description: "Graphite blacks and electric cyan action cues.",
    accent: "#00d4ff",
    tone: {
      background: "#0a1014",
      foreground: "#dbe7ee",
      card: "#121b22",
      border: "#263643",
      muted: "#8aa2b3",
      primary: "#00b8e6",
      danger: "#fb7185",
    },
  },
  deepOcean: {
    name: "Deep Ocean",
    description: "Saturated marine blues with bright turquoise focus.",
    accent: "#2dd4bf",
    tone: {
      background: "#041a27",
      foreground: "#ddf3ff",
      card: "#072535",
      border: "#0f3a52",
      muted: "#7ab3c9",
      primary: "#06b6d4",
      danger: "#fb7185",
    },
  },
  obsidianRose: {
    name: "Obsidian Rose",
    description: "Obsidian plum with sharp rose-magenta highlights.",
    accent: "#f472b6",
    tone: {
      background: "#1a1120",
      foreground: "#f8e8f2",
      card: "#261732",
      border: "#49305c",
      muted: "#c4a2c8",
      primary: "#db2777",
      danger: "#fb7185",
    },
  },
  emberNight: {
    name: "Ember Night",
    description: "Burnished cocoa tones with vivid ember accents.",
    accent: "#fb923c",
    tone: {
      background: "#1c130c",
      foreground: "#fff1e6",
      card: "#2b1c12",
      border: "#5a3a22",
      muted: "#e0b892",
      primary: "#f97316",
      danger: "#fb7185",
    },
  },
  graphiteLime: {
    name: "Graphite Lime",
    description: "Industrial graphite with punchy lime highlights.",
    accent: "#a3e635",
    tone: {
      background: "#111518",
      foreground: "#e5efe3",
      card: "#1b2227",
      border: "#303c45",
      muted: "#9cb0a1",
      primary: "#65a30d",
      danger: "#fb7185",
    },
  },
  brickNoir: {
    name: "Brick Noir",
    description: "Premium kiln-brick shadows with warm gold and brick-red punch.",
    accent: "#f59e0b",
    premium: true,
    backdrop: { kind: "brick", intensity: 0.6 },
    tone: {
      background: "#120a07",
      foreground: "#fff7ed",
      card: "#1b110d",
      border: "#3a241b",
      muted: "#d6b29f",
      primary: "#ef4444",
      danger: "#fb7185",
    },
  },
  carbonWeave: {
    name: "Carbon Weave",
    description: "Premium carbon-fiber depth with crisp highlights and clean contrast.",
    accent: "#60a5fa",
    premium: true,
    backdrop: { kind: "carbon", intensity: 0.55 },
    tone: {
      background: "#0a0c10",
      foreground: "#e5e7eb",
      card: "#11141b",
      border: "#242a36",
      muted: "#9ca3af",
      primary: "#f59e0b",
      danger: "#fb7185",
    },
  },
  sakuraMidnight: {
    name: "Sakura Midnight",
    description: "Premium midnight blossoms with soft petal glow and deep ink cards.",
    accent: "#f472b6",
    premium: true,
    backdrop: { kind: "floral", intensity: 0.5 },
    tone: {
      background: "#150c12",
      foreground: "#fce7f3",
      card: "#20101a",
      border: "#3d2032",
      muted: "#c4a2b2",
      primary: "#34d399",
      danger: "#fb7185",
    },
  },
  neonArcade: {
    name: "Neon Arcade",
    description: "Premium neon gradients with a sleek cyber atmosphere and sharp focus.",
    accent: "#22d3ee",
    premium: true,
    backdrop: { kind: "neon", intensity: 0.65 },
    tone: {
      background: "#070816",
      foreground: "#e0e7ff",
      card: "#0d0f24",
      border: "#22254d",
      muted: "#a5b4fc",
      primary: "#a855f7",
      danger: "#fb7185",
    },
  },
  lunarSteel: {
    name: "Lunar Steel",
    description: "Premium brushed metal with moonlight blues and restrained gold glow.",
    accent: "#93c5fd",
    premium: true,
    backdrop: { kind: "metal", intensity: 0.5 },
    tone: {
      background: "#0b0f14",
      foreground: "#e5f0ff",
      card: "#111a22",
      border: "#263644",
      muted: "#93a5b4",
      primary: "#fbbf24",
      danger: "#fb7185",
    },
  },
} as const satisfies Record<string, ThemePreset>;

export type LightThemeKey = keyof typeof LIGHT_THEME_PRESETS;
export type DarkThemeKey = keyof typeof DARK_THEME_PRESETS;
export type AppThemeKey = LightThemeKey | DarkThemeKey;

export type ThemeOption<T extends string> = {
  value: T;
  label: string;
  description: string;
  premium?: boolean;
};

export const DEFAULT_LIGHT_THEME_KEY: LightThemeKey = "lightDefault";
export const DEFAULT_DARK_THEME_KEY: DarkThemeKey = "darkDefault";

function buildOptions<T extends string>(
  presets: Record<T, ThemePreset>,
  defaultKey: T,
): ThemeOption<T>[] {
  const keys = Object.keys(presets) as T[];
  return keys.map((key) => ({
    value: key,
    label: key === defaultKey ? `${presets[key].name} (Default)` : presets[key].name,
    description: presets[key].description,
    premium: presets[key].premium,
  }));
}

export const LIGHT_THEME_OPTIONS = buildOptions(LIGHT_THEME_PRESETS, DEFAULT_LIGHT_THEME_KEY);
export const DARK_THEME_OPTIONS = buildOptions(DARK_THEME_PRESETS, DEFAULT_DARK_THEME_KEY);

export function isLightThemeKey(value: string | null | undefined): value is LightThemeKey {
  if (!value) return false;
  return value in LIGHT_THEME_PRESETS;
}

export function isDarkThemeKey(value: string | null | undefined): value is DarkThemeKey {
  if (!value) return false;
  return value in DARK_THEME_PRESETS;
}

export function isAppThemeKey(value: string | null | undefined): value is AppThemeKey {
  if (!value) return false;
  return isLightThemeKey(value) || isDarkThemeKey(value);
}

export function getThemePreset(key: AppThemeKey): ThemePreset | undefined {
  if (isLightThemeKey(key)) return LIGHT_THEME_PRESETS[key];
  if (isDarkThemeKey(key)) return DARK_THEME_PRESETS[key];
  return undefined;
}
