import dayjs from "dayjs";

import "./dayjs";

export const DISPLAY_DATE_FORMAT = "DD/MM/YYYY";
export const ISO_DATE_FORMAT = "YYYY-MM-DD";

export function formatDateDisplay(input: string | Date) {
  const parsed = dayjs(input);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : "—";
}

export function formatIsoDateToDisplay(isoDate: string) {
  const parsed = dayjs(isoDate, ISO_DATE_FORMAT, true);
  return parsed.isValid() ? parsed.format(DISPLAY_DATE_FORMAT) : formatDateDisplay(isoDate);
}

export function parseDateInputToISODate(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const iso = dayjs(trimmed, ISO_DATE_FORMAT, true);
  if (iso.isValid()) return iso.format(ISO_DATE_FORMAT);

  const display = dayjs(trimmed, DISPLAY_DATE_FORMAT, true);
  if (display.isValid()) return display.format(ISO_DATE_FORMAT);

  return null;
}

