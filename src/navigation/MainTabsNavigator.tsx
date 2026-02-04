import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { LessonsPlaceholderScreen } from "./screens/LessonsPlaceholderScreen";
import { StudentsPlaceholderScreen } from "./screens/StudentsPlaceholderScreen";

export type MainTabsParamList = {
  Lessons: undefined;
  Students: undefined;
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

export function MainTabsNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShadowVisible: false }}>
      <Tabs.Screen name="Lessons" component={LessonsPlaceholderScreen} />
      <Tabs.Screen name="Students" component={StudentsPlaceholderScreen} />
    </Tabs.Navigator>
  );
}

