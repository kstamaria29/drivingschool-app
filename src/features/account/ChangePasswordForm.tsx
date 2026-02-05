import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { useCurrentUser } from "../auth/current-user";
import { toErrorMessage } from "../../utils/errors";

import { useChangeMyPasswordMutation } from "./queries";
import { changePasswordSchema, type ChangePasswordFormValues } from "./schemas";

type Props = {
  variant?: "normal" | "forced";
  onSuccess?: () => void;
};

export function ChangePasswordForm({ variant = "normal", onSuccess }: Props) {
  const { userId, profile } = useCurrentUser();
  const mutation = useChangeMyPasswordMutation(userId);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { oldPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
    await mutation.mutateAsync({ oldPassword: values.oldPassword, newPassword: values.newPassword });
    form.reset();
    Alert.alert("Password updated", "Your password has been changed successfully.");
    onSuccess?.();
  }

  return (
    <AppStack gap="md">
      {variant === "forced" || profile.must_change_password ? (
        <AppCard className="gap-2">
          <AppText variant="heading">Action required</AppText>
          <AppText variant="body">
            This looks like your first sign-in with a temporary password. Please change your
            password to continue.
          </AppText>
        </AppCard>
      ) : null}

      <AppCard className="gap-4">
        <Controller
          control={form.control}
          name="oldPassword"
          render={({ field, fieldState }) => (
            <AppInput
              label="Current password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="password"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="newPassword"
          render={({ field, fieldState }) => (
            <AppInput
              label="New password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="confirmNewPassword"
          render={({ field, fieldState }) => (
            <AppInput
              label="Confirm new password"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              textContentType="newPassword"
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
      </AppCard>

      {mutation.isError ? (
        <View>
          <AppText variant="error">{toErrorMessage(mutation.error)}</AppText>
        </View>
      ) : null}

      <AppButton
        label={mutation.isPending ? "Updating password..." : "Change password"}
        disabled={mutation.isPending}
        onPress={form.handleSubmit(onSubmit)}
      />
    </AppStack>
  );
}

