import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { AssessmentsListScreen } from "./screens/AssessmentsListScreen";
import { DrivingAssessmentScreen } from "./screens/DrivingAssessmentScreen";
import { FullLicenseMockTestScreen } from "./screens/FullLicenseMockTestScreen";
import { RestrictedMockTestScreen } from "./screens/RestrictedMockTestScreen";

export type AssessmentsStackParamList = {
  AssessmentsMain: undefined;
  DrivingAssessment: { studentId?: string } | undefined;
  RestrictedMockTest: { studentId?: string } | undefined;
  FullLicenseMockTest: { studentId?: string } | undefined;
};

const Stack = createNativeStackNavigator<AssessmentsStackParamList>();

export function AssessmentsStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="AssessmentsMain"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftHamburger />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="AssessmentsMain" component={AssessmentsListScreen} />
      <Stack.Screen name="DrivingAssessment" component={DrivingAssessmentScreen} />
      <Stack.Screen name="RestrictedMockTest" component={RestrictedMockTestScreen} />
      <Stack.Screen name="FullLicenseMockTest" component={FullLicenseMockTestScreen} />
    </Stack.Navigator>
  );
}
