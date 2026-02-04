import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { SettingsScreen } from "./screens/SettingsScreen";

export type SettingsStackParamList = {
  SettingsMain: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
