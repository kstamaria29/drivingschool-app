import type { PropsWithChildren, ReactNode } from "react";
import { Pressable, View } from "react-native";

import { cn } from "../utils/cn";

import { AppCard } from "./AppCard";
import { AppText, type AppTextVariant } from "./AppText";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  subtitleNode?: ReactNode;
  subtitleVariant?: AppTextVariant;
  subtitleClassName?: string;
  showLabelClassName?: string;
  hideLabelClassName?: string;
  rightText?: string;
  rightTextClassName?: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}>;

export function AppCollapsibleCard({
  title,
  subtitle,
  subtitleNode,
  subtitleVariant = "caption",
  subtitleClassName,
  showLabelClassName,
  hideLabelClassName,
  rightText,
  rightTextClassName,
  expanded,
  onToggle,
  className,
  children,
}: Props) {
  return (
    <AppCard className={cn("gap-3", className)}>
      <Pressable accessibilityRole="button" onPress={onToggle} className="flex-row items-start gap-3">
        <View className="flex-1">
          <AppText variant="heading">{title}</AppText>
          {subtitleNode ? (
            <View className={cn("mt-1")}>{subtitleNode}</View>
          ) : subtitle ? (
            <AppText className={cn("mt-1", subtitleClassName)} variant={subtitleVariant}>
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View className="items-end">
          {rightText ? (
            <AppText className={rightTextClassName} variant="caption">
              {rightText}
            </AppText>
          ) : null}
          <AppText
            className={cn(
              "mt-1 text-sm",
              expanded
                ? hideLabelClassName ?? "text-muted dark:text-mutedDark"
                : showLabelClassName ?? "text-muted dark:text-mutedDark",
            )}
            variant="button"
          >
            {expanded ? "Hide" : "Show"}
          </AppText>
        </View>
      </Pressable>

      {expanded ? children : null}
    </AppCard>
  );
}
