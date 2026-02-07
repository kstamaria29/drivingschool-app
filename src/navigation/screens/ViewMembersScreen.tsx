import { Pressable, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useColorScheme } from "nativewind";

import { CenteredLoadingState, ErrorStateCard } from "../../components/AsyncState";
import { Avatar } from "../../components/Avatar";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import { theme } from "../../theme/theme";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";
import type { SettingsStackParamList } from "../SettingsStackNavigator";

function sortByFullName<T extends { first_name?: string | null; last_name?: string | null; display_name?: string | null }>(
  members: T[],
) {
  return [...members].sort((a, b) =>
    getProfileFullName(a).localeCompare(getProfileFullName(b), undefined, { sensitivity: "base" }),
  );
}

function MemberRow({
  id,
  name,
  avatarUrl,
  onPress,
  iconColor,
}: {
  id: string;
  name: string;
  avatarUrl?: string | null;
  onPress: (memberId: string) => void;
  iconColor: string;
}) {
  return (
    <Pressable
      onPress={() => onPress(id)}
      className="flex-row items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 dark:border-borderDark dark:bg-backgroundDark"
    >
      <Avatar uri={avatarUrl} size={44} label={name} />
      <AppText className="flex-1" variant="body">
        {name}
      </AppText>
      <ChevronRight size={16} color={iconColor} />
    </Pressable>
  );
}

function MemberGroup({
  title,
  members,
  onPressMember,
  iconColor,
}: {
  title: string;
  members: Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  }>;
  onPressMember: (memberId: string) => void;
  iconColor: string;
}) {
  return (
    <AppCard className="gap-3">
      <AppText variant="heading">{title}</AppText>
      {members.length === 0 ? (
        <AppText variant="caption">No members in this group.</AppText>
      ) : (
        <AppStack gap="sm">
          {members.map((member) => {
            const name = getProfileFullName(member) || member.display_name || "Member";
            return (
              <MemberRow
                key={member.id}
                id={member.id}
                name={name}
                avatarUrl={member.avatar_url}
                onPress={onPressMember}
                iconColor={iconColor}
              />
            );
          })}
        </AppStack>
      )}
    </AppCard>
  );
}

export function ViewMembersScreen() {
  const { profile } = useCurrentUser();
  const { colorScheme } = useColorScheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const iconColor = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;
  const canManageOrganization = isOwnerOrAdminRole(profile.role);
  const profilesQuery = useOrganizationProfilesQuery(canManageOrganization);

  if (!canManageOrganization) {
    return (
      <Screen scroll>
        <AppStack gap="lg">
          <View>
            <AppText variant="title">View members</AppText>
            <AppText className="mt-2" variant="body">
              Only owners and admins can view organization members.
            </AppText>
          </View>
        </AppStack>
      </Screen>
    );
  }

  const members = profilesQuery.data ?? [];
  const owners = sortByFullName(members.filter((member) => member.role === "owner"));
  const instructors = sortByFullName(members.filter((member) => member.role === "instructor"));
  const admins = sortByFullName(members.filter((member) => member.role === "admin"));

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Members</AppText>
          <AppText className="mt-2" variant="body">
            Accounts in your organization.
          </AppText>
        </View>

        {profilesQuery.isPending ? (
          <CenteredLoadingState label="Loading members..." className="py-6" />
        ) : profilesQuery.isError ? (
          <ErrorStateCard
            title="Couldn't load members"
            message={toErrorMessage(profilesQuery.error)}
            onRetry={() => profilesQuery.refetch()}
          />
        ) : (
          <AppStack gap="md">
            <MemberGroup
              title="Owner"
              members={owners}
              onPressMember={(memberId) => navigation.navigate("MemberProfile", { memberId })}
              iconColor={iconColor}
            />
            <MemberGroup
              title="Instructors"
              members={instructors}
              onPressMember={(memberId) => navigation.navigate("MemberProfile", { memberId })}
              iconColor={iconColor}
            />
            <MemberGroup
              title="Admin"
              members={admins}
              onPressMember={(memberId) => navigation.navigate("MemberProfile", { memberId })}
              iconColor={iconColor}
            />
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}
