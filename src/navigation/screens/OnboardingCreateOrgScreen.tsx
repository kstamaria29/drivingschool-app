import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppImage } from "../../components/AppImage";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useAuthSession } from "../../features/auth/session";
import { useCompleteOnboardingMutation } from "../../features/onboarding/queries";
import {
  onboardingCreateOrgSchema,
  type OnboardingCreateOrgFormValues,
} from "../../features/onboarding/schemas";
import { toErrorMessage } from "../../utils/errors";

import type { AuthStackParamList } from "../AuthStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type Props = NativeStackScreenProps<AuthStackParamList, "OnboardingCreateOrg">;

export function OnboardingCreateOrgScreen({ navigation }: Props) {
  const { isCompact } = useNavigationLayout();
  const { session } = useAuthSession();
  const userId = session?.user.id ?? "";

  const mutation = useCompleteOnboardingMutation(userId);
  const [logoAsset, setLogoAsset] = useState<ImagePicker.ImagePickerAsset | undefined>();

  const form = useForm<OnboardingCreateOrgFormValues>({
    resolver: zodResolver(onboardingCreateOrgSchema),
    defaultValues: { organizationName: "", displayName: "" },
  });

  async function onPickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission required", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
    });

    if (result.canceled) return;

    setLogoAsset(result.assets[0]);
  }

  async function onSubmit(values: OnboardingCreateOrgFormValues) {
    if (!session) return;
    await mutation.mutateAsync({
      organizationName: values.organizationName,
      displayName: values.displayName,
      logoAsset,
    });
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Create your driving school</AppText>
          <AppText className="mt-2" variant="body">
            This sets up your organization and owner profile.
          </AppText>
        </View>

        <AppCard className={isCompact ? "gap-3" : "gap-4"}>
          <Controller
            control={form.control}
            name="organizationName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Driving school name"
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
            name="displayName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Owner display name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />

          <AppStack gap="md">
            <AppText variant="label">Organization logo (optional)</AppText>
            {logoAsset ? (
              <AppImage
                source={{ uri: logoAsset.uri }}
                resizeMode="contain"
                className="h-24 w-24 bg-transparent"
              />
            ) : (
              <AppText variant="caption">No logo selected.</AppText>
            )}
            <AppButton label="Choose logo" variant="secondary" onPress={onPickLogo} />
          </AppStack>
        </AppCard>

        {mutation.isError ? <AppText variant="error">{toErrorMessage(mutation.error)}</AppText> : null}

        <AppButton
          label={mutation.isPending ? "Creating..." : "Create organization"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />
        <AppButton
          label="Back to sign in"
          variant="ghost"
          disabled={mutation.isPending}
          onPress={() => navigation.replace("Login")}
        />
      </AppStack>
    </Screen>
  );
}
