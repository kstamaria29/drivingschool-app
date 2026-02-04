import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { LessonEditScreen } from "./screens/LessonEditScreen";
import { LessonsListScreen } from "./screens/LessonsListScreen";

export type LessonsStackParamList = {
  LessonsList: undefined;
  LessonCreate: { initialDate?: string } | undefined;
  LessonEdit: { lessonId: string };
};

const Stack = createNativeStackNavigator<LessonsStackParamList>();

export function LessonsStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="LessonsList"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen
        name="LessonsList"
        component={LessonsListScreen}
        options={{ headerLeft: () => <HeaderLeftHamburger /> }}
      />
      <Stack.Screen name="LessonCreate" component={LessonEditScreen} />
      <Stack.Screen name="LessonEdit" component={LessonEditScreen} />
    </Stack.Navigator>
  );
}
