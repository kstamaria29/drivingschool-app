import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingCreateOrgScreen } from "./screens/OnboardingCreateOrgScreen";
import { SignupScreen } from "./screens/SignupScreen";
import { useAppColorScheme } from "../providers/ColorSchemeProvider";
import { getNativeStackScreenOptions } from "./navigationTheme";

export type AuthStackParamList = {
  Login: undefined;
  Signup: undefined;
  OnboardingCreateOrg: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

type Props = {
  initialRouteName: keyof AuthStackParamList;
};

export function AuthStackNavigator({ initialRouteName }: Props) {
  const { scheme, themeKey } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme, themeKey]);

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen
        name="OnboardingCreateOrg"
        component={OnboardingCreateOrgScreen}
        options={{ gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
