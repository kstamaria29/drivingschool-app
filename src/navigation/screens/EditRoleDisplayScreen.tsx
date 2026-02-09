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
import { useUpdateMyRoleDisplayMutation } from "../../features/account/queries";
import { roleDisplaySchema, type RoleDisplayFormValues } from "../../features/account/schemas";
import { getRoleDisplayLabel, isOwnerOrAdminRole, toRoleLabel } from "../../features/auth/roles";
import { toErrorMessage } from "../../utils/errors";

import type { SettingsStackParamList } from "../SettingsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

export function EditRoleDisplayScreen() {
  const { isCompact } = useNavigationLayout();
  const { userId, profile } = useCurrentUser();
  const canEditRoleDisplay = isOwnerOrAdminRole(profile.role);
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();
  const mutation = useUpdateMyRoleDisplayMutation(userId);

  const form = useForm<RoleDisplayFormValues>({
    resolver: zodResolver(roleDisplaySchema),
    defaultValues: {
      roleDisplayName: profile.role_display_name ?? "",
    },
  });

  async function onSubmit(values: RoleDisplayFormValues) {
    await mutation.mutateAsync({ roleDisplayName: values.roleDisplayName });
    Alert.alert("Role display updated", "Your role display text has been updated.");
    navigation.goBack();
  }

  async function onUseDefaultRole() {
    await mutation.mutateAsync({ roleDisplayName: "" });
    Alert.alert("Role display reset", `Your role is now shown as ${toRoleLabel(profile.role)}.`);
    navigation.goBack();
  }

  if (!canEditRoleDisplay) {
    return (
      <Screen scroll>
        <AppStack gap={isCompact ? "md" : "lg"}>
          <View>
            <AppText variant="title">Change role display</AppText>
            <AppText className="mt-2" variant="body">
              Only owners and admins can change role display text.
            </AppText>
          </View>
        </AppStack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Change role display</AppText>
          <AppText className="mt-2" variant="body">
            Set how your role appears in the app.
          </AppText>
        </View>

        <AppCard className="gap-2">
          <AppText variant="caption">Current</AppText>
          <AppText variant="body">{getRoleDisplayLabel(profile)}</AppText>
        </AppCard>

        <AppCard className={isCompact ? "gap-3" : "gap-4"}>
          <Controller
            control={form.control}
            name="roleDisplayName"
            render={({ field, fieldState }) => (
              <AppInput
                label="Role display name"
                autoCapitalize="words"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
                placeholder="e.g. Developer"
              />
            )}
          />
        </AppCard>

        {mutation.isError ? <AppText variant="error">{toErrorMessage(mutation.error)}</AppText> : null}

        <AppButton
          label={mutation.isPending ? "Saving..." : "Save role display"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />
        <AppButton
          label={mutation.isPending ? "Updating..." : `Use default (${toRoleLabel(profile.role)})`}
          variant="secondary"
          disabled={mutation.isPending}
          onPress={() => {
            void onUseDefaultRole();
          }}
        />
      </AppStack>
    </Screen>
  );
}
