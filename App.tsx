import "./global.css";

import { useCallback, useEffect, useRef, useState } from "react";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";

import { AppRoot } from "./src/app/AppRoot";
import { LaunchScreen } from "./src/app/LaunchScreen";
import { useAppColorScheme } from "./src/providers/ColorSchemeProvider";
import { AppProviders } from "./src/providers/AppProviders";

const NATIVE_SPLASH_FADE_DURATION_MS = 250;
const MIN_LAUNCH_DURATION_MS = 5000;
const LAUNCH_FAILSAFE_TIMEOUT_MS = 8000;

void SplashScreen.preventAutoHideAsync().catch(() => {
  // Ignore if the splash screen was already prevented from auto-hiding.
});
SplashScreen.setOptions({
  fade: true,
  duration: NATIVE_SPLASH_FADE_DURATION_MS,
});

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

function AppStatusBar() {
  const { scheme } = useAppColorScheme();
  return <StatusBar style={scheme === "dark" ? "light" : "dark"} />;
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [bootReady, setBootReady] = useState(false);
  const [minimumLaunchElapsed, setMinimumLaunchElapsed] = useState(false);
  const [forceLaunchDismiss, setForceLaunchDismiss] = useState(false);
  const [launchFinished, setLaunchFinished] = useState(false);
  const didHideNativeSplashRef = useRef(false);

  const shouldDismissLaunchScreen =
    forceLaunchDismiss || (bootReady && minimumLaunchElapsed);

  const hideNativeSplash = useCallback(() => {
    if (didHideNativeSplashRef.current) return;

    didHideNativeSplashRef.current = true;
    void SplashScreen.hideAsync().catch(() => {
      // Keep startup resilient if the native splash has already been hidden.
    });
  }, []);

  useEffect(() => {
    if (!fontsLoaded || launchFinished) return;

    const timer = setTimeout(() => {
      setMinimumLaunchElapsed(true);
    }, MIN_LAUNCH_DURATION_MS);

    return () => clearTimeout(timer);
  }, [fontsLoaded, launchFinished]);

  useEffect(() => {
    if (!fontsLoaded || launchFinished) return;

    const timer = setTimeout(() => {
      setForceLaunchDismiss(true);
    }, LAUNCH_FAILSAFE_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [fontsLoaded, launchFinished]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <AppStatusBar />
        <AppRoot onBootReady={() => setBootReady(true)} />
        {!launchFinished ? (
          <LaunchScreen
            shouldDismiss={shouldDismissLaunchScreen}
            onFinish={() => setLaunchFinished(true)}
            onFirstLayout={hideNativeSplash}
          />
        ) : null}
      </AppProviders>
    </GestureHandlerRootView>
  );
}
