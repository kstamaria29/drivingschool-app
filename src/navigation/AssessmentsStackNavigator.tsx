import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { AssessmentsComingSoonScreen } from "./screens/AssessmentsComingSoonScreen";

export type AssessmentsStackParamList = {
  Assessments: undefined;
};

const Stack = createNativeStackNavigator<AssessmentsStackParamList>();

export function AssessmentsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Assessments"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="Assessments" component={AssessmentsComingSoonScreen} />
    </Stack.Navigator>
  );
}

