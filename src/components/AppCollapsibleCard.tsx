import type { PropsWithChildren } from "react";
import { Pressable, View } from "react-native";

import { cn } from "../utils/cn";

import { AppCard } from "./AppCard";
import { AppText } from "./AppText";

type Props = PropsWithChildren<{
  title: string;
  subtitle?: string;
  rightText?: string;
  expanded: boolean;
  onToggle: () => void;
  className?: string;
}>;

export function AppCollapsibleCard({
  title,
  subtitle,
  rightText,
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
          {subtitle ? (
            <AppText className="mt-1" variant="caption">
              {subtitle}
            </AppText>
          ) : null}
        </View>

        <View className="items-end">
          {rightText ? <AppText variant="caption">{rightText}</AppText> : null}
          <AppText className="mt-1" variant="caption">
            {expanded ? "Hide" : "Show"}
          </AppText>
        </View>
      </Pressable>

      {expanded ? children : null}
    </AppCard>
  );
}

