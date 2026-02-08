import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";
import type { LucideIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type AppButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type AppButtonSize = "md" | "lg" | "icon";
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
  badgeCount?: number;
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
  badgeCount,
  renderIcon,
  className,
  disabled,
  ...props
}: Props) {
  const { colorScheme } = useColorScheme();
  const hasLabel = label.length > 0;

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

  const resolvedBadgeCount =
    typeof badgeCount === "number" && Number.isFinite(badgeCount) && badgeCount > 0
      ? Math.min(Math.floor(badgeCount), 99)
      : null;

  const iconWithBadge = iconNode ? (
    <View className="relative">
      {iconNode}
      {resolvedBadgeCount != null ? (
        <View className="absolute -right-2 -top-2 min-w-[18px] items-center rounded-full bg-danger px-1 py-0.5 dark:bg-dangerDark">
          <AppText className="text-[10px] font-semibold leading-none text-primaryForeground" variant="caption">
            {badgeCount != null && badgeCount > 99 ? "99+" : String(resolvedBadgeCount)}
          </AppText>
        </View>
      ) : null}
    </View>
  ) : null;
  const showContentGap = hasLabel && iconNode != null;

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
      <View
        className={cn(
          "flex-row items-center justify-center",
          size === "icon" && "h-full w-full",
          showContentGap && "gap-2",
        )}
      >
        {iconPosition === "left" ? iconWithBadge : null}
        {hasLabel ? (
          <AppText
            variant="button"
            className={cn(theme.button.labelBase, theme.button.labelVariant[variant])}
          >
            {label}
          </AppText>
        ) : null}
        {iconPosition === "right" ? iconWithBadge : null}
      </View>
    </Pressable>
  );
}
