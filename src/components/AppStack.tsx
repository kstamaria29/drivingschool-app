import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { cn } from "../utils/cn";

type Props = PropsWithChildren<ViewProps> & {
  gap?: "sm" | "md" | "lg";
};

const gapClasses: Record<NonNullable<Props["gap"]>, string> = {
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
};

export function AppStack({ gap = "md", className, ...props }: Props) {
  return <View className={cn(gapClasses[gap], className)} {...props} />;
}
