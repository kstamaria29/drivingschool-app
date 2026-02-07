import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useMemo } from "react";

import { useAppColorScheme } from "../providers/ColorSchemeProvider";

import { HeaderLeftHamburger, HeaderRightAvatar } from "./components/HeaderButtons";
import { getNativeStackScreenOptions } from "./navigationTheme";
import { AddInstructorScreen } from "./screens/AddInstructorScreen";
import { ChangePasswordScreen } from "./screens/ChangePasswordScreen";
import { EditNameScreen } from "./screens/EditNameScreen";
import { EditOrganizationNameScreen } from "./screens/EditOrganizationNameScreen";
import { EditRoleDisplayScreen } from "./screens/EditRoleDisplayScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ViewMembersScreen } from "./screens/ViewMembersScreen";

export type SettingsStackParamList = {
  SettingsMain: undefined;
  EditName: undefined;
  ChangePassword: undefined;
  EditOrganizationName: undefined;
  ViewMembers: undefined;
  EditRoleDisplay: undefined;
  AddInstructor: undefined;
};

const Stack = createNativeStackNavigator<SettingsStackParamList>();

export function SettingsStackNavigator() {
  const { scheme } = useAppColorScheme();
  const baseOptions = useMemo(() => getNativeStackScreenOptions(scheme), [scheme]);

  return (
    <Stack.Navigator
      initialRouteName="SettingsMain"
      screenOptions={{
        ...baseOptions,
      }}
    >
      <Stack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          headerTitle: "",
          headerLeft: () => <HeaderLeftHamburger />,
          headerRight: () => <HeaderRightAvatar />,
        }}
      />
      <Stack.Screen
        name="EditName"
        component={EditNameScreen}
        options={{ headerTitle: "Change name" }}
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
