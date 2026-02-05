import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { getNativeStackScreenOptions } from "./navigationTheme";
import { ForcePasswordChangeScreen } from "./screens/ForcePasswordChangeScreen";

export type ForcedPasswordChangeStackParamList = {
  ForcePasswordChange: undefined;
};

const Stack = createNativeStackNavigator<ForcedPasswordChangeStackParamList>();

export function ForcedPasswordChangeStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="ForcePasswordChange"
      screenOptions={{
        ...baseOptions,
        headerBackVisible: false,
        headerTitle: "",
        headerLeft: () => null,
      }}
    >
      <Stack.Screen name="ForcePasswordChange" component={ForcePasswordChangeScreen} />
    </Stack.Navigator>
  );
}

