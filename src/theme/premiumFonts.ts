import type { AppThemeKey } from "./palettes";

export type FontPack = {
  regular: string;
  medium: string;
  semibold: string;
};

export type PremiumFontPackConfig = {
  pack: FontPack;
  sources: Record<string, string>;
  label: string;
};

const GOOGLE_FONTS_RAW_BASE_URL = "https://raw.githubusercontent.com/google/fonts/main/ofl";

function oflUrl(path: string) {
  return `${GOOGLE_FONTS_RAW_BASE_URL}/${path}`;
}

function staticFontPack(input: {
  label: string;
  regular: { name: string; path: string };
  medium: { name: string; path: string };
  semibold: { name: string; path: string };
}): PremiumFontPackConfig {
  return {
    label: input.label,
    pack: { regular: input.regular.name, medium: input.medium.name, semibold: input.semibold.name },
    sources: {
      [input.regular.name]: oflUrl(input.regular.path),
      [input.medium.name]: oflUrl(input.medium.path),
      [input.semibold.name]: oflUrl(input.semibold.path),
    },
  };
}

function variableFontPack(input: { label: string; name: string; path: string }): PremiumFontPackConfig {
  return {
    label: input.label,
    pack: { regular: input.name, medium: input.name, semibold: input.name },
    sources: { [input.name]: oflUrl(input.path) },
  };
}

const PREMIUM_FONT_PACKS: Partial<Record<AppThemeKey, PremiumFontPackConfig>> = {
  // Brick themes: condensed construction signage feel.
  brickCourtyard: variableFontPack({
    label: "Oswald Variable",
    name: "Oswald_Variable",
    path: "oswald/Oswald%5Bwght%5D.ttf",
  }),
  brickNoir: variableFontPack({
    label: "Oswald Variable",
    name: "Oswald_Variable",
    path: "oswald/Oswald%5Bwght%5D.ttf",
  }),

  // Wood themes: bookish, warm editorial serif.
  walnutWorkshop: staticFontPack({
    label: "Spectral",
    regular: { name: "Spectral_400Regular", path: "spectral/Spectral-Regular.ttf" },
    medium: { name: "Spectral_500Medium", path: "spectral/Spectral-Medium.ttf" },
    semibold: { name: "Spectral_600SemiBold", path: "spectral/Spectral-SemiBold.ttf" },
  }),

  // Floral themes: high-contrast fashion serif.
  sakuraSilk: variableFontPack({
    label: "Playfair Display Variable",
    name: "PlayfairDisplay_Variable",
    path: "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
  }),
  sakuraMidnight: variableFontPack({
    label: "Playfair Display Variable",
    name: "PlayfairDisplay_Variable",
    path: "playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf",
  }),

  // Marble themes: classic gallery serif.
  marbleGallery: staticFontPack({
    label: "Cormorant Garamond",
    regular: {
      name: "CormorantGaramond_400Regular",
      path: "cormorantgaramond/CormorantGaramond-Regular.ttf",
    },
    medium: {
      name: "CormorantGaramond_500Medium",
      path: "cormorantgaramond/CormorantGaramond-Medium.ttf",
    },
    semibold: {
      name: "CormorantGaramond_600SemiBold",
      path: "cormorantgaramond/CormorantGaramond-SemiBold.ttf",
    },
  }),

  // Blueprint themes: utilitarian mono for drafting vibe.
  blueprintStudio: staticFontPack({
    label: "IBM Plex Mono",
    regular: { name: "IBMPlexMono_400Regular", path: "ibmplexmono/IBMPlexMono-Regular.ttf" },
    medium: { name: "IBMPlexMono_500Medium", path: "ibmplexmono/IBMPlexMono-Medium.ttf" },
    semibold: { name: "IBMPlexMono_600SemiBold", path: "ibmplexmono/IBMPlexMono-SemiBold.ttf" },
  }),

  // Carbon themes: modern technical grotesk.
  carbonWeave: staticFontPack({
    label: "Space Grotesk",
    regular: { name: "SpaceGrotesk_400Regular", path: "spacegrotesk/static/SpaceGrotesk-Regular.ttf" },
    medium: { name: "SpaceGrotesk_500Medium", path: "spacegrotesk/static/SpaceGrotesk-Medium.ttf" },
    semibold: { name: "SpaceGrotesk_700Bold", path: "spacegrotesk/static/SpaceGrotesk-Bold.ttf" },
  }),

  // Neon themes: futuristic display face.
  neonArcade: variableFontPack({
    label: "Orbitron Variable",
    name: "Orbitron_Variable",
    path: "orbitron/Orbitron%5Bwght%5D.ttf",
  }),

  // Metal themes: aerospace variable sans.
  lunarSteel: variableFontPack({
    label: "Exo 2 Variable",
    name: "Exo2_Variable",
    path: "exo2/Exo2%5Bwght%5D.ttf",
  }),
};

export function getPremiumFontPackConfig(themeKey: AppThemeKey): PremiumFontPackConfig | undefined {
  return PREMIUM_FONT_PACKS[themeKey];
}

