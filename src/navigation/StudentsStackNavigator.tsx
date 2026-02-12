import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { StudentAssessmentHistoryScreen } from "./screens/StudentAssessmentHistoryScreen";
import { StudentDetailScreen } from "./screens/StudentDetailScreen";
import { StudentEditScreen } from "./screens/StudentEditScreen";
import { StudentRemindersScreen } from "./screens/StudentRemindersScreen";
import { StudentSessionHistoryScreen } from "./screens/StudentSessionHistoryScreen";
import { StudentsListScreen } from "./screens/StudentsListScreen";
import type { StudentAssessmentHistoryParams } from "./studentAssessmentHistoryParams";

export type StudentsStackParamList = {
  StudentsList: undefined;
  StudentDetail: { studentId: string };
  StudentAssessmentHistory: StudentAssessmentHistoryParams;
  StudentSessionHistory: { studentId: string; openNewSession?: boolean };
  StudentReminders: { studentId: string; openNewReminder?: boolean };
  StudentCreate: undefined;
  StudentEdit: { studentId: string };
};

const Stack = createNativeStackNavigator<StudentsStackParamList>();

export function StudentsStackNavigator() {
  const { scheme, themeKey } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme, themeKey]);

  return (
    <Stack.Navigator
      initialRouteName="StudentsList"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftMenuWithBack />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="StudentsList" component={StudentsListScreen} />
      <Stack.Screen name="StudentDetail" component={StudentDetailScreen} />
      <Stack.Screen name="StudentAssessmentHistory" component={StudentAssessmentHistoryScreen} />
      <Stack.Screen name="StudentSessionHistory" component={StudentSessionHistoryScreen} />
      <Stack.Screen name="StudentReminders" component={StudentRemindersScreen} />
      <Stack.Screen name="StudentCreate" component={StudentEditScreen} />
      <Stack.Screen name="StudentEdit" component={StudentEditScreen} />
    </Stack.Navigator>
  );
}
