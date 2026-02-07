import { useEffect, useRef, type PropsWithChildren } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

type Props = PropsWithChildren<ViewProps> & {
  scroll?: boolean;
};

const TABLET_MIN_WIDTH = 768;

export function Screen({ scroll = false, className, children, ...props }: Props) {
  const { width, height } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const scrollOffsetYRef = useRef(0);
  const isTabletPortrait = Math.min(width, height) >= TABLET_MIN_WIDTH && height > width;
  const keyboardAwareEnabled = scroll && isTabletPortrait;

  useEffect(() => {
    if (!keyboardAwareEnabled) return;

    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(showEvent, (event) => {
      const focusedInput = TextInput.State.currentlyFocusedInput?.();
      if (!focusedInput || typeof focusedInput.measureInWindow !== "function") {
        return;
      }

      focusedInput.measureInWindow((_x, y, _w, inputHeight) => {
        const keyboardTop = event.endCoordinates.screenY;
        const inputBottom = y + inputHeight;
        const isInBottomHalf = y >= height / 2;
        const overlap = inputBottom - keyboardTop;

        if (!isInBottomHalf || overlap <= 0) return;

        scrollRef.current?.scrollTo({
          y: Math.max(0, scrollOffsetYRef.current + overlap + 24),
          animated: true,
        });
      });
    });

    return () => {
      subscription.remove();
    };
  }, [height, keyboardAwareEnabled]);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    scrollOffsetYRef.current = event.nativeEvent.contentOffset.y;
  }

  const content = (
    <View className={cn(theme.screen.container, className)} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={theme.screen.safeArea}>
      {scroll ? (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          enabled={keyboardAwareEnabled}
        >
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
            automaticallyAdjustKeyboardInsets={Platform.OS === "ios" && keyboardAwareEnabled}
            contentContainerClassName={theme.screen.scrollContent}
            onScroll={keyboardAwareEnabled ? onScroll : undefined}
            scrollEventThrottle={keyboardAwareEnabled ? 16 : undefined}
          >
            {content}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
