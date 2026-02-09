import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { ActivityIndicator, Alert, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { isOwnerOrAdminRole } from "../../features/auth/roles";
import { useOrganizationQuery, useUpdateOrganizationNameMutation } from "../../features/organization/queries";
import {
  organizationNameSchema,
  type OrganizationNameFormValues,
} from "../../features/organization/schemas";
import { toErrorMessage } from "../../utils/errors";

import type { SettingsStackParamList } from "../SettingsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

export function EditOrganizationNameScreen() {
  const { isCompact } = useNavigationLayout();
  const { profile } = useCurrentUser();
  const canManageOrganization = isOwnerOrAdminRole(profile.role);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const orgQuery = useOrganizationQuery(profile.organization_id);
  const mutation = useUpdateOrganizationNameMutation(profile.organization_id);

  const form = useForm<OrganizationNameFormValues>({
    resolver: zodResolver(organizationNameSchema),
    defaultValues: {
      organizationName: orgQuery.data?.name ?? "",
    },
  });

  useEffect(() => {
    if (!orgQuery.data?.name) return;
    form.reset({ organizationName: orgQuery.data.name });
  }, [form, orgQuery.data?.name]);

  async function onSubmit(values: OrganizationNameFormValues) {
    await mutation.mutateAsync(values.organizationName);
    Alert.alert("Organization updated", "Organization name has been updated.");
    navigation.goBack();
  }

  if (!canManageOrganization) {
    return (
      <Screen scroll>
        <AppStack gap={isCompact ? "md" : "lg"}>
          <View>
            <AppText variant="title">Change organization name</AppText>
            <AppText className="mt-2" variant="body">
              Only owners and admins can update the organization name.
            </AppText>
          </View>
        </AppStack>
      </Screen>
    );
  }

  if (orgQuery.isPending) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
          <AppText className="mt-3 text-center" variant="body">
            Loading organization...
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Change organization name</AppText>
          <AppText className="mt-2" variant="body">
            This name appears across the app for your team.
          </AppText>
        </View>

        <AppCard className={isCompact ? "gap-3" : "gap-4"}>
          <Controller
            control={form.control}
            name="organizationName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Organization name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </AppCard>

        {orgQuery.isError ? <AppText variant="error">{toErrorMessage(orgQuery.error)}</AppText> : null}
        {mutation.isError ? <AppText variant="error">{toErrorMessage(mutation.error)}</AppText> : null}

        <AppButton
          label={mutation.isPending ? "Saving..." : "Save organization name"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />
      </AppStack>
    </Screen>
  );
}
