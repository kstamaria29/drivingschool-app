import dayjs from "dayjs";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, useWindowDimensions, View } from "react-native";

import { cn } from "../utils/cn";

import { AppButton } from "./AppButton";
import { AppInput } from "./AppInput";
import { AppStack } from "./AppStack";

const DISPLAY_TIME_FORMAT = "HH:mm";

type Props = {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  error?: string;
  disabled?: boolean;
  minuteInterval?: number;
};

function parseToDate(value: string) {
  const parsed = dayjs(value, DISPLAY_TIME_FORMAT, true);
  if (parsed.isValid()) return parsed.toDate();
  const fallback = dayjs(value);
  return fallback.isValid() ? fallback.toDate() : new Date();
}

export function AppTimeInput({ label, value, onChangeText, error, disabled, minuteInterval }: Props) {
  const { width, height } = useWindowDimensions();
  const isCompact = Math.min(width, height) < 600;
  const [open, setOpen] = useState(false);
  const initialDate = useMemo(() => parseToDate(value), [value]);
  const [tempDate, setTempDate] = useState<Date>(initialDate);

  function openPicker() {
    if (disabled) return;
    setTempDate(parseToDate(value));
    setOpen(true);
  }

  function closePicker() {
    setOpen(false);
  }

  function onAndroidChange(event: DateTimePickerEvent, selected?: Date) {
    closePicker();
    if (event.type !== "set") return;
    if (!selected) return;
    onChangeText(dayjs(selected).format(DISPLAY_TIME_FORMAT));
  }

  function onIOSChange(_event: DateTimePickerEvent, selected?: Date) {
    if (!selected) return;
    setTempDate(selected);
  }

  return (
    <>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={openPicker}>
        <View pointerEvents="none">
          <AppInput
            label={label}
            value={value}
            placeholder={DISPLAY_TIME_FORMAT}
            editable={false}
            error={error}
          />
        </View>
      </Pressable>

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={tempDate}
          mode="time"
          display="spinner"
          onChange={onAndroidChange}
          minuteInterval={minuteInterval}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable
            className={cn("flex-1 bg-black/40", isCompact ? "px-4 py-6" : "px-6 py-10")}
            onPress={closePicker}
          >
            <Pressable
              className={cn(
                "self-center w-full max-w-md rounded-2xl border border-border bg-card dark:border-borderDark dark:bg-cardDark",
                isCompact ? "p-3" : "p-4",
              )}
            >
              <AppStack gap="md">
                <DateTimePicker
                  value={tempDate}
                  mode="time"
                  display="spinner"
                  onChange={onIOSChange}
                  minuteInterval={minuteInterval}
                />

                <View className="flex-row gap-2">
                  <AppButton
                    width="auto"
                    className="flex-1"
                    variant="secondary"
                    label="Cancel"
                    onPress={closePicker}
                  />
                  <AppButton
                    width="auto"
                    className="flex-1"
                    label="OK"
                    onPress={() => {
                      onChangeText(dayjs(tempDate).format(DISPLAY_TIME_FORMAT));
                      closePicker();
                    }}
                  />
                </View>
              </AppStack>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}
