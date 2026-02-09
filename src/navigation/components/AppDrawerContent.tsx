import type { ReactNode } from "react";
import { Alert, Pressable, View } from "react-native";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  LogOut,
  Map,
  Settings,
  Users,
} from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { AppImage } from "../../components/AppImage";
import { AppText } from "../../components/AppText";
import { AppDivider } from "../../components/AppDivider";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { getProfileFullName } from "../../utils/profileName";
import { useCurrentUser } from "../../features/auth/current-user";
import { useSignOutMutation } from "../../features/auth/queries";
import { getRoleDisplayLabel } from "../../features/auth/roles";
import { useAppColorScheme } from "../../providers/ColorSchemeProvider";
import {
  useOrganizationQuery,
  useOrganizationSettingsQuery,
} from "../../features/organization/queries";

type DrawerRouteName =
  | "Home"
  | "Lessons"
  | "Students"
  | "Assessments"
  | "GoogleMaps"
  | "Settings";

type Props = DrawerContentComponentProps & {
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  isPermanent: boolean;
};

function DrawerRow({
  collapsed,
  label,
  icon,
  active,
  onPress,
  disabled,
  labelClassName,
  rightAligned,
}: {
  collapsed: boolean;
  label: string;
  icon: ReactNode;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  labelClassName?: string;
  rightAligned?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        "mb-1 flex-row items-center gap-3 rounded-xl border px-3 py-3",
        active ? "border-primary bg-primary/10 dark:border-primaryDark dark:bg-primaryDark/10" : "border-transparent bg-transparent",
        disabled ? "opacity-50" : "",
        rightAligned ? "justify-end" : "",
      )}
    >
      <View className="w-6 items-center justify-center">{icon}</View>
      {collapsed ? null : (
        <AppText variant="body" className={labelClassName}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

export function AppDrawerContent({
  state,
  navigation,
  collapsed,
  setCollapsed,
  isPermanent,
}: Props) {
  const { profile } = useCurrentUser();
  const { scheme } = useAppColorScheme();
  const signOutMutation = useSignOutMutation();

  const organizationQuery = useOrganizationQuery(profile.organization_id);
  const settingsQuery = useOrganizationSettingsQuery(profile.organization_id);

  const currentRouteName = state.routes[state.index]?.name as DrawerRouteName | undefined;

  const orgName = organizationQuery.data?.name ?? "Organization";
  const logoUrl = settingsQuery.data?.logo_url ?? null;

  const iconColor = scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;
  const dangerColor = scheme === "dark" ? theme.colors.dangerDark : theme.colors.danger;
  const backgroundColor = scheme === "dark" ? theme.colors.backgroundDark : theme.colors.backgroundLight;

  function confirmSignOut() {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: () => {
          signOutMutation.mutate(undefined, {
            onError: () => {
              Alert.alert("Couldn't sign out", "Please try again.");
            },
          });
        },
      },
    ]);
  }

  return (
    <DrawerContentScrollView
      style={{ backgroundColor }}
      contentContainerStyle={{ flexGrow: 1, paddingTop: 0 }}
    >
      <View className="flex-1 px-3 pb-4 pt-10">
        <View className={cn("mb-4", isPermanent ? "" : "gap-3")}>
          {isPermanent ? (
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                {logoUrl ? (
                  <AppImage
                    source={{ uri: logoUrl }}
                    resizeMode="contain"
                    className="h-10 w-10 bg-transparent"
                  />
                ) : (
                  <View className="h-10 w-10 border border-border bg-card dark:border-borderDark dark:bg-cardDark" />
                )}
                {collapsed ? null : (
                  <View>
                    <AppText variant="label">{orgName}</AppText>
                    <AppText variant="caption">{getRoleDisplayLabel(profile)}</AppText>
                  </View>
                )}
              </View>

              <Pressable
                onPress={() => setCollapsed(!collapsed)}
                accessibilityRole="button"
                accessibilityLabel={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                hitSlop={10}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
                  {collapsed ? (
                    <ChevronRight color={iconColor} size={18} />
                  ) : (
                    <ChevronLeft color={iconColor} size={18} />
                  )}
                </View>
              </Pressable>
            </View>
          ) : (
            <View>
              <View className="flex-row items-center gap-3 px-1">
                {logoUrl ? (
                  <AppImage
                    source={{ uri: logoUrl }}
                    resizeMode="contain"
                    className="h-12 w-12 bg-transparent"
                  />
                ) : (
                  <View className="h-12 w-12 border border-border bg-card dark:border-borderDark dark:bg-cardDark" />
                )}
                <View className="flex-1">
                  <AppText variant="heading">{orgName}</AppText>
                  <AppText variant="caption">{getProfileFullName(profile)}</AppText>
                </View>
              </View>
              <View className="mt-4">
                <AppDivider />
              </View>
            </View>
          )}
        </View>

        <View className="flex-1">
          <DrawerRow
            collapsed={collapsed}
            label="Home"
            icon={<Home color={iconColor} size={20} />}
            active={currentRouteName === "Home"}
            onPress={() => navigation.navigate("Home")}
          />
          <DrawerRow
            collapsed={collapsed}
            label="Lessons"
            icon={<BookOpen color={iconColor} size={20} />}
            active={currentRouteName === "Lessons"}
            onPress={() => navigation.navigate("Lessons")}
          />
          <DrawerRow
            collapsed={collapsed}
            label="Students"
            icon={<Users color={iconColor} size={20} />}
            active={currentRouteName === "Students"}
            onPress={() =>
              navigation.navigate("Students", {
                screen: "StudentsList",
              })
            }
          />
          <DrawerRow
            collapsed={collapsed}
            label="Assessments"
            icon={<ClipboardList color={iconColor} size={20} />}
            active={currentRouteName === "Assessments"}
            onPress={() =>
              navigation.navigate("Assessments", {
                screen: "AssessmentsMain",
              })
            }
          />
          <DrawerRow
            collapsed={collapsed}
            label="Google Maps"
            icon={<Map color={iconColor} size={20} />}
            active={currentRouteName === "GoogleMaps"}
            onPress={() => navigation.navigate("GoogleMaps")}
          />
          <View className="my-2">
            <AppDivider />
          </View>
          <DrawerRow
            collapsed={collapsed}
            label="Settings"
            icon={<Settings color={iconColor} size={20} />}
            active={currentRouteName === "Settings"}
            onPress={() => navigation.navigate("Settings")}
          />
        </View>

        <View className="mt-2">
          <AppDivider />
          <View className="mt-3">
            <Pressable
              onPress={() => navigation.navigate("Settings")}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              className={cn(
                "mt-2 flex-row items-center gap-3 px-3",
                collapsed ? "py-2" : "",
              )}
            >
              <Avatar uri={profile.avatar_url} size={36} label={getProfileFullName(profile)} />
              {collapsed ? null : (
                <View className="flex-1">
                  <AppText variant="label">{getProfileFullName(profile)}</AppText>
                  <AppText variant="caption">{getRoleDisplayLabel(profile)}</AppText>
                </View>
              )}
            </Pressable>

            <DrawerRow
              collapsed={collapsed}
              label={signOutMutation.isPending ? "Signing out..." : "Sign out"}
              icon={<LogOut color={dangerColor} size={20} />}
              labelClassName="text-danger dark:text-dangerDark"
              active={false}
              onPress={confirmSignOut}
              disabled={signOutMutation.isPending}
              rightAligned
            />
          </View>
        </View>
      </View>
    </DrawerContentScrollView>
  );
}
