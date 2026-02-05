import * as FileSystem from "expo-file-system/legacy";

import { base64ToUint8Array } from "./base64";

export async function readUriAsUint8Array(uri: string) {
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64ToUint8Array(base64);
}

