import { zodResolver } from "@hookform/resolvers/zod";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Controller, useForm } from "react-hook-form";
import { View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { toUserFacingAuthError } from "../../features/auth/api";
import { useSignInWithPasswordMutation } from "../../features/auth/queries";
import { signInSchema, type SignInFormValues } from "../../features/auth/schemas";

import type { AuthStackParamList } from "../AuthStackNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const mutation = useSignInWithPasswordMutation();

  const form = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: SignInFormValues) {
    await mutation.mutateAsync(values);
  }

  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Sign in</AppText>
          <AppText className="mt-2" variant="body">
            Welcome back.
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
                textContentType="password"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </AppCard>

        {mutation.isError ? (
          <AppText variant="error">{toUserFacingAuthError(mutation.error)}</AppText>
        ) : null}

        <AppButton
          label={mutation.isPending ? "Signing in..." : "Sign in"}
          disabled={mutation.isPending}
          onPress={form.handleSubmit(onSubmit)}
        />

        <AppButton
          label="Create an account"
          variant="secondary"
          onPress={() => navigation.navigate("Signup")}
        />
      </AppStack>
    </Screen>
  );
}
