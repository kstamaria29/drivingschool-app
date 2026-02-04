import type { PropsWithChildren } from "react";
import { Text, type TextProps } from "react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

type AppTextVariant = "title" | "heading" | "body" | "caption" | "label" | "error" | "button";

type Props = PropsWithChildren<TextProps> & {
  variant?: AppTextVariant;
};

export function AppText({ variant = "body", className, ...props }: Props) {
  return (
    <Text
      className={cn(theme.text.base, theme.text.variant[variant], className)}
      {...props}
    />
  );
}
