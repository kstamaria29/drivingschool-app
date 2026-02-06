import { useMemo, useState } from "react";
import { createDrawerNavigator } from "@react-navigation/drawer";
import type { NavigatorScreenParams } from "@react-navigation/native";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import type { HomeStackParamList } from "./HomeStackNavigator";
import { HomeStackNavigator } from "./HomeStackNavigator";
import type { LessonsStackParamList } from "./LessonsStackNavigator";
import { LessonsStackNavigator } from "./LessonsStackNavigator";
import type { StudentsStackParamList } from "./StudentsStackNavigator";
import { StudentsStackNavigator } from "./StudentsStackNavigator";
import type { SettingsStackParamList } from "./SettingsStackNavigator";
import { SettingsStackNavigator } from "./SettingsStackNavigator";
import type { AssessmentsStackParamList } from "./AssessmentsStackNavigator";
import { AssessmentsStackNavigator } from "./AssessmentsStackNavigator";
import type { MapsStackParamList } from "./MapsStackNavigator";
import { MapsStackNavigator } from "./MapsStackNavigator";
import { AppDrawerContent } from "./components/AppDrawerContent";
import { getDrawerScreenOptions } from "./navigationTheme";
import { useNavigationLayout } from "./useNavigationLayout";

export type MainDrawerParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  Lessons: NavigatorScreenParams<LessonsStackParamList> | undefined;
  Students: NavigatorScreenParams<StudentsStackParamList> | undefined;
  Assessments: NavigatorScreenParams<AssessmentsStackParamList> | undefined;
  GoogleMaps: NavigatorScreenParams<MapsStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
};

const Drawer = createDrawerNavigator<MainDrawerParamList>();

const SIDEBAR_WIDTH = 280;
const SIDEBAR_COLLAPSED_WIDTH = 88;

export function MainDrawerNavigator() {
  const { isSidebar } = useNavigationLayout();
  const [collapsed, setCollapsed] = useState(false);
  const { scheme } = useAppColorScheme();

  const drawerWidth = useMemo(() => {
    if (!isSidebar) return undefined;
    return collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;
  }, [collapsed, isSidebar]);

  const drawerThemeOptions = useMemo(
    () => getDrawerScreenOptions(scheme, drawerWidth),
    [drawerWidth, scheme],
  );

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        drawerType: isSidebar ? "permanent" : "front",
        ...drawerThemeOptions,
        swipeEnabled: !isSidebar,
      }}
      drawerContent={(props) => (
        <AppDrawerContent
          {...props}
          collapsed={isSidebar ? collapsed : false}
          setCollapsed={(next) => setCollapsed(next)}
          isPermanent={isSidebar}
        />
      )}
    >
      <Drawer.Screen name="Home" component={HomeStackNavigator} />
      <Drawer.Screen name="Lessons" component={LessonsStackNavigator} />
      <Drawer.Screen name="Students" component={StudentsStackNavigator} />
      <Drawer.Screen name="Assessments" component={AssessmentsStackNavigator} />
      <Drawer.Screen name="GoogleMaps" component={MapsStackNavigator} />
      <Drawer.Screen name="Settings" component={SettingsStackNavigator} />
    </Drawer.Navigator>
  );
}
