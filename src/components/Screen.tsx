import type { PropsWithChildren } from "react";
import { ScrollView, View, type ViewProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

type Props = PropsWithChildren<ViewProps> & {
  scroll?: boolean;
};

export function Screen({ scroll = false, className, children, ...props }: Props) {
  const content = (
    <View className={cn(theme.screen.container, className)} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={theme.screen.safeArea}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerClassName={theme.screen.scrollContent}
        >
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
