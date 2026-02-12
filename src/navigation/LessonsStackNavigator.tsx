import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
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
  const { scheme, themeKey } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme, themeKey]);

  return (
    <Stack.Navigator
      initialRouteName="LessonsList"
      screenOptions={{
        ...baseOptions,
        headerTitle: "",
        headerLeft: () => <HeaderLeftMenuWithBack />,
        headerRight: () => <HeaderRightAvatar />,
      }}
    >
      <Stack.Screen name="LessonsList" component={LessonsListScreen} />
      <Stack.Screen name="LessonCreate" component={LessonEditScreen} />
      <Stack.Screen name="LessonEdit" component={LessonEditScreen} />
    </Stack.Navigator>
  );
}
