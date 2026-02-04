import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";

export function StudentsPlaceholderScreen() {
  return (
    <Screen>
      <AppText variant="title">Students</AppText>
      <AppText className="mt-2" variant="body">
        Students will be implemented after auth + onboarding.
      </AppText>
    </Screen>
  );
}
