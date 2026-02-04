import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { openPdfUri } from "../../utils/open-pdf";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const DOWNLOADS_CHANNEL_ID = "downloads";

async function ensureAndroidChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(DOWNLOADS_CHANNEL_ID, {
    name: "Downloads",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function requestDownloadNotificationPermission() {
  await ensureAndroidChannel();

  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: false, allowBadge: false },
  });

  return requested.status === "granted";
}

export async function notifyPdfSaved(input: { fileName: string; uri: string; savedTo: string }) {
  const ok = await requestDownloadNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "PDF saved",
      body: `${input.fileName}.pdf saved to ${input.savedTo}. Tap to open.`,
      data: { pdfUri: input.uri },
    },
    trigger: null,
  });

  return true;
}

export function useOpenPdfFromDownloadNotifications() {
  useEffect(() => {
    let mounted = true;

    async function handleResponse(response: Notifications.NotificationResponse | null) {
      if (!response) return;
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

      const uri = response.notification.request.content.data?.pdfUri;
      if (typeof uri !== "string") return;

      try {
        await openPdfUri(uri);
      } catch {
        // If opening fails, keep the app running without crashing.
      }
    }

    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!mounted) return;
        return handleResponse(response);
      })
      .catch(() => {});

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      void handleResponse(response);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);
}

