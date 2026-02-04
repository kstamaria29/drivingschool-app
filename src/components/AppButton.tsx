import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type AppButtonSize = "md" | "lg";
type AppButtonWidth = "full" | "auto";

type Props = Omit<PressableProps, "children"> & {
  label: string;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  width?: AppButtonWidth;
  icon?: LucideIcon;
  iconPosition?: "left" | "right";
  iconSize?: number;
  iconColor?: string;
  iconStrokeWidth?: number;
  renderIcon?: (input: { size: number; color: string; strokeWidth: number }) => ReactNode;
};

export function AppButton({
  label,
  variant = "primary",
  size = "md",
  width = "full",
  icon: Icon,
  iconPosition = "left",
  iconSize,
  iconColor,
  iconStrokeWidth = 2,
  renderIcon,
  className,
  disabled,
  ...props
}: Props) {
  const { colorScheme } = useColorScheme();

  const resolvedIconSize = iconSize ?? (size === "lg" ? 20 : 18);
  const resolvedIconColor =
    iconColor ??
    (variant === "primary" || variant === "danger"
      ? theme.colors.primaryForeground
      : variant === "secondary"
        ? colorScheme === "dark"
          ? theme.colors.foregroundDark
          : theme.colors.foregroundLight
        : colorScheme === "dark"
          ? theme.colors.primaryDark
          : theme.colors.primary);

  const iconNode = renderIcon
    ? renderIcon({
        size: resolvedIconSize,
        color: resolvedIconColor,
        strokeWidth: iconStrokeWidth,
      })
    : Icon
      ? (
          <Icon
            size={resolvedIconSize}
            color={resolvedIconColor}
            strokeWidth={iconStrokeWidth}
          />
        )
      : null;

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
      <View className="flex-row items-center justify-center gap-2">
        {iconPosition === "left" ? iconNode : null}
        <AppText
          variant="button"
          className={cn(theme.button.labelBase, theme.button.labelVariant[variant])}
        >
          {label}
        </AppText>
        {iconPosition === "right" ? iconNode : null}
      </View>
    </Pressable>
  );
}
