import type { ComponentProps } from "react";
import { ActivityIndicator, View } from "react-native";
import type { LucideIcon } from "lucide-react-native";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppButton } from "./AppButton";
import { AppCard } from "./AppCard";
import { AppStack } from "./AppStack";
import { AppText } from "./AppText";

type RetryPlacement = "inside" | "outside";

type LoadingStateProps = {
  label: string;
  className?: string;
};

type ErrorStateProps = {
  title: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryIcon?: LucideIcon;
  retryVariant?: ComponentProps<typeof AppButton>["variant"];
  retryPlacement?: RetryPlacement;
  className?: string;
  cardClassName?: string;
};

type EmptyStateCardProps = {
  title: string;
  message: string;
  className?: string;
};

export function CenteredLoadingState({ label, className }: LoadingStateProps) {
  return (
    <View className={cn("items-center justify-center py-10", theme.text.base, className)}>
      <ActivityIndicator />
      <AppText className="mt-3 text-center" variant="body">
        {label}
      </AppText>
    </View>
  );
}

export function ErrorStateCard({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  retryIcon,
  retryVariant = "secondary",
  retryPlacement = "outside",
  className,
  cardClassName,
}: ErrorStateProps) {
  const retryButton = onRetry ? (
    <AppButton
      width="auto"
      variant={retryVariant}
      label={retryLabel}
      icon={retryIcon}
      onPress={onRetry}
    />
  ) : null;

  return (
    <AppStack gap="md" className={className}>
      <AppCard className={cn("gap-2", cardClassName)}>
        <AppText variant="heading">{title}</AppText>
        <AppText variant="body">{message}</AppText>
        {retryPlacement === "inside" ? retryButton : null}
      </AppCard>
      {retryPlacement === "outside" ? retryButton : null}
    </AppStack>
  );
}

export function EmptyStateCard({ title, message, className }: EmptyStateCardProps) {
  return (
    <AppCard className={cn("gap-2", className)}>
      <AppText variant="heading">{title}</AppText>
      <AppText variant="body">{message}</AppText>
    </AppCard>
  );
}
