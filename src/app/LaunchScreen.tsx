import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { AppText } from "../components/AppText";

type Props = {
  shouldDismiss: boolean;
  onFinish: () => void;
  onFirstLayout: () => void;
};

const INTRO_LOGO_DURATION_MS = 360;
const INTRO_TEXT_DURATION_MS = 320;
const EXIT_FADE_DURATION_MS = 220;

export function LaunchScreen({ shouldDismiss, onFinish, onFirstLayout }: Props) {
  const logoOpacity = useSharedValue(0);
  const logoScale = useSharedValue(0.9);
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(14);
  const containerOpacity = useSharedValue(1);

  const didStartExitRef = useRef(false);
  const didFinishRef = useRef(false);
  const didLayoutRef = useRef(false);

  useEffect(() => {
    logoOpacity.value = withTiming(1, {
      duration: INTRO_LOGO_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    logoScale.value = withTiming(1, {
      duration: INTRO_LOGO_DURATION_MS,
      easing: Easing.out(Easing.cubic),
    });
    textOpacity.value = withDelay(
      120,
      withTiming(1, {
        duration: INTRO_TEXT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
    textTranslateY.value = withDelay(
      120,
      withTiming(0, {
        duration: INTRO_TEXT_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      }),
    );
  }, [logoOpacity, logoScale, textOpacity, textTranslateY]);

  useEffect(() => {
    if (!shouldDismiss || didStartExitRef.current) return;

    didStartExitRef.current = true;
    containerOpacity.value = withTiming(
      0,
      {
        duration: EXIT_FADE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        if (!finished || didFinishRef.current) return;

        didFinishRef.current = true;
        runOnJS(onFinish)();
      },
    );
  }, [containerOpacity, onFinish, shouldDismiss]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFillObject, styles.container, containerStyle]}
      onLayout={() => {
        if (didLayoutRef.current) return;
        didLayoutRef.current = true;
        onFirstLayout();
      }}
    >
      <View style={styles.content}>
        <Animated.Image
          source={require("../../assets/splash-icon.png")}
          resizeMode="contain"
          style={[styles.logo, logoStyle]}
        />
        <Animated.View style={[styles.copy, textStyle]}>
          <AppText style={styles.title} variant="title">
            Driving School Management
          </AppText>
          <AppText style={styles.subtitle} variant="body">
            Developed by SM Driving School Ltd
          </AppText>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#ffffff",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: {
    width: 190,
    height: 190,
  },
  copy: {
    marginTop: 20,
    alignItems: "center",
  },
  title: {
    color: "#0f172a",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    color: "#475569",
    textAlign: "center",
  },
});
