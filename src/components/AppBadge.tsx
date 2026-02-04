import { View, type ViewProps } from "react-native";

import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type Variant = "scheduled" | "completed" | "cancelled";

type Props = Omit<ViewProps, "children"> & {
  label: string;
  variant: Variant;
};

const variantClasses: Record<Variant, { wrapper: string; text: string }> = {
  scheduled: { wrapper: "bg-primary/15 border-primary/30", text: "text-primary" },
  completed: { wrapper: "bg-green-500/15 border-green-500/30", text: "text-green-700" },
  cancelled: { wrapper: "bg-red-500/15 border-red-500/30", text: "text-red-700" },
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
      <AppText className={cn("text-xs font-semibold", variantClasses[variant].text)} variant="caption">
        {label}
      </AppText>
    </View>
  );
}

