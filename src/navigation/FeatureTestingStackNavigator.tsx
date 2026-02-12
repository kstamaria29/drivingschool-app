import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { FeatureTestingScreen } from "./screens/FeatureTestingScreen";

export type FeatureTestingStackParamList = {
  FeatureTestingMain: undefined;
};

const Stack = createNativeStackNavigator<FeatureTestingStackParamList>();

export function FeatureTestingStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="FeatureTestingMain"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftMenuWithBack />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="FeatureTestingMain" component={FeatureTestingScreen} />
    </Stack.Navigator>
  );
}
