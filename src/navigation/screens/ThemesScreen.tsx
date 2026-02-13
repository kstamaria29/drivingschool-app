import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";

import { AppCard } from "../../components/AppCard";
import { AppCollapsibleCard } from "../../components/AppCollapsibleCard";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useAppColorScheme } from "../../providers/ColorSchemeProvider";
import {
  DARK_THEME_OPTIONS,
  LIGHT_THEME_OPTIONS,
  type DarkThemeKey,
  type LightThemeKey,
} from "../../theme/palettes";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { useNavigationLayout } from "../useNavigationLayout";

type ThemeOption = {
  value: LightThemeKey | DarkThemeKey;
  label: string;
  description: string;
  premium?: boolean;
};

const lightThemeOptions: ThemeOption[] = LIGHT_THEME_OPTIONS;
const darkThemeOptions: ThemeOption[] = DARK_THEME_OPTIONS;

export function ThemesScreen() {
  const { isCompact } = useNavigationLayout();
  const { scheme, setScheme, themeKey, setThemeKey } = useAppColorScheme();
  const iconMuted = scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const activeThemeOptions = scheme === "dark" ? darkThemeOptions : lightThemeOptions;
  const freeThemeOptions = useMemo(
    () => activeThemeOptions.filter((option) => !option.premium),
    [activeThemeOptions],
  );
  const premiumThemeOptions = useMemo(
    () => activeThemeOptions.filter((option) => option.premium),
    [activeThemeOptions],
  );

  const selectedIsPremium = Boolean(
    activeThemeOptions.find((option) => option.value === themeKey)?.premium,
  );

  const [freeThemesExpanded, setFreeThemesExpanded] = useState(() => !selectedIsPremium);
  const [premiumThemesExpanded, setPremiumThemesExpanded] = useState(() => selectedIsPremium);

  useEffect(() => {
    const nextSelectedIsPremium = Boolean(
      activeThemeOptions.find((option) => option.value === themeKey)?.premium,
    );
    if (nextSelectedIsPremium) {
      setPremiumThemesExpanded(true);
      setFreeThemesExpanded(false);
    } else {
      setFreeThemesExpanded(true);
      setPremiumThemesExpanded(false);
    }
  }, [activeThemeOptions, scheme, themeKey]);

  function renderThemeList(options: ThemeOption[]) {
    if (options.length === 0) {
      return <AppText variant="caption">No themes available.</AppText>;
    }

    return (
      <View className="overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
        {options.map((option, index) => {
          const selected = option.value === themeKey;
          return (
            <Pressable
              key={option.value}
              className={cn(
                "px-3 py-3",
                index < options.length - 1 && "border-b border-border dark:border-borderDark",
                selected && "bg-primary/10 dark:bg-primaryDark/20",
              )}
              onPress={() => {
                setThemeKey(option.value);
              }}
            >
              <View className="flex-row items-start justify-between gap-2">
                <View className="flex-1">
                  <AppText variant="body">{option.label}</AppText>
                  <AppText variant="caption">{option.description}</AppText>
                </View>
                <View className="flex-row items-center gap-2">
                  {option.premium ? (
                    <View className="rounded-full border border-accent/30 bg-accent/15 px-2 py-1">
                      <AppText className="text-xs text-accent dark:text-accent" variant="caption">
                        Premium
                      </AppText>
                    </View>
                  ) : null}
                  {selected ? <Check size={16} color={iconMuted} /> : null}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Themes</AppText>
          <AppText className="mt-2" variant="body">
            Switch mode and pick a dedicated style for that mode.
          </AppText>
        </View>

        <AppCard className="gap-3">
          <AppSegmentedControl
            value={scheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={setScheme}
          />
        </AppCard>

        <AppCollapsibleCard
          title="Free Themes"
          subtitle="Included themes for this mode."
          expanded={freeThemesExpanded}
          onToggle={() => setFreeThemesExpanded((expanded) => !expanded)}
          showLabelClassName="text-blue-600 dark:text-blue-400"
          hideLabelClassName="text-red-600 dark:text-red-400"
        >
          {renderThemeList(freeThemeOptions)}
        </AppCollapsibleCard>

        <AppCollapsibleCard
          title="Premium Themes"
          subtitle="Premium textures, motion, and typography."
          expanded={premiumThemesExpanded}
          onToggle={() => setPremiumThemesExpanded((expanded) => !expanded)}
          showLabelClassName="text-blue-600 dark:text-blue-400"
          hideLabelClassName="text-red-600 dark:text-red-400"
        >
          {renderThemeList(premiumThemeOptions)}
        </AppCollapsibleCard>
      </AppStack>
    </Screen>
  );
}
