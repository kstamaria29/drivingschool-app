import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { View } from "react-native";
import { ClipboardCheck, ClipboardList, ClipboardPen } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

import type { AssessmentsStackParamList } from "../AssessmentsStackNavigator";
import { useNavigationLayout } from "../useNavigationLayout";

type Props = NativeStackScreenProps<AssessmentsStackParamList, "AssessmentsMain">;

export function AssessmentsListScreen({ navigation }: Props) {
  const { isSidebar, isCompact } = useNavigationLayout();

  const drivingCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-3"}>
      <AppText variant="heading">Driving Assessment</AppText>
      <AppText variant="body">
        Score key driving competencies, record feedback, and export a PDF summary.
      </AppText>
      <AppButton
        width="auto"
        label="Start Driving Assessment"
        icon={ClipboardCheck}
        onPress={() => navigation.navigate("DrivingAssessment")}
      />
    </AppCard>
  );

  const restrictedCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-2"}>
      <AppText variant="heading">Mock Test – Restricted Licence</AppText>
      <AppText variant="body">
        Structured mock test with Stage 1 & Stage 2 tasks, critical errors, immediate-fail errors,
        and PDF export.
      </AppText>
      <AppButton
        width="auto"
        label="Start Restricted Mock Test"
        icon={ClipboardList}
        onPress={() => navigation.navigate("RestrictedMockTest")}
      />
    </AppCard>
  );

  const fullCard = (
    <AppCard className={isSidebar ? "flex-1 min-w-[360px] gap-3" : "gap-2"}>
      <AppText variant="heading">Mock Test - Full License</AppText>
      <AppText variant="body">
        Full License mock test with assessable tasks, hazards spoken, critical/immediate errors,
        and PDF export.
      </AppText>
      <AppButton
        width="auto"
        label="Start Full License Mock Test"
        icon={ClipboardPen}
        onPress={() => navigation.navigate("FullLicenseMockTest")}
      />
    </AppCard>
  );

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Assessments</AppText>
          <AppText className="mt-2" variant="body">
            Create and export structured student assessments.
          </AppText>
        </View>

        {isSidebar ? (
          <View className="flex-row flex-wrap gap-6">
            {drivingCard}
            {restrictedCard}
            {fullCard}
          </View>
        ) : (
          <>
            {drivingCard}
            {restrictedCard}
            {fullCard}
          </>
        )}
      </AppStack>
    </Screen>
  );
}
