import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { StudentAssessmentHistoryScreen } from "./screens/StudentAssessmentHistoryScreen";
import { StudentDetailScreen } from "./screens/StudentDetailScreen";
import { StudentEditScreen } from "./screens/StudentEditScreen";
import { StudentsListScreen } from "./screens/StudentsListScreen";

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: string };
  StudentAssessmentHistory: { studentId: string };
  StudentCreate: undefined;
  StudentEdit: { studentId: string };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="StudentsList"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen
        name="StudentsList"
        component={StudentsListScreen}
        options={{ headerLeft: () => <HeaderLeftHamburger /> }}
      />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentAssessmentHistory" component={StudentAssessmentHistoryScreen} />
      <Stack.Screen name="StudentCreate" component={StudentEditScreen} />
      <Stack.Screen name="StudentEdit" component={StudentEditScreen} />
    </Stack.Navigator>
  );
}
