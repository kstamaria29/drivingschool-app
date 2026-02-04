import { ActivityIndicator, View } from "react-native";

import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";

type Props = {
  label: string;
};

export function AuthBootstrapScreen({ label }: Props) {
  return (
    <Screen>
      <View className={cn("flex-1 items-center justify-center", theme.text.base)}>
        <ActivityIndicator />
        <AppText className="mt-3 text-center" variant="body">
          {label}
        </AppText>
      </View>
    </Screen>
  );
}

