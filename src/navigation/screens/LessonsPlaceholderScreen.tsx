import dayjs from "dayjs";

import { AppButton } from "../../components/AppButton";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useSignOutMutation } from "../../features/auth/queries";

export function LessonsPlaceholderScreen() {
  const signOutMutation = useSignOutMutation();

  return (
    <Screen>
      <AppStack gap="lg">
        <AppText variant="title">Today</AppText>
        <AppText variant="body">{dayjs().format("dddd, D MMMM YYYY")}</AppText>
        <AppText variant="caption">Lessons will be implemented after auth + onboarding.</AppText>
        <AppButton
          label={signOutMutation.isPending ? "Signing out..." : "Sign out"}
          variant="secondary"
          disabled={signOutMutation.isPending}
          onPress={() => signOutMutation.mutate()}
        />
      </AppStack>
    </Screen>
  );
}
