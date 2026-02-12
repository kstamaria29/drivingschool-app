import { Pressable, View, type ScrollView } from "react-native";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Palette } from "lucide-react-native";

import { AppCard } from "../../components/AppCard";
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
};

const lightThemeOptions: ThemeOption[] = LIGHT_THEME_OPTIONS;
const darkThemeOptions: ThemeOption[] = DARK_THEME_OPTIONS;

export function ThemesScreen() {
  const { isSidebar, isCompact } = useNavigationLayout();
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const themesScrollRef = useRef<ScrollView>(null);
  const { scheme, setScheme, themeKey, setThemeKey } = useAppColorScheme();
  const iconMuted = scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const activeThemeOptions = scheme === "dark" ? darkThemeOptions : lightThemeOptions;
  const selectedThemeOption =
    activeThemeOptions.find((option) => option.value === themeKey) ?? activeThemeOptions[0];

  useEffect(() => {
    setThemeMenuOpen(false);
  }, [scheme]);

  useEffect(() => {
    if (!themeMenuOpen || isSidebar) return;

    const timeoutId = setTimeout(() => {
      themesScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isSidebar, themeMenuOpen]);

  return (
    <Screen scroll scrollRef={themesScrollRef}>
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

          <View className="gap-2">
            <AppText variant="label">Theme style</AppText>
            <Pressable
              accessibilityRole="button"
              className="rounded-xl border border-border bg-card px-3 py-3 dark:border-borderDark dark:bg-cardDark"
              onPress={() => setThemeMenuOpen((open) => !open)}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1 flex-row items-center gap-2">
                  <Palette size={18} color={iconMuted} />
                  <View className="flex-1">
                    <AppText variant="body">{selectedThemeOption.label}</AppText>
                    <AppText variant="caption">{selectedThemeOption.description}</AppText>
                  </View>
                </View>
                <ChevronDown size={18} color={iconMuted} />
              </View>
            </Pressable>

            {themeMenuOpen ? (
              <View className="overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
                {activeThemeOptions.map((option, index) => {
                  const selected = option.value === themeKey;
                  return (
                    <Pressable
                      key={option.value}
                      className={cn(
                        "px-3 py-3",
                        index < activeThemeOptions.length - 1 &&
                          "border-b border-border dark:border-borderDark",
                        selected && "bg-primary/10 dark:bg-primaryDark/20",
                      )}
                      onPress={() => {
                        setThemeKey(option.value);
                        setThemeMenuOpen(false);
                      }}
                    >
                      <View className="flex-row items-start justify-between gap-2">
                        <View className="flex-1">
                          <AppText variant="body">{option.label}</AppText>
                          <AppText variant="caption">{option.description}</AppText>
                        </View>
                        {selected ? <Check size={16} color={iconMuted} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </AppCard>
      </AppStack>
    </Screen>
  );
}
