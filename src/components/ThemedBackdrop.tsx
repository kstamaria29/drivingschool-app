import { Animated, StyleSheet } from "react-native";
import { useEffect, useRef } from "react";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
} from "react-native-svg";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";
import { getThemePreset } from "../theme/palettes";
import type { ThemeBackdropKind } from "../theme/palettes";
import { theme } from "../theme/theme";

function clamp01(value: number) {
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => `${char}${char}`)
          .join("")
      : normalized;

  const parsed = Number.parseInt(expanded, 16);
  const r = (parsed >> 16) & 255;
  const g = (parsed >> 8) & 255;
  const b = parsed & 255;
  return { r, g, b };
}

function rgba(hex: string, alpha: number) {
  const safeAlpha = clamp01(alpha);
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${safeAlpha})`;
}

type BackdropColors = {
  background: string;
  border: string;
  muted: string;
  primary: string;
  accent: string;
};

function BrickBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const mortar = colors.border;
  const brickFill = colors.primary;

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="brickWash" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.16 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.12 * intensity} />
        </LinearGradient>
        <Pattern id="brickPattern" patternUnits="userSpaceOnUse" width={128} height={84}>
          <Rect width={128} height={84} fill={colors.background} fillOpacity={0} />

          <Rect
            x={0}
            y={0}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />
          <Rect
            x={64}
            y={0}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />

          <Rect
            x={-32}
            y={36}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />
          <Rect
            x={32}
            y={36}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />
          <Rect
            x={96}
            y={36}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />

          <Rect
            x={0}
            y={72}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />
          <Rect
            x={64}
            y={72}
            width={64}
            height={36}
            fill={brickFill}
            fillOpacity={0.07 * intensity}
            stroke={mortar}
            strokeOpacity={0.24 * intensity}
            strokeWidth={4}
            rx={3}
          />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#brickWash)" />
      <Rect width="100%" height="100%" fill="url(#brickPattern)" />
    </Svg>
  );
}

function WoodBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const stroke = rgba(colors.muted, 0.16 * intensity);
  const highlight = rgba(colors.accent, 0.12 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="woodWash" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.14 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.06 * intensity} />
        </LinearGradient>
        <Pattern id="woodPattern" patternUnits="userSpaceOnUse" width={260} height={180}>
          <Rect width={260} height={180} fill={colors.background} fillOpacity={0} />
          <Path
            d="M-40 40 C 10 10, 90 70, 140 40 S 270 70, 320 40"
            stroke={stroke}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M-40 90 C 20 60, 90 120, 160 90 S 290 120, 360 90"
            stroke={stroke}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M-40 140 C 30 110, 110 170, 190 140 S 320 170, 390 140"
            stroke={stroke}
            strokeWidth={2}
            fill="none"
          />

          <Path
            d="M60 30 C 78 48, 78 72, 60 90 C 42 72, 42 48, 60 30 Z"
            stroke={highlight}
            strokeWidth={2}
            fill="none"
          />
          <Path
            d="M60 38 C 72 50, 72 70, 60 82 C 48 70, 48 50, 60 38 Z"
            stroke={highlight}
            strokeWidth={2}
            fill="none"
          />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#woodWash)" />
      <Rect width="100%" height="100%" fill="url(#woodPattern)" />
    </Svg>
  );
}

function FloralBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const petal = colors.accent;
  const leaf = colors.primary;
  const stroke = rgba(colors.muted, 0.12 * intensity);

  function flower(x: number, y: number, scale: number) {
    const s = Math.max(0.6, scale);
    return (
      <G key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${s})`} opacity={0.38 * intensity}>
        <Circle cx={0} cy={0} r={4.2} fill={leaf} fillOpacity={0.22} />
        <Circle cx={0} cy={-10} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
        <Circle cx={8.5} cy={-5} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
        <Circle cx={8.5} cy={5} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
        <Circle cx={0} cy={10} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
        <Circle cx={-8.5} cy={5} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
        <Circle cx={-8.5} cy={-5} r={6.2} fill={petal} fillOpacity={0.18} stroke={stroke} />
      </G>
    );
  }

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="floralWash" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.16 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.06 * intensity} />
        </LinearGradient>
        <Pattern id="floralPattern" patternUnits="userSpaceOnUse" width={260} height={260}>
          <Rect width={260} height={260} fill={colors.background} fillOpacity={0} />
          {flower(50, 60, 1)}
          {flower(190, 90, 0.95)}
          {flower(120, 190, 1.15)}
          <Path
            d="M20 240 C 60 210, 90 215, 130 190 S 210 160, 250 130"
            stroke={rgba(colors.primary, 0.14 * intensity)}
            strokeWidth={3}
            fill="none"
            opacity={0.26 * intensity}
            strokeLinecap="round"
          />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#floralWash)" />
      <Rect width="100%" height="100%" fill="url(#floralPattern)" />
    </Svg>
  );
}

function MarbleBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const vein = rgba(colors.muted, 0.18 * intensity);
  const vein2 = rgba(colors.accent, 0.12 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="marbleWash" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.08 * intensity} />
        </LinearGradient>
        <Pattern id="marblePattern" patternUnits="userSpaceOnUse" width={320} height={220}>
          <Rect width={320} height={220} fill={colors.background} fillOpacity={0} />
          <Path
            d="M-20 40 C 40 10, 80 80, 140 50 S 240 0, 340 40"
            stroke={vein}
            strokeWidth={2.6}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M-30 130 C 40 160, 110 70, 180 110 S 300 200, 360 140"
            stroke={vein}
            strokeWidth={2.2}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M20 200 C 90 150, 150 210, 230 170 S 330 140, 380 170"
            stroke={vein2}
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
          />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#marbleWash)" />
      <Rect width="100%" height="100%" fill="url(#marblePattern)" />
    </Svg>
  );
}

function BlueprintBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const minor = rgba(colors.primary, 0.12 * intensity);
  const major = rgba(colors.accent, 0.16 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="blueprintWash" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.1 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.08 * intensity} />
        </LinearGradient>
        <Pattern id="blueprintPattern" patternUnits="userSpaceOnUse" width={120} height={120}>
          <Rect width={120} height={120} fill={colors.background} fillOpacity={0} />
          <Path d="M0 20 H120 M0 40 H120 M0 60 H120 M0 80 H120 M0 100 H120" stroke={minor} strokeWidth={1} />
          <Path d="M20 0 V120 M40 0 V120 M60 0 V120 M80 0 V120 M100 0 V120" stroke={minor} strokeWidth={1} />
          <Path d="M0 0 H120 M0 60 H120 M0 120 H120" stroke={major} strokeWidth={2} />
          <Path d="M0 0 V120 M60 0 V120 M120 0 V120" stroke={major} strokeWidth={2} />
          <Circle cx={60} cy={60} r={4.2} fill={colors.accent} fillOpacity={0.2 * intensity} />
          <Path d="M60 44 V76 M44 60 H76" stroke={major} strokeWidth={1.8} strokeLinecap="round" />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#blueprintWash)" />
      <Rect width="100%" height="100%" fill="url(#blueprintPattern)" />
    </Svg>
  );
}

function CarbonBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const line = rgba(colors.muted, 0.16 * intensity);
  const glow = rgba(colors.accent, 0.12 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="carbonWash" x1="1" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.08 * intensity} />
        </LinearGradient>
        <Pattern id="carbonPattern" patternUnits="userSpaceOnUse" width={80} height={80}>
          <Rect width={80} height={80} fill={colors.background} fillOpacity={0} />
          <Path d="M-20 80 L80 -20" stroke={line} strokeWidth={2} />
          <Path d="M0 100 L100 0" stroke={line} strokeWidth={2} />
          <Path d="M-20 0 L80 100" stroke={glow} strokeWidth={1.6} />
          <Path d="M0 -20 L100 80" stroke={glow} strokeWidth={1.6} />
          <Rect x={8} y={8} width={24} height={24} fill={colors.primary} fillOpacity={0.06 * intensity} />
          <Rect x={48} y={48} width={24} height={24} fill={colors.primary} fillOpacity={0.06 * intensity} />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#carbonWash)" />
      <Rect width="100%" height="100%" fill="url(#carbonPattern)" />
    </Svg>
  );
}

function NeonBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const scan = rgba(colors.accent, 0.14 * intensity);
  const scan2 = rgba(colors.primary, 0.12 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="neonWash" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.2 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.14 * intensity} />
        </LinearGradient>
        <Pattern id="neonPattern" patternUnits="userSpaceOnUse" width={72} height={72}>
          <Rect width={72} height={72} fill={colors.background} fillOpacity={0} />
          <Path d="M-16 72 L72 -16" stroke={scan} strokeWidth={2} />
          <Path d="M0 88 L88 0" stroke={scan} strokeWidth={2} />
          <Path d="M-32 40 L40 -32" stroke={scan2} strokeWidth={1.6} />
          <Circle cx={14} cy={18} r={3} fill={colors.accent} fillOpacity={0.24 * intensity} />
          <Circle cx={52} cy={54} r={3} fill={colors.primary} fillOpacity={0.22 * intensity} />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#neonWash)" />
      <Rect width="100%" height="100%" fill="url(#neonPattern)" />
    </Svg>
  );
}

function MetalBackdrop({
  colors,
  intensity,
}: {
  colors: BackdropColors;
  intensity: number;
}) {
  const brush = rgba(colors.muted, 0.16 * intensity);

  return (
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="metalWash" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={colors.accent} stopOpacity={0.12 * intensity} />
          <Stop offset="1" stopColor={colors.primary} stopOpacity={0.08 * intensity} />
        </LinearGradient>
        <Pattern id="metalPattern" patternUnits="userSpaceOnUse" width={160} height={160}>
          <Rect width={160} height={160} fill={colors.background} fillOpacity={0} />
          <Path
            d="M0 8 H160 M0 24 H160 M0 40 H160 M0 56 H160 M0 72 H160 M0 88 H160 M0 104 H160 M0 120 H160 M0 136 H160 M0 152 H160"
            stroke={brush}
            strokeWidth={2}
          />
          <Path
            d="M0 12 H160 M0 44 H160 M0 76 H160 M0 108 H160 M0 140 H160"
            stroke={rgba(colors.accent, 0.12 * intensity)}
            strokeWidth={1.6}
          />
        </Pattern>
      </Defs>

      <Rect width="100%" height="100%" fill="url(#metalWash)" />
      <Rect width="100%" height="100%" fill="url(#metalPattern)" />
    </Svg>
  );
}

function renderBackdrop(kind: ThemeBackdropKind, colors: BackdropColors, intensity: number) {
  if (kind === "brick") return <BrickBackdrop colors={colors} intensity={intensity} />;
  if (kind === "wood") return <WoodBackdrop colors={colors} intensity={intensity} />;
  if (kind === "floral") return <FloralBackdrop colors={colors} intensity={intensity} />;
  if (kind === "marble") return <MarbleBackdrop colors={colors} intensity={intensity} />;
  if (kind === "blueprint") return <BlueprintBackdrop colors={colors} intensity={intensity} />;
  if (kind === "carbon") return <CarbonBackdrop colors={colors} intensity={intensity} />;
  if (kind === "neon") return <NeonBackdrop colors={colors} intensity={intensity} />;
  if (kind === "metal") return <MetalBackdrop colors={colors} intensity={intensity} />;
  return null;
}

export function ThemedBackdrop() {
  const { scheme, themeKey } = useAppColorScheme();
  const preset = getThemePreset(themeKey);
  const backdrop = preset?.backdrop ?? null;
  const intensity = clamp01(backdrop?.intensity ?? 0);
  const shouldPulse = backdrop?.kind === "neon";
  const pulse = useRef(new Animated.Value(0)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!shouldPulse) {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
      pulse.setValue(0);
      return;
    }

    pulseLoopRef.current?.stop();
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();

    return () => {
      pulseLoopRef.current?.stop();
      pulseLoopRef.current = null;
    };
  }, [pulse, shouldPulse]);

  const colors: BackdropColors = {
    background: scheme === "dark" ? theme.colors.backgroundDark : theme.colors.backgroundLight,
    border: scheme === "dark" ? theme.colors.borderDark : theme.colors.borderLight,
    muted: scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight,
    primary: scheme === "dark" ? theme.colors.primaryDark : theme.colors.primary,
    accent: theme.colors.accent,
  };

  const containerOpacity = shouldPulse
    ? pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
    : 1;

  if (!backdrop || intensity <= 0) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.container, { opacity: containerOpacity }]}>
      {renderBackdrop(backdrop.kind, colors, intensity)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
});
