import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { AssessmentsListScreen } from "./screens/AssessmentsListScreen";
import { DrivingAssessmentScreen } from "./screens/DrivingAssessmentScreen";

export type AssessmentsStackParamList = {
  AssessmentsMain: undefined;
  DrivingAssessment: { studentId?: string } | undefined;
};

const Stack = createNativeStackNavigator<AssessmentsStackParamList>();

export function AssessmentsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="AssessmentsMain"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="AssessmentsMain" component={AssessmentsListScreen} />
      <Stack.Screen name="DrivingAssessment" component={DrivingAssessmentScreen} />
    </Stack.Navigator>
  );
}
