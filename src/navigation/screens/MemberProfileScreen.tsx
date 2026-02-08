import dayjs from "dayjs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { ChevronRight, Mail, MapPin, Phone, RefreshCw, Users } from "lucide-react-native";
import type { DrawerNavigationProp } from "@react-navigation/drawer";
import { useColorScheme } from "nativewind";

import { Avatar } from "../../components/Avatar";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { useOrganizationMemberDetailsQuery } from "../../features/profiles/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { MainDrawerParamList } from "../MainDrawerNavigator";
import type { SettingsStackParamList } from "../SettingsStackNavigator";

type Props = NativeStackScreenProps<SettingsStackParamList, "MemberProfile">;

function roleLabel(role: "owner" | "admin" | "instructor") {
  if (role === "owner") return "Owner";
  if (role === "admin") return "Admin";
  return "Instructor";
}

function lessonStatusLabel(status: "scheduled" | "completed" | "cancelled") {
  if (status === "scheduled") return "Scheduled";
  if (status === "completed") return "Completed";
  return "Cancelled";
}

function getStudentFullName(student: { first_name: string; last_name: string }) {
  return `${student.first_name} ${student.last_name}`.trim() || "Student";
}

function DetailRow({
  icon: Icon,
  label,
  value,
  iconColor,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
  iconColor: string;
}) {
  return (
    <View className="flex-row items-start gap-2">
      <Icon size={16} color={iconColor} />
      <View className="flex-1">
        <AppText variant="caption">{label}</AppText>
        <AppText variant="body">{value}</AppText>
      </View>
    </View>
  );
}

export function MemberProfileScreen({ navigation, route }: Props) {
  const { memberId } = route.params;
  const { profile: currentProfile } = useCurrentUser();
  const { colorScheme } = useColorScheme();
  const [activeStudentsExpanded, setActiveStudentsExpanded] = useState(true);
  const iconMuted = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;
  const canManageOrganization = isOwnerOrAdminRole(currentProfile.role);
  const drawerNavigation = navigation.getParent<DrawerNavigationProp<MainDrawerParamList>>();
  const detailsQuery = useOrganizationMemberDetailsQuery(memberId, canManageOrganization);

  if (!canManageOrganization) {
    return (
      <Screen scroll>
        <AppStack gap="lg">
          <View>
            <AppText variant="title">Member profile</AppText>
            <AppText className="mt-2" variant="body">
              Only owners and admins can view member profiles.
            </AppText>
          </View>
        </AppStack>
      </Screen>
    );
  }

  const memberProfile = detailsQuery.data?.profile ?? null;

  return (
    <Screen scroll>
      <AppStack gap="lg">
        {detailsQuery.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading member profile...
            </AppText>
          </View>
        ) : detailsQuery.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn&apos;t load member profile</AppText>
              <AppText variant="body">{toErrorMessage(detailsQuery.error)}</AppText>
            </AppCard>
            <AppButton
              width="auto"
              variant="secondary"
              icon={RefreshCw}
              label="Retry"
              onPress={() => detailsQuery.refetch()}
            />
          </AppStack>
        ) : !memberProfile ? (
          <AppCard className="gap-2">
            <AppText variant="heading">Member not found</AppText>
            <AppText variant="body">
              This member may have been deleted or you may no longer have access.
            </AppText>
          </AppCard>
        ) : (
          <>
            <AppCard className="gap-4">
              <View className="flex-row items-center gap-4">
                <Avatar uri={memberProfile.avatar_url} size={72} label={getProfileFullName(memberProfile)} />
                <View className="flex-1">
                  <AppText variant="title">
                    {getProfileFullName(memberProfile) || memberProfile.display_name || "Member"}
                  </AppText>
                  <AppText className="mt-1" variant="caption">
                    {roleLabel(memberProfile.role)}
                  </AppText>
                </View>
              </View>
            </AppCard>

            <AppCard className="gap-4">
              <AppText variant="heading">Contact</AppText>
              <DetailRow icon={Mail} label="Email" value={memberProfile.email ?? "-"} iconColor={iconMuted} />
              <DetailRow
                icon={Phone}
                label="Contact no."
                value={memberProfile.contact_no ?? "-"}
                iconColor={iconMuted}
              />
              <DetailRow icon={MapPin} label="Address" value={memberProfile.address ?? "-"} iconColor={iconMuted} />
            </AppCard>

            <AppCard className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-2">
                  <Users size={16} color={iconMuted} />
                  <AppText variant="heading">Active students</AppText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setActiveStudentsExpanded((expanded) => !expanded)}
                >
                  <AppText className="underline" variant="caption">
                    {activeStudentsExpanded ? "Hide" : "Show"}
                  </AppText>
                </Pressable>
              </View>
              {activeStudentsExpanded ? (
                detailsQuery.data?.activeStudents.length ? (
                  <AppStack gap="sm">
                    {detailsQuery.data.activeStudents.map((student) => (
                      <Pressable
                        key={student.id}
                        className="flex-row items-center justify-between rounded-xl border border-border bg-background px-3 py-3 dark:border-borderDark dark:bg-backgroundDark"
                        accessibilityRole="button"
                        disabled={!drawerNavigation}
                        onPress={() =>
                          drawerNavigation?.navigate("Students", {
                            screen: "StudentDetail",
                            params: { studentId: student.id },
                          })
                        }
                      >
                        <AppText variant="body">{getStudentFullName(student)}</AppText>
                        <ChevronRight size={16} color={iconMuted} />
                      </Pressable>
                    ))}
                  </AppStack>
                ) : (
                  <AppText variant="caption">No active students for this member.</AppText>
                )
              ) : null}
            </AppCard>

            <AppCard className="gap-3">
              <AppText variant="heading">Next 3 lessons</AppText>
              {detailsQuery.data?.nextLessons.length ? (
                <AppStack gap="sm">
                  {detailsQuery.data.nextLessons.map((lesson) => {
                    const studentName = lesson.students
                      ? `${lesson.students.first_name} ${lesson.students.last_name}`
                      : "Student";
                    const start = dayjs(lesson.start_time);
                    const end = dayjs(lesson.end_time);

                    return (
                      <View
                        key={lesson.id}
                        className="rounded-xl border border-border bg-background px-3 py-3 dark:border-borderDark dark:bg-backgroundDark"
                      >
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1">
                            <AppText variant="body">{studentName}</AppText>
                            <AppText className="mt-1" variant="caption">
                              {start.format("ddd DD MMM, h:mm A")} - {end.format("h:mm A")}
                            </AppText>
                            {lesson.location ? (
                              <AppText className="mt-1" variant="caption">
                                {lesson.location}
                              </AppText>
                            ) : null}
                          </View>
                          <AppText variant="caption">{lessonStatusLabel(lesson.status)}</AppText>
                        </View>
                      </View>
                    );
                  })}
                </AppStack>
              ) : (
                <AppText variant="caption">No upcoming lessons for this member.</AppText>
              )}
            </AppCard>
          </>
        )}
      </AppStack>
    </Screen>
  );
}
