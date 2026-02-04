const BASE64_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const BASE64_LOOKUP = (() => {
  const table = new Uint8Array(256);
  table.fill(255);
  for (let i = 0; i < BASE64_ALPHABET.length; i += 1) {
    table[BASE64_ALPHABET.charCodeAt(i)] = i;
  }
  table["=".charCodeAt(0)] = 0;
  return table;
})();

export function base64ToUint8Array(input: string) {
  const base64 = input.replace(/\s/g, "");
  if (base64.length % 4 !== 0) {
    throw new Error("Invalid base64 string.");
  }

  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const byteLength = (base64.length * 3) / 4 - padding;

  const bytes = new Uint8Array(byteLength);

  let byteIndex = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const c0 = BASE64_LOOKUP[base64.charCodeAt(i)];
    const c1 = BASE64_LOOKUP[base64.charCodeAt(i + 1)];
    const c2 = BASE64_LOOKUP[base64.charCodeAt(i + 2)];
    const c3 = BASE64_LOOKUP[base64.charCodeAt(i + 3)];

    if (c0 === 255 || c1 === 255 || c2 === 255 || c3 === 255) {
      throw new Error("Invalid base64 string.");
    }

    const b0 = (c0 << 2) | (c1 >> 4);
    const b1 = ((c1 & 15) << 4) | (c2 >> 2);
    const b2 = ((c2 & 3) << 6) | c3;

    bytes[byteIndex++] = b0;
    if (byteIndex < byteLength) bytes[byteIndex++] = b1;
    if (byteIndex < byteLength) bytes[byteIndex++] = b2;
  }

  return bytes;
}

