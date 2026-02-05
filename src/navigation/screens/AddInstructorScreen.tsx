import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Alert, View } from "react-native";
import { KeyRound, UserPlus } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { useCreateInstructorMutation } from "../../features/instructors/queries";
import { addInstructorSchema, type AddInstructorFormValues } from "../../features/instructors/schemas";
import { theme } from "../../theme/theme";
import { toErrorMessage } from "../../utils/errors";

function CredentialRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-start justify-between gap-4">
      <AppText className="flex-1" variant="caption">
        {label}
      </AppText>
      <AppText className="flex-1 text-right" variant="body">
        {value}
      </AppText>
    </View>
  );
}

export function AddInstructorScreen() {
  const { profile } = useCurrentUser();
  const mutation = useCreateInstructorMutation();
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const form = useForm<AddInstructorFormValues>({
    resolver: zodResolver(addInstructorSchema),
    defaultValues: { firstName: "", lastName: "", email: "" },
  });

  async function onSubmit(values: AddInstructorFormValues) {
    if (profile.role !== "owner") return;

    const created = await mutation.mutateAsync(values);
    Alert.alert(
      "Instructor created",
      "Share these credentials securely. The instructor will be required to change the password on first sign-in.",
    );

    form.reset();
    return created;
  }

  const latest = mutation.data ?? null;

  if (profile.role !== "owner") {
    return (
      <Screen scroll>
        <AppStack gap="lg">
          <View>
            <AppText variant="title">Add instructor</AppText>
            <AppText className="mt-2" variant="body">
              Only owners can add instructors.
            </AppText>
          </View>
        </AppStack>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Add instructor</AppText>
          <AppText className="mt-2" variant="body">
            Create a login for a new instructor. A temporary password will be generated.
          </AppText>
        </View>

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
                label="Email (login)"
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
        </AppCard>

        {mutation.isError ? (
          <AppText variant="error">{toErrorMessage(mutation.error)}</AppText>
        ) : null}

        <AppButton
          label={mutation.isPending ? "Creating instructor..." : "Generate login + password"}
          icon={UserPlus}
          disabled={mutation.isPending}
          onPress={() => void form.handleSubmit(onSubmit)()}
        />

        {latest ? (
          <AppCard className="gap-3">
            <View className="flex-row items-center justify-between">
              <AppText variant="heading">Credentials</AppText>
              <KeyRound size={18} color={iconColor} />
            </View>

            <CredentialRow label="Login" value={latest.email} />
            <CredentialRow label="Temporary password" value={latest.temporaryPassword} />
          </AppCard>
        ) : null}
      </AppStack>
    </Screen>
  );
}
