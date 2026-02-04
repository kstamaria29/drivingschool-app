import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { LessonsPlaceholderScreen } from "./screens/LessonsPlaceholderScreen";
import { StudentsStackNavigator } from "./StudentsStackNavigator";

export type MainTabsParamList = {
  Lessons: undefined;
  Students: undefined;
};

const Tabs = createBottomTabNavigator<MainTabsParamList>();

export function MainTabsNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="Lessons" component={LessonsPlaceholderScreen} />
      <Tabs.Screen name="Students" component={StudentsStackNavigator} />
    </Tabs.Navigator>
  );
}
