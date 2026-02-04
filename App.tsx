import "./global.css";

import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { LogBox } from "react-native";

import { AppRoot } from "./src/app/AppRoot";
import { AppProviders } from "./src/providers/AppProviders";

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release. Please use 'react-native-safe-area-context' instead.",
]);

export default function App() {
  return (
    <>
      <StatusBar style="dark" />
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AppProviders>
          <AppRoot />
        </AppProviders>
      </GestureHandlerRootView>
    </>
  );
}
