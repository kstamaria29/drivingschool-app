import * as ImagePicker from "expo-image-picker";
import { ActivityIndicator, View } from "react-native";
import { useState } from "react";
import { ImageUp, RefreshCw, UserCircle2 } from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppImage } from "../../components/AppImage";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
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

export function SettingsScreen() {
  const { userId, profile } = useCurrentUser();
  const [pickerError, setPickerError] = useState<string | null>(null);
  const { scheme, setScheme } = useAppColorScheme();

  const orgQuery = useOrganizationQuery(profile.organization_id);
  const orgSettingsQuery = useOrganizationSettingsQuery(profile.organization_id);

  const uploadOrgLogoMutation = useUploadOrganizationLogoMutation(profile.organization_id);
  const uploadAvatarMutation = useUploadMyAvatarMutation(userId);

  async function pickImageSquare() {
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

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Settings</AppText>
          <AppText className="mt-2" variant="body">
            Manage your organization and profile.
          </AppText>
        </View>

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
                  {profile.role === "owner"
                    ? "Owners can update the organization logo."
                    : "Only owners can update the organization logo."}
                </AppText>
              </View>
            </View>
          )}

          <AppButton
            label={
              uploadOrgLogoMutation.isPending ? "Uploading logo..." : "Change organization logo"
            }
            variant="secondary"
            icon={ImageUp}
            disabled={profile.role !== "owner" || uploadOrgLogoMutation.isPending}
            onPress={async () => {
              try {
                setPickerError(null);
                const asset = await pickImageSquare();
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

        <AppCard className="gap-3">
          <AppText variant="heading">Profile</AppText>

          <View className="flex-row items-center gap-4">
            <Avatar uri={profile.avatar_url} size={64} label={profile.display_name} />
            <View className="flex-1">
              <AppText variant="body">{profile.display_name}</AppText>
              <AppText variant="caption">{profile.role}</AppText>
            </View>
          </View>

          <AppButton
            label={uploadAvatarMutation.isPending ? "Uploading photo..." : "Change profile photo"}
            variant="secondary"
            icon={UserCircle2}
            disabled={uploadAvatarMutation.isPending}
            onPress={async () => {
              try {
                setPickerError(null);
                const asset = await pickImageSquare();
                if (!asset) return;
                uploadAvatarMutation.mutate({ asset });
              } catch (error) {
                setPickerError(toErrorMessage(error));
              }
            }}
          />

          {uploadAvatarMutation.isError ? (
            <AppText variant="error">{toErrorMessage(uploadAvatarMutation.error)}</AppText>
          ) : null}
          {pickerError ? <AppText variant="error">{pickerError}</AppText> : null}
        </AppCard>

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
