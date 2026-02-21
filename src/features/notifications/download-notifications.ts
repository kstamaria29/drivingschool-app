import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";

import { openPdfUri } from "../../utils/open-pdf";
import { getAndroidNotificationChannelId } from "./channels";
import { loadNotificationPreferences } from "./preferences";

export async function requestDownloadNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.status === "granted") return true;

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });

  return requested.status === "granted";
}

export async function notifyPdfSaved(input: { fileName: string; uri: string; savedTo: string }) {
  const prefs = await loadNotificationPreferences();
  const categoryPrefs = prefs.downloads;
  if (!categoryPrefs.soundEnabled && !categoryPrefs.vibrationEnabled) return false;

  const androidChannelId = getAndroidNotificationChannelId({
    category: "downloads",
    soundEnabled: categoryPrefs.soundEnabled,
    vibrationEnabled: categoryPrefs.vibrationEnabled,
  });

  const ok = await requestDownloadNotificationPermission();
  if (!ok) return false;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "PDF saved",
      body: `${input.fileName}.pdf saved to ${input.savedTo}. Tap to open.`,
      ...(categoryPrefs.soundEnabled ? { sound: "default" } : null),
      data: { category: "downloads", pdfUri: input.uri },
    },
    trigger:
      Platform.OS === "android"
        ? ({ channelId: androidChannelId } as Notifications.ChannelAwareTriggerInput)
        : null,
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

