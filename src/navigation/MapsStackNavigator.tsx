import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { GoogleMapsScreen } from "./screens/GoogleMapsScreen";

export type MapsStackParamList = {
  GoogleMapsMain: undefined;
};

const Stack = createNativeStackNavigator<MapsStackParamList>();

export function MapsStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="GoogleMapsMain"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen
        name="GoogleMapsMain"
        component={GoogleMapsScreen}
        options={{ headerLeft: () => <HeaderLeftHamburger /> }}
      />
    </Stack.Navigator>
  );
}
