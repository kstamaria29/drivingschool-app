import type { PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

type Props = PropsWithChildren<ViewProps>;

export function AppCard({ className, ...props }: Props) {
  return <View className={cn(theme.card.base, className)} {...props} />;
}
