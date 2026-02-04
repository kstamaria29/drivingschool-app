import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { HomeScreen } from "./screens/HomeScreen";

export type HomeStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

