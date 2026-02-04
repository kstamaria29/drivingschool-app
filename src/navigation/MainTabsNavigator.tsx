import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import type { NavigatorScreenParams } from "@react-navigation/native";

import type { LessonsStackParamList } from "./LessonsStackNavigator";
import { LessonsStackNavigator } from "./LessonsStackNavigator";
import { StudentsStackNavigator } from "./StudentsStackNavigator";
import type { StudentsStackParamList } from "./StudentsStackNavigator";

export type MainTabsParamList = {
  Lessons: NavigatorScreenParams<LessonsStackParamList> | undefined;
  Students: NavigatorScreenParams<StudentsStackParamList> | undefined;
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

export function MainTabsNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Lessons" component={LessonsStackNavigator} />
      <Tabs.Screen name="Students" component={StudentsStackNavigator} />
    </Tabs.Navigator>
  );
}
