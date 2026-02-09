import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

import { useNavigationLayout } from "../useNavigationLayout";

export function MissingSupabaseConfigScreen() {
  const { isCompact } = useNavigationLayout();

  return (
    <Screen>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <AppText variant="title">App misconfigured</AppText>

        <AppCard className="gap-3">
          <AppText variant="body">
            This build is missing Supabase environment variables.
          </AppText>
          <AppText variant="body">
            Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` at build time
            (EAS Environment Variables / Secrets), then rebuild the APK.
          </AppText>
        </AppCard>

        <AppCard className="gap-2">
          <AppText variant="caption">Expected variables</AppText>
          <AppText variant="body">- EXPO_PUBLIC_SUPABASE_URL</AppText>
          <AppText variant="body">- EXPO_PUBLIC_SUPABASE_ANON_KEY</AppText>
        </AppCard>
      </AppStack>
    </Screen>
  );
}
