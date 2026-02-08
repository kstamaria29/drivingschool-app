import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { HomeScreen } from "./screens/HomeScreen";

export type HomeStackParamList = {
  HomeDashboard: undefined;
};

const Stack = createNativeStackNavigator<HomeStackParamList>();

export function HomeStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="HomeDashboard"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftMenuWithBack showBack={false} />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="HomeDashboard" component={HomeScreen} />
    </Stack.Navigator>
  );
}
