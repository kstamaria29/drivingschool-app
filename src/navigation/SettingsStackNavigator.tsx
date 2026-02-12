import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftMenuWithBack, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { AddInstructorScreen } from "./screens/AddInstructorScreen";
import { ChangePasswordScreen } from "./screens/ChangePasswordScreen";
import { EditDetailsScreen } from "./screens/EditDetailsScreen";
import { EditOrganizationNameScreen } from "./screens/EditOrganizationNameScreen";
import { EditRoleDisplayScreen } from "./screens/EditRoleDisplayScreen";
import { MemberProfileScreen } from "./screens/MemberProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ThemesScreen } from "./screens/ThemesScreen";
import { ViewMembersScreen } from "./screens/ViewMembersScreen";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  Themes: undefined;
  EditDetails: undefined;
  ChangePassword: undefined;
  EditOrganizationName: undefined;
  ViewMembers: undefined;
  MemberProfile: { memberId: string };
  EditRoleDisplay: undefined;
  AddInstructor: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  const { scheme, themeKey } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme, themeKey]);

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        ...baseOptions,
        headerLeft: () => <HeaderLeftMenuWithBack />,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerTitle: "",
          headerRight: () => <HeaderRightAvatar />,
        }}
      />
      <Stack.Screen
        name="Themes"
        component={ThemesScreen}
        options={{ headerTitle: "Themes" }}
      />
      <Stack.Screen
        name="EditDetails"
        component={EditDetailsScreen}
        options={{ headerTitle: "Edit details" }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ headerTitle: "Change password" }}
      />
      <Stack.Screen
        name="EditOrganizationName"
        component={EditOrganizationNameScreen}
        options={{ headerTitle: "Change organization name" }}
      />
      <Stack.Screen
        name="ViewMembers"
        component={ViewMembersScreen}
        options={{ headerTitle: "View members" }}
      />
      <Stack.Screen
        name="MemberProfile"
        component={MemberProfileScreen}
        options={{ headerTitle: "Member profile" }}
      />
      <Stack.Screen
        name="EditRoleDisplay"
        component={EditRoleDisplayScreen}
        options={{ headerTitle: "Change role display" }}
      />
      <Stack.Screen
        name="AddInstructor"
        component={AddInstructorScreen}
        options={{ headerTitle: "Add instructor" }}
      />
    </Stack.Navigator>
  );
}
