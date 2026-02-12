import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { SessionsListScreen } from "./screens/SessionsListScreen";
import { StudentSessionHistoryScreen } from "./screens/StudentSessionHistoryScreen";

export type SessionsStackParamList = {
  SessionsList: undefined;
  StudentSessionHistory: { studentId: string; openNewSession?: boolean };
};

const Stack = createNativeStackNavigator<SessionsStackParamList>();

export function SessionsStackNavigator() {
  const { scheme, themeKey } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme, themeKey]);

  return (
    <Stack.Navigator
      initialRouteName="SessionsList"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftMenuWithBack />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="SessionsList" component={SessionsListScreen} />
      <Stack.Screen name="StudentSessionHistory" component={StudentSessionHistoryScreen} />
    </Stack.Navigator>
  );
}
