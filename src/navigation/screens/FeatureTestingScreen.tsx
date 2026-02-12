import type { DrawerNavigationProp } from "@react-navigation/drawer";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";

import type { MainDrawerParamList } from "../MainDrawerNavigator";
import type { FeatureTestingStackParamList } from "../FeatureTestingStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type Props = NativeStackScreenProps<FeatureTestingStackParamList, "FeatureTestingMain">;

export function FeatureTestingScreen({ navigation }: Props) {
  const { isCompact } = useNavigationLayout();
  const { profile } = useCurrentUser();
  const isAdmin = profile.role === "admin";

  function handleBackPress() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }

    const drawerNavigation =
      navigation.getParent<DrawerNavigationProp<MainDrawerParamList>>();
    drawerNavigation?.navigate("Home", { screen: "HomeDashboard" });
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Feature Testing</AppText>
          <AppText className="mt-2" variant="body">
            {isAdmin
              ? "This blank screen is reserved for testing new features and experiments."
              : "This screen is only accessible to admins."}
          </AppText>
        </View>

        <AppButton width="auto" variant="secondary" label="Back" onPress={handleBackPress} />
      </AppStack>
    </Screen>
  );
}
