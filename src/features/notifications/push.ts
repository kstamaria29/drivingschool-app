import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { upsertMyPushToken } from "./settings";

function readProjectId() {
  const anyExtra = Constants.expoConfig?.extra as
    | { eas?: { projectId?: string } }
    | undefined;
  const fromExtra = anyExtra?.eas?.projectId;
  const anyConstants = Constants as unknown as { easConfig?: { projectId?: string } };
  const fromEasConfig = anyConstants.easConfig?.projectId;
  const fromEnv = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  return fromExtra ?? fromEasConfig ?? fromEnv ?? null;
}

export async function getMyExpoPushTokenAsync() {
  const projectId = readProjectId();
  if (!projectId) return null;

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data ?? null;
  } catch {
    return null;
  }
}

export async function registerMyExpoPushToken(input: { profileId: string; organizationId: string }) {
  const projectId = readProjectId();
  if (!projectId) {
    throw new Error("EAS projectId not found (app.json -> extra.eas.projectId).");
  }

  const existing = await Notifications.getPermissionsAsync();
  const iosStatus = existing.ios?.status;
  const alreadyAllowed =
    existing.status === "granted" ||
    existing.granted === true ||
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;

  let permission = existing;
  if (!alreadyAllowed) {
    permission = await Notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowSound: true, allowBadge: false },
    });
  }

  const requestedIosStatus = permission.ios?.status;
  const granted =
    permission.status === "granted" ||
    permission.granted === true ||
    requestedIosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;

  if (!granted) {
    throw new Error("Notification permission not granted.");
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = token.data;
  if (!expoPushToken) {
    throw new Error("Failed to get Expo push token.");
  }

  await upsertMyPushToken({
    profileId: input.profileId,
    organizationId: input.organizationId,
    expoPushToken,
    platform: Platform.OS === "ios" ? "ios" : "android",
  });

  return expoPushToken;
}
