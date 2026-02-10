import type { PropsWithChildren } from "react";
import { Text, type TextProps } from "react-native";

import { fonts } from "../theme/fonts";
import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

export type AppTextVariant = "title" | "heading" | "body" | "caption" | "label" | "error" | "button";

type Props = PropsWithChildren<TextProps> & {
  variant?: AppTextVariant;
};

function getFontFamily(variant: AppTextVariant) {
  if (variant === "title" || variant === "heading" || variant === "button") return fonts.semibold;
  if (variant === "label") return fonts.medium;
  return fonts.regular;
}

export function AppText({ variant = "body", className, style, ...props }: Props) {
  return (
    <Text
      className={cn(theme.text.base, theme.text.variant[variant], className)}
      style={[{ fontFamily: getFontFamily(variant) }, style]}
      {...props}
    />
  );
}
