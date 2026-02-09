import { View } from "react-native";

import { cn } from "../utils/cn";

type Props = {
  className?: string;
};

export function AppDivider({ className }: Props) {
  return <View className={cn("h-px w-full bg-border dark:bg-borderDark", className)} />;
}
