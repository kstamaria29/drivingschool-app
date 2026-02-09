import { View, type ViewProps } from "react-native";

import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type Variant = "scheduled" | "completed" | "cancelled";

type Props = Omit<ViewProps, "children"> & {
  label: string;
  variant: Variant;
};

const variantClasses: Record<Variant, { wrapper: string; text: string }> = {
  scheduled: {
    wrapper: "bg-primary/15 border-primary/30 dark:bg-primaryDark/20 dark:border-primaryDark/30",
    text: "text-primary dark:text-primaryDark",
  },
  completed: {
    wrapper: "bg-green-600/15 border-green-600/30 dark:bg-green-500/15 dark:border-green-500/30",
    text: "text-green-800 dark:text-green-200",
  },
  cancelled: {
    wrapper: "bg-red-500/15 border-red-500/30 dark:bg-red-400/15 dark:border-red-400/30",
    text: "text-red-800 dark:text-red-200",
  },
};

export function AppBadge({ label, variant, className, ...props }: Props) {
  return (
    <View
      className={cn(
        "self-start rounded-full border px-3 py-1",
        variantClasses[variant].wrapper,
        className,
      )}
      {...props}
    >
      <AppText
        className={cn("text-xs font-semibold", variantClasses[variant].text)}
        variant="caption"
      >
        {label}
      </AppText>
    </View>
  );
}
