import dayjs from "dayjs";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useMemo, useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";

import { DISPLAY_DATE_FORMAT, parseDateInputToISODate } from "../utils/dates";

import { AppButton } from "./AppButton";
import { AppInput } from "./AppInput";
import { AppStack } from "./AppStack";

type Props = {
  label: string;
  value: string;
  onChangeText: (next: string) => void;
  error?: string;
  disabled?: boolean;
  minimumDate?: Date;
  maximumDate?: Date;
};

function parseToDate(value: string) {
  const iso = parseDateInputToISODate(value);
  const parsed = iso ? dayjs(iso) : dayjs(value);
  return parsed.isValid() ? parsed.toDate() : new Date();
}

export function AppDateInput({
  label,
  value,
  onChangeText,
  error,
  disabled,
  minimumDate,
  maximumDate,
}: Props) {
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
    onChangeText(dayjs(selected).format(DISPLAY_DATE_FORMAT));
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
            placeholder={DISPLAY_DATE_FORMAT}
            editable={false}
            error={error}
          />
        </View>
      </Pressable>

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="spinner"
          onChange={onAndroidChange}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
        />
      ) : null}

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="fade" onRequestClose={closePicker}>
          <Pressable className="flex-1 bg-black/40 px-6 py-10" onPress={closePicker}>
            <Pressable className="self-center w-full max-w-md rounded-2xl bg-card p-4">
              <AppStack gap="md">
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display="spinner"
                  onChange={onIOSChange}
                  minimumDate={minimumDate}
                  maximumDate={maximumDate}
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
                      onChangeText(dayjs(tempDate).format(DISPLAY_DATE_FORMAT));
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
