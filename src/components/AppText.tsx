import type { PropsWithChildren } from "react";
import { Text, type TextProps } from "react-native";

import { useThemeFonts } from "../providers/ThemeFontsProvider";
import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

export type AppTextVariant = "title" | "heading" | "body" | "caption" | "label" | "error" | "button";

type Props = PropsWithChildren<TextProps> & {
  variant?: AppTextVariant;
};

function getFontFamily(variant: AppTextVariant, input: { regular: string; medium: string; semibold: string }) {
  if (variant === "title" || variant === "heading" || variant === "button") return input.semibold;
  if (variant === "label") return input.medium;
  return input.regular;
}

export function AppText({ variant = "body", className, style, ...props }: Props) {
  const { fonts } = useThemeFonts();

  return (
    <Text
      className={cn(theme.text.base, theme.text.variant[variant], className)}
      style={[{ fontFamily: getFontFamily(variant, fonts) }, style]}
      {...props}
    />
  );
}
