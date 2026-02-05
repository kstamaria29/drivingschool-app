import { View } from "react-native";

import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { ChangePasswordForm } from "../../features/account/ChangePasswordForm";

export function ChangePasswordScreen() {
  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Change password</AppText>
          <AppText className="mt-2" variant="body">
            Update your account password.
          </AppText>
        </View>

        <ChangePasswordForm variant="normal" />
      </AppStack>
    </Screen>
  );
}

