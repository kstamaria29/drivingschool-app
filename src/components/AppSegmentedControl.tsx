import { Pressable, View } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type Option<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  options: readonly Option<T>[];
  onChange: (next: T) => void;
  disabled?: boolean;
  className?: string;
};

export function AppSegmentedControl<T extends string>({
  value,
  options,
  onChange,
  disabled,
  className,
}: Props<T>) {
  return (
    <View
      className={cn(
        "flex-row overflow-hidden rounded-xl border border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            disabled={disabled}
            className={cn(
              "flex-1 items-center justify-center px-3 py-2",
              selected ? theme.button.variant.primary : "bg-transparent",
            )}
            onPress={() => onChange(option.value)}
          >
            <AppText
              variant="caption"
              className={cn(selected ? theme.button.labelVariant.primary : theme.text.base)}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
