import { NavigationContainer } from "@react-navigation/native";

import { useMyProfileQuery, useSignOutMutation } from "../features/auth/queries";
import { CurrentUserProvider } from "../features/auth/current-user";
import { useAuthSession } from "../features/auth/session";
import { toErrorMessage } from "../utils/errors";

import { AuthStackNavigator } from "./AuthStackNavigator";
import { MainDrawerNavigator } from "./MainDrawerNavigator";
import { AuthBootstrapScreen } from "./screens/AuthBootstrapScreen";
import { AuthGateErrorScreen } from "./screens/AuthGateErrorScreen";

export function RootNavigation() {
  const { session, isLoading } = useAuthSession();
  const profileQuery = useMyProfileQuery(session?.user.id);
  const signOutMutation = useSignOutMutation();

  if (isLoading) {
    return <AuthBootstrapScreen label="Checking session..." />;
  }

  if (!session) {
    return (
      <NavigationContainer>
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
    <NavigationContainer>
      {profileQuery.data ? (
        <CurrentUserProvider userId={session.user.id} profile={profileQuery.data}>
          <MainDrawerNavigator />
        </CurrentUserProvider>
      ) : (
        <AuthStackNavigator initialRouteName="OnboardingCreateOrg" />
      )}
    </NavigationContainer>
  );
}
