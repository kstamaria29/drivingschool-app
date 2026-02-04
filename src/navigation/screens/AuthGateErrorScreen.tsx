import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

type Props = {
  title: string;
  message: string;
  onRetry: () => void;
  retryLabel?: string;
  onSignOut: () => void;
  signingOut?: boolean;
};

export function AuthGateErrorScreen({
  title,
  message,
  onRetry,
  retryLabel = "Retry",
  onSignOut,
  signingOut,
}: Props) {
  return (
    <Screen>
      <AppStack gap="lg">
        <AppText variant="title">{title}</AppText>

        <AppCard className="gap-3">
          <AppText variant="body">{message}</AppText>
        </AppCard>

        <AppButton label={retryLabel} onPress={onRetry} />
        <AppButton
          label={signingOut ? "Signing out..." : "Sign out"}
          variant="secondary"
          disabled={signingOut}
          onPress={onSignOut}
        />
      </AppStack>
    </Screen>
  );
}
