import { Pressable, View } from "react-native";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { Menu } from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { theme } from "../../theme/theme";
import { useCurrentUser } from "../../features/auth/current-user";
import { useNavigationLayout } from "../useNavigationLayout";

export function HeaderLeftHamburger() {
  const navigation = useNavigation();
  const { isSidebar } = useNavigationLayout();

  if (isSidebar) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open menu"
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      hitSlop={10}
    >
      <View className="h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
        <Menu color={theme.colors.placeholder} size={20} />
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
      <Avatar uri={profile.avatar_url} size={32} label={profile.display_name} />
    </Pressable>
  );
}

