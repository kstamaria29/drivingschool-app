import * as ImagePicker from "expo-image-picker";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { useState } from "react";
import { Alert, View } from "react-native";
import { UserCircle2, UserRoundPen } from "lucide-react-native";

import { Avatar } from "../../components/Avatar";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useClearMyAvatarMutation, useUpdateMyDetailsMutation } from "../../features/account/queries";
import { editDetailsSchema, type EditDetailsFormValues } from "../../features/account/schemas";
import { useCurrentUser } from "../../features/auth/current-user";
import { getRoleDisplayLabel } from "../../features/auth/roles";
import { useUploadMyAvatarMutation } from "../../features/profiles/queries";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { SettingsStackParamList } from "../SettingsStackNavigator";

function splitNameFallback(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export function EditDetailsScreen() {
  const { userId, profile } = useCurrentUser();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const saveDetailsMutation = useUpdateMyDetailsMutation(userId);
  const uploadAvatarMutation = useUploadMyAvatarMutation(userId);
  const clearAvatarMutation = useClearMyAvatarMutation(userId);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const fallback = splitNameFallback(profile.display_name);

  const form = useForm<EditDetailsFormValues>({
    resolver: zodResolver(editDetailsSchema),
    defaultValues: {
      firstName: profile.first_name ?? fallback.firstName,
      lastName: profile.last_name ?? fallback.lastName,
      email: profile.email ?? "",
      contactNo: profile.contact_no ?? "",
      address: profile.address ?? "",
    },
  });

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

  async function onSubmit(values: EditDetailsFormValues) {
    const previousEmail = (profile.email ?? "").trim().toLowerCase();
    const nextEmail = values.email.trim().toLowerCase();
    const emailChanged = previousEmail.length > 0 && previousEmail !== nextEmail;

    await saveDetailsMutation.mutateAsync({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      contactNo: values.contactNo,
      address: values.address,
    });

    Alert.alert(
      "Details updated",
      emailChanged
        ? "Your details were saved. If you changed your login email, confirm the update from your inbox."
        : "Your details were saved.",
    );
    navigation.goBack();
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Edit details</AppText>
          <AppText className="mt-2" variant="body">
            Update your profile details shown across the app.
          </AppText>
        </View>

        <AppCard className="gap-1">
          <AppText variant="caption">Current profile</AppText>
          <AppText variant="body">{getProfileFullName(profile) || profile.display_name}</AppText>
          <AppText variant="caption">{getRoleDisplayLabel(profile)}</AppText>
        </AppCard>

        <AppCard className="gap-4">
          <View className="flex-row items-center gap-4">
            <Avatar uri={profile.avatar_url} size={64} label={getProfileFullName(profile)} />
            <View className="flex-1 gap-2">
              <AppText variant="label">Avatar</AppText>
              <AppButton
                width="auto"
                variant="secondary"
                label={uploadAvatarMutation.isPending ? "Uploading avatar..." : "Change avatar"}
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
                      text: "Remove avatar",
                      style: "destructive",
                      onPress: () => {
                        Alert.alert(
                          "Remove avatar",
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
                  Alert.alert("Avatar", "Choose an option", actions);
                }}
              />
            </View>
          </View>

          {uploadAvatarMutation.isError ? (
            <AppText variant="error">{toErrorMessage(uploadAvatarMutation.error)}</AppText>
          ) : null}
          {clearAvatarMutation.isError ? (
            <AppText variant="error">{toErrorMessage(clearAvatarMutation.error)}</AppText>
          ) : null}
          {pickerError ? <AppText variant="error">{pickerError}</AppText> : null}
        </AppCard>

        <AppCard className="gap-4">
          <Controller
            control={form.control}
            name="firstName"
            render={({ field, fieldState }) => (
              <AppInput
                label="First name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="lastName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Last name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="email"
            render={({ field, fieldState }) => (
              <AppInput
                label="Email"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="contactNo"
            render={({ field, fieldState }) => (
              <AppInput
                label="Contact no. (optional)"
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <Controller
            control={form.control}
            name="address"
            render={({ field, fieldState }) => (
              <AppInput
                label="Address (optional)"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </AppCard>

        {saveDetailsMutation.isError ? (
          <AppText variant="error">{toErrorMessage(saveDetailsMutation.error)}</AppText>
        ) : null}

        <AppButton
          label={saveDetailsMutation.isPending ? "Saving..." : "Save details"}
          icon={UserRoundPen}
          disabled={saveDetailsMutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />
      </AppStack>
    </Screen>
  );
}
