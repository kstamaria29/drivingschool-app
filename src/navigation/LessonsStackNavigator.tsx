import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { LessonEditScreen } from "./screens/LessonEditScreen";
import { LessonsListScreen } from "./screens/LessonsListScreen";

export type LessonsStackParamList = {
  LessonsList: undefined;
  LessonCreate: undefined;
  LessonEdit: { lessonId: string };
};

const Stack = createNativeStackNavigator<LessonsStackParamList>();

export function LessonsStackNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="LessonsList"
      screenOptions={{
        headerShadowVisible: false,
        headerTitle: "",
      }}
    >
      <Stack.Screen name="LessonsList" component={LessonsListScreen} />
      <Stack.Screen name="LessonCreate" component={LessonEditScreen} />
      <Stack.Screen name="LessonEdit" component={LessonEditScreen} />
    </Stack.Navigator>
  );
}

