import "./global.css";

import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, LogBox, View } from "react-native";

import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from "@expo-google-fonts/poppins";

import { AppRoot } from "./src/app/AppRoot";
import { useAppColorScheme } from "./src/providers/ColorSchemeProvider";
import { AppProviders } from "./src/providers/AppProviders";

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

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProviders>
        <AppStatusBar />
        <AppRoot />
      </AppProviders>
    </GestureHandlerRootView>
  );
}
