import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { HomeScreen } from "./screens/HomeScreen";

export type HomeStackParamList = {
  HomeDashboard: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="HomeDashboard"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="HomeDashboard" component={HomeScreen} />
    </Stack.Navigator>
  );
}
