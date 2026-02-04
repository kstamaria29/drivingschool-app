import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { isAvailableAsync, shareAsync } from "expo-sharing";

export async function openPdfUri(uri: string) {
  if (Platform.OS === "android") {
    const contentUri = uri.startsWith("file://") ? await FileSystem.getContentUriAsync(uri) : uri;
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: contentUri,
      flags: 1,
      type: "application/pdf",
    });
    return;
  }

  try {
    await Linking.openURL(uri);
  } catch {
    const canShare = await isAvailableAsync();
    if (!canShare) throw new Error("Couldn't open this PDF on this device.");
    await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
  }
}

