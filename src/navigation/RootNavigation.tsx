import { NavigationContainer } from "@react-navigation/native";
import { useMemo } from "react";

import { useMyProfileQuery, useSignOutMutation } from "../features/auth/queries";
import { CurrentUserProvider } from "../features/auth/current-user";
import { useAuthSession } from "../features/auth/session";
import { useAppColorScheme } from "../providers/ColorSchemeProvider";
import { toErrorMessage } from "../utils/errors";

import { AuthStackNavigator } from "./AuthStackNavigator";
import { ForcedPasswordChangeStackNavigator } from "./ForcedPasswordChangeStackNavigator";
import { MainDrawerNavigator } from "./MainDrawerNavigator";
import { getNavigationTheme } from "./navigationTheme";
import { AuthBootstrapScreen } from "./screens/AuthBootstrapScreen";
import { AuthGateErrorScreen } from "./screens/AuthGateErrorScreen";
import { MissingSupabaseConfigScreen } from "./screens/MissingSupabaseConfigScreen";
import { isSupabaseConfigured } from "../supabase/env";

export function RootNavigation() {
  if (!isSupabaseConfigured) {
    return <MissingSupabaseConfigScreen />;
  }

  const { scheme, ready } = useAppColorScheme();
  const navigationTheme = useMemo(() => getNavigationTheme(scheme), [scheme]);
  const { session, isLoading } = useAuthSession();
  const profileQuery = useMyProfileQuery(session?.user.id);
  const signOutMutation = useSignOutMutation();

  if (!ready) {
    return <AuthBootstrapScreen label="Preparing app..." />;
  }

  if (isLoading) {
    return <AuthBootstrapScreen label="Checking session..." />;
  }

  if (!session) {
    return (
      <NavigationContainer theme={navigationTheme}>
        <AuthStackNavigator initialRouteName="Login" />
      </NavigationContainer>
    );
  }

  if (profileQuery.isPending) {
    return <AuthBootstrapScreen label="Loading your profile..." />;
  }

  if (profileQuery.isError) {
    return (
      <AuthGateErrorScreen
        title="Couldn't load your profile"
        message={toErrorMessage(profileQuery.error)}
        onRetry={() => profileQuery.refetch()}
        onSignOut={() => signOutMutation.mutate()}
        signingOut={signOutMutation.isPending}
      />
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      {profileQuery.data ? (
        <CurrentUserProvider userId={session.user.id} profile={profileQuery.data}>
          {profileQuery.data.must_change_password ? (
            <ForcedPasswordChangeStackNavigator />
          ) : (
            <MainDrawerNavigator />
          )}
        </CurrentUserProvider>
      ) : (
        <AuthStackNavigator initialRouteName="OnboardingCreateOrg" />
      )}
    </NavigationContainer>
  );
}
