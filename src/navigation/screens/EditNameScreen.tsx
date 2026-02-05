import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { useUpdateMyNameMutation } from "../../features/account/queries";
import { editNameSchema, type EditNameFormValues } from "../../features/account/schemas";
import { getProfileFullName } from "../../utils/profileName";
import { toErrorMessage } from "../../utils/errors";

import type { SettingsStackParamList } from "../SettingsStackNavigator";

function splitNameFallback(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join(" ");
  return { firstName, lastName };
}

export function EditNameScreen() {
  const { userId, profile } = useCurrentUser();
  const mutation = useUpdateMyNameMutation(userId);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const fallback = splitNameFallback(profile.display_name);

  const form = useForm<EditNameFormValues>({
    resolver: zodResolver(editNameSchema),
    defaultValues: {
      firstName: profile.first_name ?? fallback.firstName,
      lastName: profile.last_name ?? fallback.lastName,
    },
  });

  async function onSubmit(values: EditNameFormValues) {
    await mutation.mutateAsync(values);
    Alert.alert("Name updated", "Your name has been updated.");
    navigation.goBack();
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Change name</AppText>
          <AppText className="mt-2" variant="body">
            Your name appears in lessons and assessments.
          </AppText>
        </View>

        <AppCard className="gap-1">
          <AppText variant="caption">Current</AppText>
          <AppText variant="body">{getProfileFullName(profile) || "—"}</AppText>
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
        </AppCard>

        {mutation.isError ? (
          <AppText variant="error">{toErrorMessage(mutation.error)}</AppText>
        ) : null}

        <AppButton
          label={mutation.isPending ? "Saving..." : "Save name"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />
      </AppStack>
    </Screen>
  );
}
