import { Pressable, type PressableProps } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "ghost";
type AppButtonSize = "md" | "lg";
type AppButtonWidth = "full" | "auto";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  width?: AppButtonWidth;
};

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  width = "full",
  className,
  disabled,
  ...props
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={cn(
        width === "full" && "w-full",
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
