import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Pressable, View, type ScrollView } from "react-native";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Check,
  ChevronDown,
  IdCard,
  ImageUp,
  KeyRound,
  Palette,
  RefreshCw,
  UserPlus,
  UserRoundPen,
  Users,
} from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { Avatar } from "../../components/Avatar";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppImage } from "../../components/AppImage";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { getRoleDisplayLabel, isOwnerOrAdminRole } from "../../features/auth/roles";
import { useUploadOrganizationLogoMutation } from "../../features/organization/queries";
import {
  useOrganizationQuery,
  useOrganizationSettingsQuery,
} from "../../features/organization/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";
import { useAppColorScheme } from "../../providers/ColorSchemeProvider";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { getProfileFullName } from "../../utils/profileName";
import {
  DARK_THEME_OPTIONS,
  LIGHT_THEME_OPTIONS,
  type DarkThemeKey,
  type LightThemeKey,
} from "../../theme/palettes";
import type { SettingsStackParamList } from "../SettingsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type ThemeOption = {
  value: LightThemeKey | DarkThemeKey;
  label: string;
  description: string;
};

const lightThemeOptions: ThemeOption[] = LIGHT_THEME_OPTIONS;
const darkThemeOptions: ThemeOption[] = DARK_THEME_OPTIONS;

export function SettingsScreen() {
  const { isSidebar, isCompact } = useNavigationLayout();
  const { profile } = useCurrentUser();
  const canManageOrganization = isOwnerOrAdminRole(profile.role);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [organizationExpanded, setOrganizationExpanded] = useState(false);
  const [accountExpanded, setAccountExpanded] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const settingsScrollRef = useRef<ScrollView>(null);
  const { scheme, setScheme, themeKey, setThemeKey } = useAppColorScheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const iconMuted = scheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const orgQuery = useOrganizationQuery(profile.organization_id);
  const orgSettingsQuery = useOrganizationSettingsQuery(profile.organization_id);

  const uploadOrgLogoMutation = useUploadOrganizationLogoMutation(profile.organization_id);

  async function pickOrgLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permission to access photos was denied.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: false,
    });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  const activeThemeOptions = scheme === "dark" ? darkThemeOptions : lightThemeOptions;
  const selectedThemeOption =
    activeThemeOptions.find((option) => option.value === themeKey) ?? activeThemeOptions[0];

  useEffect(() => {
    setThemeMenuOpen(false);
  }, [scheme]);

  useEffect(() => {
    if (!themeMenuOpen || isSidebar) return;
    const timeoutId = setTimeout(() => {
      settingsScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [isSidebar, themeMenuOpen]);

  const organizationCard = canManageOrganization ? (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">Organization</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            organizationExpanded ? "Hide organization settings" : "Show organization settings"
          }
          onPress={() => setOrganizationExpanded((expanded) => !expanded)}
        >
          <AppText
            className={
              organizationExpanded
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            }
            variant="caption"
          >
            {organizationExpanded ? "Hide" : "Show"}
          </AppText>
        </Pressable>
      </View>

      {organizationExpanded ? (
        <>
          {orgQuery.isPending || orgSettingsQuery.isPending ? (
            <View className={cn("items-center justify-center py-6", theme.text.base)}>
              <ActivityIndicator />
              <AppText className="mt-3 text-center" variant="body">
                Loading organization...
              </AppText>
            </View>
          ) : orgQuery.isError || orgSettingsQuery.isError ? (
            <AppStack gap="md">
              <AppText variant="body">
                {toErrorMessage(orgQuery.error ?? orgSettingsQuery.error)}
              </AppText>
              <AppButton
                label="Retry"
                variant="secondary"
                icon={RefreshCw}
                onPress={() => {
                  void orgQuery.refetch();
                  void orgSettingsQuery.refetch();
                }}
              />
            </AppStack>
          ) : (
            <View className="flex-row items-center gap-4">
              {orgSettingsQuery.data?.logo_url ? (
                <AppImage
                  source={{ uri: orgSettingsQuery.data.logo_url }}
                  resizeMode="contain"
                  className="h-16 w-16 bg-transparent"
                />
              ) : (
                <View className="h-16 w-16 border border-border bg-card dark:border-borderDark dark:bg-cardDark" />
              )}
              <View className="flex-1">
                <AppText variant="body">{orgQuery.data?.name ?? "Organization"}</AppText>
                <AppText variant="caption">
                  Owners and admins can update the organization logo.
                </AppText>
              </View>
            </View>
          )}

          <AppButton
            label="Change organization name"
            variant="secondary"
            icon={Building2}
            disabled={!canManageOrganization}
            onPress={() => navigation.navigate("EditOrganizationName")}
          />

          <AppButton
            label={
              uploadOrgLogoMutation.isPending ? "Uploading logo..." : "Change organization logo"
            }
            variant="secondary"
            icon={ImageUp}
            disabled={!canManageOrganization || uploadOrgLogoMutation.isPending}
            onPress={async () => {
              try {
                setPickerError(null);
                const asset = await pickOrgLogo();
                if (!asset) return;
                uploadOrgLogoMutation.mutate({ asset });
              } catch (error) {
                setPickerError(toErrorMessage(error));
              }
            }}
          />

          <AppButton
            label="View members"
            variant="secondary"
            icon={Users}
            disabled={!canManageOrganization}
            onPress={() => navigation.navigate("ViewMembers")}
          />

          {uploadOrgLogoMutation.isError ? (
            <AppText variant="error">{toErrorMessage(uploadOrgLogoMutation.error)}</AppText>
          ) : null}
          {pickerError ? <AppText variant="error">{pickerError}</AppText> : null}
        </>
      ) : null}
    </AppCard>
  ) : null;

  const accountCard = (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">Account Settings</AppText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            accountExpanded ? "Hide account settings" : "Show account settings"
          }
          onPress={() => setAccountExpanded((expanded) => !expanded)}
        >
          <AppText
            className={
              accountExpanded
                ? "text-red-600 dark:text-red-400"
                : "text-blue-600 dark:text-blue-400"
            }
            variant="caption"
          >
            {accountExpanded ? "Hide" : "Show"}
          </AppText>
        </Pressable>
      </View>

      {accountExpanded ? (
        <>
          <View className="flex-row items-center gap-4">
            <Avatar uri={profile.avatar_url} size={64} label={getProfileFullName(profile)} />
            <View className="flex-1">
              <AppText variant="body">
                {getProfileFullName(profile) || profile.display_name}
              </AppText>
              <AppText variant="caption">{getRoleDisplayLabel(profile)}</AppText>
            </View>
          </View>

          <AppButton
            label="Edit details"
            variant="secondary"
            icon={UserRoundPen}
            onPress={() => navigation.navigate("EditDetails")}
          />

          <AppButton
            label="Change password"
            variant="secondary"
            icon={KeyRound}
            onPress={() => navigation.navigate("ChangePassword")}
          />

          {canManageOrganization ? (
            <AppButton
              label="Change role display"
              variant="secondary"
              icon={IdCard}
              onPress={() => navigation.navigate("EditRoleDisplay")}
            />
          ) : null}
        </>
      ) : null}
    </AppCard>
  );

  const instructorsCard = canManageOrganization ? (
    <AppCard className="gap-3">
      <AppText variant="heading">Instructors</AppText>
      <AppText variant="caption">
        Create logins for instructors. They will be required to change their password on first
        sign-in.
      </AppText>
      <AppButton
        label="Add instructor"
        variant="secondary"
        icon={UserPlus}
        onPress={() => navigation.navigate("AddInstructor")}
      />
    </AppCard>
  ) : null;

  const themesCard = (
    <AppCard className="gap-3">
      <AppText variant="heading">Themes</AppText>
      <AppText variant="caption">Switch mode and pick a dedicated style for that mode.</AppText>

      <AppSegmentedControl
        value={scheme}
        options={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        onChange={setScheme}
      />

      <View className="gap-2">
        <AppText variant="label">Theme style</AppText>
        <Pressable
          accessibilityRole="button"
          className="rounded-xl border border-border bg-card px-3 py-3 dark:border-borderDark dark:bg-cardDark"
          onPress={() => setThemeMenuOpen((open) => !open)}
        >
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1 flex-row items-center gap-2">
              <Palette size={18} color={iconMuted} />
              <View className="flex-1">
                <AppText variant="body">{selectedThemeOption.label}</AppText>
                <AppText variant="caption">{selectedThemeOption.description}</AppText>
              </View>
            </View>
            <ChevronDown size={18} color={iconMuted} />
          </View>
        </Pressable>

        {themeMenuOpen ? (
          <View className="overflow-hidden rounded-xl border border-border bg-card dark:border-borderDark dark:bg-cardDark">
            {activeThemeOptions.map((option, index) => {
              const selected = option.value === themeKey;
              return (
                <Pressable
                  key={option.value}
                  className={cn(
                    "px-3 py-3",
                    index < activeThemeOptions.length - 1 &&
                      "border-b border-border dark:border-borderDark",
                    selected && "bg-primary/10 dark:bg-primaryDark/20",
                  )}
                  onPress={() => {
                    setThemeKey(option.value);
                    setThemeMenuOpen(false);
                  }}
                >
                  <View className="flex-row items-start justify-between gap-2">
                    <View className="flex-1">
                      <AppText variant="body">{option.label}</AppText>
                      <AppText variant="caption">{option.description}</AppText>
                    </View>
                    {selected ? <Check size={16} color={iconMuted} /> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </AppCard>
  );

  return (
    <Screen scroll scrollRef={settingsScrollRef}>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Settings</AppText>
          <AppText className="mt-2" variant="body">
            {canManageOrganization
              ? "Manage your organization and profile."
              : "Manage your profile."}
          </AppText>
        </View>

        {isSidebar ? (
          <View className="flex-row flex-wrap gap-6">
            <AppStack gap="lg" className="flex-1 min-w-[360px]">
              {organizationCard}
              {accountCard}
              {instructorsCard}
            </AppStack>
            <AppStack gap="lg" className="flex-1 min-w-[360px]">
              {themesCard}
            </AppStack>
          </View>
        ) : (
          <>
            {organizationCard}
            {accountCard}
            {instructorsCard}
            {themesCard}
          </>
        )}
      </AppStack>
    </Screen>
  );
}
