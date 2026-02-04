import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "AssessmentsMain">;

export function AssessmentsListScreen({ navigation }: Props) {
  return (
    <Screen scroll>
      <AppStack gap="lg">
        <View>
          <AppText variant="title">Assessments</AppText>
          <AppText className="mt-2" variant="body">
            Create and export structured student assessments.
          </AppText>
        </View>

        <AppCard className="gap-3">
          <AppText variant="heading">Driving Assessment</AppText>
          <AppText variant="body">
            Score key driving competencies, record feedback, and export a PDF summary.
          </AppText>
          <AppButton
            width="auto"
            label="Start Driving Assessment"
            onPress={() => navigation.navigate("DrivingAssessment")}
          />
        </AppCard>

        <AppCard className="gap-2">
          <AppText variant="heading">Mock Test – Restricted Licence</AppText>
          <AppText variant="body">
            Structured mock test with Stage 1 & Stage 2 tasks, critical errors, immediate-fail
            errors, and PDF export.
          </AppText>
          <AppButton
            width="auto"
            label="Start Mock Test"
            onPress={() => navigation.navigate("RestrictedMockTest")}
          />
        </AppCard>

        <AppCard className="gap-2">
          <AppText variant="heading">3rd Assessment</AppText>
          <AppText variant="body">Coming soon.</AppText>
        </AppCard>
      </AppStack>
    </Screen>
  );
}
