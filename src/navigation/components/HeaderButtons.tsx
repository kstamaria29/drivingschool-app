import { Pressable, View } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Menu } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { Avatar } from "../../components/Avatar";
import { theme } from "../../theme/theme";
import { useCurrentUser } from "../../features/auth/current-user";
import { useNavigationLayout } from "../useNavigationLayout";

export function HeaderLeftHamburger() {
  const navigation = useNavigation();
  const { isSidebar, isTablet } = useNavigationLayout();
  const { colorScheme } = useColorScheme();

  if (isSidebar) return null;

  const isTabletPortrait = isTablet && !isSidebar;
  const buttonSize = isTabletPortrait ? 48 : 44;
  const iconColor = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      hitSlop={10}
    >
      <View
        className="items-center justify-center rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark"
        style={{ height: buttonSize, width: buttonSize }}
      >
        <Menu color={iconColor} size={isTabletPortrait ? 26 : 24} />
      </View>
    </Pressable>
  );
}

export function HeaderRightAvatar() {
  const navigation = useNavigation();
  const { profile } = useCurrentUser();
  const { isSidebar, isTablet } = useNavigationLayout();
  const isTabletPortrait = isTablet && !isSidebar;
  const avatarSize = isTabletPortrait ? 48 : 44;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      onPress={() => navigation.getParent()?.navigate("Settings")}
      hitSlop={10}
    >
      <Avatar uri={profile.avatar_url} size={avatarSize} label={profile.display_name} />
    </Pressable>
  );
}
