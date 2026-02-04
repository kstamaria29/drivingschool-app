import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LoginScreen } from "./screens/LoginScreen";
import { OnboardingCreateOrgScreen } from "./screens/OnboardingCreateOrgScreen";
import { SignupScreen } from "./screens/SignupScreen";

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
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShadowVisible: false,
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
