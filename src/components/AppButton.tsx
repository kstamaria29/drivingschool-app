import { Pressable, type PressableProps } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "ghost";
type AppButtonSize = "md" | "lg";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
};

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  className,
  disabled,
  ...props
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        theme.button.base,
        theme.button.variant[variant],
        theme.button.size[size],
        disabled && theme.button.disabled,
        className,
      )}
      {...props}
    >
      <AppText
        variant="button"
        className={cn(theme.button.labelBase, theme.button.labelVariant[variant])}
      >
        {label}
      </AppText>
    </Pressable>
  );
}
