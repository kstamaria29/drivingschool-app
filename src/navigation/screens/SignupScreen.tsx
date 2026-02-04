import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { toUserFacingAuthError } from "../../features/auth/api";
import { useSignUpWithPasswordMutation } from "../../features/auth/queries";
import { signUpSchema, type SignUpFormValues } from "../../features/auth/schemas";

import type { AuthStackParamList } from "../AuthStackNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Signup">;

export function SignupScreen({ navigation }: Props) {
  const mutation = useSignUpWithPasswordMutation();
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState(false);

  const form = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", confirmPassword: "" },
  });

  async function onSubmit(values: SignUpFormValues) {
    setNeedsEmailConfirmation(false);
    const result = await mutation.mutateAsync({ email: values.email, password: values.password });
    if (result.kind === "needs-email-confirmation") {
      setNeedsEmailConfirmation(true);
    }
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Create account</AppText>
          <AppText className="mt-2" variant="body">
            This creates your owner login.
          </AppText>
        </View>

        <AppCard className="gap-4">
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
            name="password"
            render={({ field, fieldState }) => (
              <AppInput
                label="Password"
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
            name="confirmPassword"
            render={({ field, fieldState }) => (
              <AppInput
                label="Confirm password"
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

        {needsEmailConfirmation ? (
          <AppText variant="body">
            Check your email to confirm your account, then return here and sign in.
          </AppText>
        ) : null}

        {mutation.isError ? (
          <AppText variant="error">{toUserFacingAuthError(mutation.error)}</AppText>
        ) : null}

        <AppButton
          label={mutation.isPending ? "Creating..." : "Create account"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />

        <AppButton label="Back to sign in" variant="ghost" onPress={() => navigation.navigate("Login")} />
      </AppStack>
    </Screen>
  );
}
