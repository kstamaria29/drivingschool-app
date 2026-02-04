import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";

const STORAGE_KEY = "drivingschool.android.downloadsDirectoryUri.v1";

export async function getAndroidDownloadsDirectoryUri() {
  if (Platform.OS !== "android") return null;
  return (await AsyncStorage.getItem(STORAGE_KEY)) || null;
}

export async function setAndroidDownloadsDirectoryUri(directoryUri: string | null) {
  if (Platform.OS !== "android") return;
  if (!directoryUri) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORAGE_KEY, directoryUri);
}

export async function ensureAndroidDownloadsDirectoryUri() {
  if (Platform.OS !== "android") return null;

  const existing = await getAndroidDownloadsDirectoryUri();
  if (existing) return existing;

  const initial = FileSystem.StorageAccessFramework.getUriForDirectoryInRoot("Download");
  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(initial);

  if (!permission.granted) return null;

  await setAndroidDownloadsDirectoryUri(permission.directoryUri);
  return permission.directoryUri;
}

