import { View } from "react-native";

import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

export function AssessmentsComingSoonScreen() {
  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Assessments</AppText>
          <AppText className="mt-2" variant="body">
            Coming soon.
          </AppText>
        </View>

        <AppCard className="gap-2">
          <AppText variant="heading">Not in v1</AppText>
          <AppText variant="body">
            Assessments/mock tests are planned later. This screen is a placeholder so the new
            navigation layout matches the final structure.
          </AppText>
        </AppCard>
      </AppStack>
    </Screen>
  );
}

