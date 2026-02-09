import { View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useSignOutMutation } from "../../features/auth/queries";
import { ChangePasswordForm } from "../../features/account/ChangePasswordForm";

import { useNavigationLayout } from "../useNavigationLayout";

export function ForcePasswordChangeScreen() {
  const { isCompact } = useNavigationLayout();
  const signOutMutation = useSignOutMutation();

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Change your password</AppText>
          <AppText className="mt-2" variant="body">
            You need to change your temporary password before you can continue.
          </AppText>
        </View>

        <ChangePasswordForm variant="forced" />

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
