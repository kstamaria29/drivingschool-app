import { Pressable, View } from "react-native";
import { Check } from "lucide-react-native";

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
  premium?: boolean;
};

const lightThemeOptions: ThemeOption[] = LIGHT_THEME_OPTIONS;
const darkThemeOptions: ThemeOption[] = DARK_THEME_OPTIONS;

export function ThemesScreen() {
  const { isCompact } = useNavigationLayout();
  const { scheme, setScheme, themeKey, setThemeKey } = useAppColorScheme();
  const iconMuted = scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const activeThemeOptions = scheme === "dark" ? darkThemeOptions : lightThemeOptions;

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

          <View className="gap-2">
            <AppText variant="label">Theme style</AppText>
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
          </View>
        </AppCard>
      </AppStack>
    </Screen>
  );
}
