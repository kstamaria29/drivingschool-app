import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, Alert, View } from "react-native";
import { useState } from "react";
import {
  Building2,
  IdCard,
  ImageUp,
  KeyRound,
  RefreshCw,
  UserCircle2,
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
import { useUploadMyAvatarMutation } from "../../features/profiles/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";
import { useAppColorScheme } from "../../providers/ColorSchemeProvider";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { useClearMyAvatarMutation } from "../../features/account/queries";
import { getProfileFullName } from "../../utils/profileName";
import type { SettingsStackParamList } from "../SettingsStackNavigator";

export function SettingsScreen() {
  const { userId, profile } = useCurrentUser();
  const canManageOrganization = isOwnerOrAdminRole(profile.role);
  const [pickerError, setPickerError] = useState<string | null>(null);
  const { scheme, setScheme } = useAppColorScheme();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const orgQuery = useOrganizationQuery(profile.organization_id);
  const orgSettingsQuery = useOrganizationSettingsQuery(profile.organization_id);

  const uploadOrgLogoMutation = useUploadOrganizationLogoMutation(profile.organization_id);
  const uploadAvatarMutation = useUploadMyAvatarMutation(userId);
  const clearAvatarMutation = useClearMyAvatarMutation(userId);

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

  async function pickAvatarFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permission to access photos was denied.");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  async function pickAvatarFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new Error("Permission to access the camera was denied.");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.85,
    });

    if (result.canceled) return null;
    return result.assets[0] ?? null;
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Settings</AppText>
          <AppText className="mt-2" variant="body">
            {canManageOrganization
              ? "Manage your organization and profile."
              : "Manage your profile."}
          </AppText>
        </View>

        {canManageOrganization ? (
          <AppCard className="gap-3">
            <AppText variant="heading">Organization</AppText>

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
              label="View members"
              variant="secondary"
              icon={Users}
              disabled={!canManageOrganization}
              onPress={() => navigation.navigate("ViewMembers")}
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

            {uploadOrgLogoMutation.isError ? (
              <AppText variant="error">{toErrorMessage(uploadOrgLogoMutation.error)}</AppText>
            ) : null}
            {pickerError ? <AppText variant="error">{pickerError}</AppText> : null}
          </AppCard>
        ) : null}

        <AppCard className="gap-3">
          <AppText variant="heading">Account Settings</AppText>

          <View className="flex-row items-center gap-4">
            <Avatar uri={profile.avatar_url} size={64} label={getProfileFullName(profile)} />
            <View className="flex-1">
              <AppText variant="body">{getProfileFullName(profile) || profile.display_name}</AppText>
              <AppText variant="caption">{getRoleDisplayLabel(profile)}</AppText>
            </View>
          </View>

          <AppButton
            label={uploadAvatarMutation.isPending ? "Uploading photo..." : "Change profile photo"}
            variant="secondary"
            icon={UserCircle2}
            disabled={uploadAvatarMutation.isPending || clearAvatarMutation.isPending}
            onPress={() => {
              const actions: Parameters<typeof Alert.alert>[2] = [
                {
                  text: "Take photo",
                  onPress: () => {
                    void (async () => {
                      try {
                        setPickerError(null);
                        const asset = await pickAvatarFromCamera();
                        if (!asset) return;
                        uploadAvatarMutation.mutate({ asset });
                      } catch (error) {
                        setPickerError(toErrorMessage(error));
                      }
                    })();
                  },
                },
                {
                  text: "Choose from library",
                  onPress: () => {
                    void (async () => {
                      try {
                        setPickerError(null);
                        const asset = await pickAvatarFromLibrary();
                        if (!asset) return;
                        uploadAvatarMutation.mutate({ asset });
                      } catch (error) {
                        setPickerError(toErrorMessage(error));
                      }
                    })();
                  },
                },
              ];

              if (profile.avatar_url) {
                actions.push({
                  text: "Remove photo",
                  style: "destructive",
                  onPress: () => {
                    Alert.alert(
                      "Remove photo",
                      "Remove your profile photo?",
                      [
                        { text: "Cancel", style: "cancel" },
                        {
                          text: "Remove",
                          style: "destructive",
                          onPress: () => clearAvatarMutation.mutate(),
                        },
                      ],
                      { cancelable: true },
                    );
                  },
                });
              }

              actions.push({ text: "Cancel", style: "cancel" });

              Alert.alert("Profile photo", "Choose an option", actions);
            }}
          />

          {uploadAvatarMutation.isError ? (
            <AppText variant="error">{toErrorMessage(uploadAvatarMutation.error)}</AppText>
          ) : null}
          {clearAvatarMutation.isError ? (
            <AppText variant="error">{toErrorMessage(clearAvatarMutation.error)}</AppText>
          ) : null}
          {pickerError ? <AppText variant="error">{pickerError}</AppText> : null}

          <AppButton
            label="Change name"
            variant="secondary"
            icon={UserRoundPen}
            onPress={() => navigation.navigate("EditName")}
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
        </AppCard>

        {canManageOrganization ? (
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
        ) : null}

        <AppCard className="gap-3">
          <AppText variant="heading">Appearance</AppText>
          <AppText variant="caption">Choose a theme.</AppText>

          <AppSegmentedControl
            value={scheme}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={setScheme}
          />
        </AppCard>
      </AppStack>
    </Screen>
  );
}
