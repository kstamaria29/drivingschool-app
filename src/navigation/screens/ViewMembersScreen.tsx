import { ActivityIndicator, View } from "react-native";

import { Avatar } from "../../components/Avatar";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

function sortByFullName<T extends { first_name?: string | null; last_name?: string | null; display_name?: string | null }>(
  members: T[],
) {
  return [...members].sort((a, b) =>
    getProfileFullName(a).localeCompare(getProfileFullName(b), undefined, { sensitivity: "base" }),
  );
}

function MemberRow({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl?: string | null;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 dark:border-borderDark dark:bg-backgroundDark">
      <Avatar uri={avatarUrl} size={44} label={name} />
      <AppText variant="body">{name}</AppText>
    </View>
  );
}

function MemberGroup({
  title,
  members,
}: {
  title: string;
  members: Array<{
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
  }>;
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
            return <MemberRow key={member.id} name={name} avatarUrl={member.avatar_url} />;
          })}
        </AppStack>
      )}
    </AppCard>
  );
}

export function ViewMembersScreen() {
  const { profile } = useCurrentUser();
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
          <View className={cn("items-center justify-center py-6", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading members...
            </AppText>
          </View>
        ) : profilesQuery.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn&apos;t load members</AppText>
              <AppText variant="body">{toErrorMessage(profilesQuery.error)}</AppText>
            </AppCard>
            <AppButton width="auto" variant="secondary" label="Retry" onPress={() => profilesQuery.refetch()} />
          </AppStack>
        ) : (
          <AppStack gap="md">
            <MemberGroup title="Owner" members={owners} />
            <MemberGroup title="Instructors" members={instructors} />
            <MemberGroup title="Admin" members={admins} />
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}

