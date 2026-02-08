export function normalizeLicenseNumberInput(raw: string) {
  // Uppercases letters; numbers/symbols unchanged.
  return raw.toUpperCase();
}
