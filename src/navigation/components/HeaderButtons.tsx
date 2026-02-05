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
  const { isSidebar } = useNavigationLayout();
  const { colorScheme } = useColorScheme();

  if (isSidebar) return null;

  const iconColor = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      hitSlop={10}
    >
      <View className="h-11 w-11 items-center justify-center rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
        <Menu color={iconColor} size={24} />
      </View>
    </Pressable>
  );
}

export function HeaderRightAvatar() {
  const navigation = useNavigation();
  const { profile } = useCurrentUser();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      onPress={() => navigation.getParent()?.navigate("Settings")}
      hitSlop={10}
    >
      <Avatar uri={profile.avatar_url} size={44} label={profile.display_name} />
    </Pressable>
  );
}
