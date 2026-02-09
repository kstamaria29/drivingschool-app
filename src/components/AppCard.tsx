import type { PropsWithChildren } from "react";
import { useWindowDimensions, View, type ViewProps } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

type Props = PropsWithChildren<ViewProps>;

export function AppCard({ className, ...props }: Props) {
  const { width, height } = useWindowDimensions();
  const isCompact = Math.min(width, height) < 600;

  return <View className={cn(theme.card.base, isCompact && "p-3", className)} {...props} />;
}
