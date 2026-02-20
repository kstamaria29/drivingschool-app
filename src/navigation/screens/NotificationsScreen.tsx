import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Linking, Modal, Platform, Pressable, Switch, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import * as Notifications from "expo-notifications";
import { BellRing, ChevronDown, Send, Settings as SettingsIcon } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { getAndroidNotificationChannelId } from "../../features/notifications/channels";
import {
  loadNotificationPreferences,
  notificationPreferencesFromSettingsRow,
  saveNotificationPreferences,
} from "../../features/notifications/preferences";
import {
  useMyNotificationSettingsQuery,
  useMyPushTokensQuery,
  useUpdateNotificationSettingsMutation,
} from "../../features/notifications/queries";
import { registerMyExpoPushToken } from "../../features/notifications/push";
import { requestDownloadNotificationPermission } from "../../features/notifications/download-notifications";
import { requestReminderNotificationPermission } from "../../features/reminders/notifications";
import { sendTestPushNotification } from "../../features/notifications/test-push";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import { useNavigationLayout } from "../useNavigationLayout";

type PermissionResponse = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

function getPermissionStatusLabel(status: string | null | undefined) {
  if (status === "granted") return "Enabled";
  if (status === "denied") return "Disabled";
  if (status === "undetermined") return "Not set";
  return "Unknown";
}

function getPermissionStatusClassName(status: string | null | undefined) {
  if (status === "granted") return "text-green-700 dark:text-green-300";
  if (status === "denied") return "text-red-700 dark:text-red-300";
  return "text-muted dark:text-mutedDark";
}

const LESSON_OFFSET_OPTIONS = [
  { minutes: 30, label: "30 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 180, label: "3 hours" },
  { minutes: 300, label: "5 hours" },
  { minutes: 1440, label: "Day before" },
  { minutes: 2880, label: "2 days before" },
] as const;

const SWITCH_ON_TRACK_COLOR = "#16a34a";
const SWITCH_OFF_TRACK_COLOR = "#dc2626";

function BooleanSwitch({
  value,
  onChange,
  disabled,
  accessibilityLabel,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  accessibilityLabel: string;
}) {
  return (
    <Switch
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      value={value}
      disabled={disabled}
      onValueChange={onChange}
      trackColor={{ false: SWITCH_OFF_TRACK_COLOR, true: SWITCH_ON_TRACK_COLOR }}
      ios_backgroundColor={SWITCH_OFF_TRACK_COLOR}
      thumbColor="#ffffff"
    />
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className={cn("flex-row items-center justify-between gap-3", disabled ? "opacity-60" : "")}>
      <AppText className="flex-1 font-medium" variant="body">
        {label}
      </AppText>
      <BooleanSwitch
        accessibilityLabel={label}
        value={value}
        disabled={disabled}
        onChange={onChange}
      />
    </View>
  );
}

function OffsetChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        "rounded-full border px-3 py-2",
        selected
          ? "border-primary bg-primary/15 dark:border-primaryDark dark:bg-primaryDark/20"
          : "border-border bg-card dark:border-borderDark dark:bg-cardDark",
      )}
    >
      <AppText
        variant="caption"
        className={cn(
          selected
            ? "font-semibold text-primary dark:text-primaryDark"
            : "text-muted dark:text-mutedDark",
        )}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

function formatOffsetsSummary(offsets: number[]) {
  if (!offsets.length) return "None";
  const map = new Map<number, string>(
    LESSON_OFFSET_OPTIONS.map((option) => [option.minutes, option.label]),
  );
  const labels = offsets.map((minutes) => map.get(minutes) ?? `${minutes} min`);
  return labels.join(", ");
}

function formatTimeLabel(time: string | null | undefined) {
  const match = time?.match(/^([01]\d|2[0-3]):([0-5]\d)/);
  if (!match) return time ?? "";
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const period = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function NotificationsScreen() {
  const { isCompact } = useNavigationLayout();
  const { profile } = useCurrentUser();
  const mountedRef = useRef(true);
  const isAdmin = profile.role === "admin";

  const [permission, setPermission] = useState<PermissionResponse | null>(null);
  const [loadingPermission, setLoadingPermission] = useState(true);
  const [permissionActionPending, setPermissionActionPending] = useState(false);
  const [pushRegisterPending, setPushRegisterPending] = useState(false);
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [offsetPickerVisible, setOffsetPickerVisible] = useState(false);
  const [draftOffsets, setDraftOffsets] = useState<number[]>([]);

  const settingsQuery = useMyNotificationSettingsQuery({
    profileId: profile.id,
    organizationId: profile.organization_id,
  });
  const updateSettingsMutation = useUpdateNotificationSettingsMutation({
    profileId: profile.id,
    organizationId: profile.organization_id,
  });
  const pushTokensQuery = useMyPushTokensQuery(profile.id);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshPermission = useCallback(async () => {
    setLoadingPermission(true);
    try {
      const next = await Notifications.getPermissionsAsync();
      if (!mountedRef.current) return;
      setPermission(next);
    } catch {
      if (!mountedRef.current) return;
      setPermission(null);
    } finally {
      if (!mountedRef.current) return;
      setLoadingPermission(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshPermission();
    }, [refreshPermission]),
  );

  const permissionStatus = permission?.status;
  const iosStatus = permission?.ios?.status;
  const isProvisionalIOS =
    iosStatus === Notifications.IosAuthorizationStatus.PROVISIONAL;
  const isNotificationsEnabled = permission?.granted === true || isProvisionalIOS;

  const statusLabel = isNotificationsEnabled
    ? "Enabled"
    : getPermissionStatusLabel(permissionStatus);
  const statusClassName = isNotificationsEnabled
    ? "text-green-700 dark:text-green-300"
    : getPermissionStatusClassName(permissionStatus);
  const canAskAgain = permission?.canAskAgain !== false;

  const enableLabel =
    isNotificationsEnabled
      ? "Notifications enabled"
      : permissionStatus === "denied" && !canAskAgain
        ? "Enable in device settings"
        : "Enable notifications";

  const enableDisabled =
    loadingPermission ||
    permissionActionPending ||
    isNotificationsEnabled ||
    (permissionStatus === "denied" && !canAskAgain);

  async function onEnablePress() {
    setPermissionActionPending(true);
    try {
      await requestReminderNotificationPermission();
    } catch {
      // Keep the screen usable even if permissions cannot be requested.
    } finally {
      setPermissionActionPending(false);
    }

    await refreshPermission();
  }

  async function onOpenSettingsPress() {
    try {
      await Linking.openSettings();
    } catch {
      Alert.alert(
        "Unable to open settings",
        "Please open your device settings and enable notifications for this app.",
      );
    }
  }

  useEffect(() => {
    if (!settingsQuery.data) return;
    void saveNotificationPreferences(notificationPreferencesFromSettingsRow(settingsQuery.data));
  }, [settingsQuery.data]);

  const lessonOffsets = useMemo(() => {
    const raw = settingsQuery.data?.lesson_reminder_offsets_minutes ?? [60];
    const unique = [...new Set(raw.filter((m) => Number.isFinite(m) && m > 0))];
    unique.sort((a, b) => a - b);
    return unique;
  }, [settingsQuery.data?.lesson_reminder_offsets_minutes]);

  const digestTimeLabel = formatTimeLabel(settingsQuery.data?.daily_digest_time ?? "07:00:00");

  async function updateSettings(
    patch: Parameters<typeof updateSettingsMutation.mutateAsync>[0],
  ) {
    try {
      await updateSettingsMutation.mutateAsync(patch);
    } catch (error) {
      Alert.alert("Update failed", toErrorMessage(error));
    }
  }

  async function registerPushToken() {
    setPushRegisterPending(true);
    try {
      await registerMyExpoPushToken({
        profileId: profile.id,
        organizationId: profile.organization_id,
      });
      await pushTokensQuery.refetch();
      Alert.alert("Push notifications enabled", "This device is now registered for push alerts.");
    } catch (error) {
      Alert.alert("Push setup failed", toErrorMessage(error));
    } finally {
      setPushRegisterPending(false);
    }
  }

  async function sendLocalTest(category: "downloads" | "student_reminders") {
    setSendingTest(category);
    try {
      const prefs = await loadNotificationPreferences();
      const categoryPrefs =
        category === "downloads" ? prefs.downloads : prefs.studentReminders;

      const channelId = getAndroidNotificationChannelId({
        category,
        soundEnabled: categoryPrefs.soundEnabled,
        vibrationEnabled: categoryPrefs.vibrationEnabled,
      });

      const ok =
        category === "downloads"
          ? await requestDownloadNotificationPermission()
          : await requestReminderNotificationPermission();
      if (!ok) {
        Alert.alert("Notifications disabled", "Enable notifications and try again.");
        return;
      }

      const title = category === "downloads" ? "Test: PDF saved" : "Test: Student reminder";
      const body =
        category === "downloads"
          ? "This is a test download notification."
          : "This is a test student reminder notification.";

      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          ...(categoryPrefs.soundEnabled ? { sound: "default" } : null),
          data: { category, kind: "test" },
        },
        trigger:
          Platform.OS === "android"
            ? ({ channelId } as Notifications.ChannelAwareTriggerInput)
            : null,
      });

      Alert.alert("Sent", "Test notification scheduled.");
    } catch (error) {
      Alert.alert("Test notification failed", toErrorMessage(error));
    } finally {
      setSendingTest(null);
    }
  }

  async function sendPushTest(category: "lesson_reminders" | "daily_digest") {
    setSendingTest(category);
    try {
      if ((pushTokensQuery.data?.length ?? 0) === 0) {
        Alert.alert("Push not set up", "Register this device for push notifications first.");
        return;
      }

      await sendTestPushNotification({ category });
      Alert.alert("Sent", "Test push notification sent to your registered devices.");
    } catch (error) {
      Alert.alert("Test push failed", toErrorMessage(error));
    } finally {
      setSendingTest(null);
    }
  }

  function openOffsetPicker() {
    setDraftOffsets(lessonOffsets);
    setOffsetPickerVisible(true);
  }

  function toggleDraftOffset(minutes: number) {
    setDraftOffsets((current) => {
      const set = new Set(current);
      if (set.has(minutes)) set.delete(minutes);
      else set.add(minutes);
      return [...set].sort((a, b) => a - b);
    });
  }

  return (
    <Screen scroll>
      <AppStack gap={isCompact ? "md" : "lg"}>
        <View>
          <AppText variant="title">Notifications</AppText>
          <AppText className="mt-2" variant="body">
            Configure notification categories, sounds, and upcoming lesson alerts.
          </AppText>
        </View>

        <AppCard className="gap-3">
          <AppText variant="heading">Notification permissions</AppText>
          <AppText variant="caption">
            Notifications are controlled by your device. If they are disabled, reminders and download
            alerts may not appear.
          </AppText>

          {loadingPermission ? (
            <View className="items-center justify-center py-4">
              <ActivityIndicator />
              <AppText className="mt-3 text-center" variant="body">
                Checking permissions...
              </AppText>
            </View>
          ) : (
            <>
              <View className="flex-row items-center justify-between gap-3">
                <AppText variant="body">Status</AppText>
                <AppText className={statusClassName} variant="body">
                  {statusLabel}
                </AppText>
              </View>

              {permissionStatus === "denied" && !canAskAgain ? (
                <AppText className="text-muted dark:text-mutedDark" variant="caption">
                  Notifications are blocked at the system level. Enable them in device settings.
                </AppText>
              ) : null}
            </>
          )}

          <AppStack gap="sm">
            <AppButton
              label={permissionActionPending ? "Working..." : enableLabel}
              icon={BellRing}
              disabled={enableDisabled}
              onPress={() => void onEnablePress()}
            />
            <AppButton
              label="Open device settings"
              variant="secondary"
              icon={SettingsIcon}
              disabled={loadingPermission || permissionActionPending}
              onPress={() => void onOpenSettingsPress()}
            />
          </AppStack>
        </AppCard>

        <AppCard className="gap-3">
          <AppText variant="heading">Push notifications</AppText>
          <AppText variant="caption">
            Register this device to receive cross-device alerts (daily digest + upcoming lessons).
          </AppText>

          <View className="flex-row items-center justify-between gap-3">
            <AppText variant="body">Registered devices</AppText>
            <AppText
              className={cn(
                (pushTokensQuery.data?.length ?? 0) > 0
                  ? "text-green-700 dark:text-green-300"
                  : "text-muted dark:text-mutedDark",
              )}
              variant="body"
            >
              {pushTokensQuery.isPending ? "Loading..." : String(pushTokensQuery.data?.length ?? 0)}
            </AppText>
          </View>

          <AppButton
            label={pushRegisterPending ? "Registering..." : "Register this device"}
            icon={BellRing}
            disabled={pushRegisterPending || pushTokensQuery.isPending}
            onPress={() => void registerPushToken()}
          />
        </AppCard>

        {settingsQuery.isPending ? (
          <AppCard className="items-center justify-center py-6">
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading notification settings...
            </AppText>
          </AppCard>
        ) : settingsQuery.isError ? (
          <AppCard className="gap-3">
            <AppText variant="heading">Notification settings</AppText>
            <AppText variant="body">{toErrorMessage(settingsQuery.error)}</AppText>
            <AppButton
              label="Retry"
              variant="secondary"
              icon={BellRing}
              onPress={() => void settingsQuery.refetch()}
            />
          </AppCard>
        ) : settingsQuery.data ? (
          <>
            <AppCard className="gap-4">
              <AppText variant="heading">Upcoming lessons</AppText>
              <AppText variant="caption">
                Get notified before your scheduled lessons. Choose multiple offsets.
              </AppText>

              <ToggleRow
                label="Enabled"
                value={settingsQuery.data.lesson_reminders_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ lesson_reminders_enabled: next });
                }}
              />

              <Pressable
                accessibilityRole="button"
                disabled={updateSettingsMutation.isPending}
                onPress={openOffsetPicker}
                className="flex-row items-center justify-between rounded-xl border border-border bg-card px-3 py-3 dark:border-borderDark dark:bg-cardDark"
              >
                <View className="flex-1 pr-3">
                  <AppText variant="body">Notify me</AppText>
                  <AppText variant="caption">{formatOffsetsSummary(lessonOffsets)}</AppText>
                </View>
                <ChevronDown size={18} color={theme.colors.mutedLight} />
              </Pressable>

              <ToggleRow
                label="Sound"
                value={settingsQuery.data.lesson_reminders_sound_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ lesson_reminders_sound_enabled: next });
                }}
              />

              <ToggleRow
                label="Vibration (Android)"
                value={settingsQuery.data.lesson_reminders_vibration_enabled}
                disabled={updateSettingsMutation.isPending || Platform.OS !== "android"}
                onChange={(next) => {
                  void updateSettings({ lesson_reminders_vibration_enabled: next });
                }}
              />

              {isAdmin ? (
                <AppButton
                  label={sendingTest === "lesson_reminders" ? "Sending..." : "Send test notification"}
                  variant="secondary"
                  icon={Send}
                  disabled={sendingTest != null}
                  onPress={() => void sendPushTest("lesson_reminders")}
                />
              ) : null}
            </AppCard>

            <AppCard className="gap-4">
              <AppText variant="heading">Daily digest</AppText>
              <AppText variant="caption">
                Get a daily notification with your lessons for today (sent at {digestTimeLabel}).
              </AppText>

              <ToggleRow
                label="Enabled"
                value={settingsQuery.data.daily_digest_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ daily_digest_enabled: next });
                }}
              />

              <ToggleRow
                label="Sound"
                value={settingsQuery.data.daily_digest_sound_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ daily_digest_sound_enabled: next });
                }}
              />

              <ToggleRow
                label="Vibration (Android)"
                value={settingsQuery.data.daily_digest_vibration_enabled}
                disabled={updateSettingsMutation.isPending || Platform.OS !== "android"}
                onChange={(next) => {
                  void updateSettings({ daily_digest_vibration_enabled: next });
                }}
              />

              {isAdmin ? (
                <AppButton
                  label={sendingTest === "daily_digest" ? "Sending..." : "Send test notification"}
                  variant="secondary"
                  icon={Send}
                  disabled={sendingTest != null}
                  onPress={() => void sendPushTest("daily_digest")}
                />
              ) : null}
            </AppCard>

            <AppCard className="gap-4">
              <AppText variant="heading">Student reminders</AppText>
              <AppText variant="caption">
                Controls the sound/vibration for student reminder notifications.
              </AppText>

              <ToggleRow
                label="Sound"
                value={settingsQuery.data.student_reminders_sound_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ student_reminders_sound_enabled: next });
                }}
              />

              <ToggleRow
                label="Vibration (Android)"
                value={settingsQuery.data.student_reminders_vibration_enabled}
                disabled={updateSettingsMutation.isPending || Platform.OS !== "android"}
                onChange={(next) => {
                  void updateSettings({ student_reminders_vibration_enabled: next });
                }}
              />

              {isAdmin ? (
                <AppButton
                  label={sendingTest === "student_reminders" ? "Sending..." : "Send test notification"}
                  variant="secondary"
                  icon={BellRing}
                  disabled={sendingTest != null}
                  onPress={() => void sendLocalTest("student_reminders")}
                />
              ) : null}
            </AppCard>

            <AppCard className="gap-4">
              <AppText variant="heading">Downloads</AppText>
              <AppText variant="caption">
                Controls the sound/vibration for PDF saved notifications.
              </AppText>

              <ToggleRow
                label="Sound"
                value={settingsQuery.data.downloads_sound_enabled}
                disabled={updateSettingsMutation.isPending}
                onChange={(next) => {
                  void updateSettings({ downloads_sound_enabled: next });
                }}
              />

              <ToggleRow
                label="Vibration (Android)"
                value={settingsQuery.data.downloads_vibration_enabled}
                disabled={updateSettingsMutation.isPending || Platform.OS !== "android"}
                onChange={(next) => {
                  void updateSettings({ downloads_vibration_enabled: next });
                }}
              />

              {isAdmin ? (
                <AppButton
                  label={sendingTest === "downloads" ? "Sending..." : "Send test notification"}
                  variant="secondary"
                  icon={BellRing}
                  disabled={sendingTest != null}
                  onPress={() => void sendLocalTest("downloads")}
                />
              ) : null}
            </AppCard>

            <Modal
              animationType="fade"
              transparent
              visible={offsetPickerVisible}
              onRequestClose={() => setOffsetPickerVisible(false)}
            >
              <View className="flex-1 items-center justify-center bg-black/40 px-4">
                <View className="w-full max-w-[640px]">
                  <AppCard className="gap-4">
                    <View>
                      <AppText variant="heading">Upcoming lesson notifications</AppText>
                      <AppText variant="caption">
                        Select when you want to be notified. Choose one or more.
                      </AppText>
                    </View>

                    <View className="flex-row flex-wrap gap-2">
                      {LESSON_OFFSET_OPTIONS.map((option) => (
                        <OffsetChip
                          key={option.minutes}
                          label={option.label}
                          selected={draftOffsets.includes(option.minutes)}
                          onPress={() => toggleDraftOffset(option.minutes)}
                        />
                      ))}
                    </View>

                    <AppStack gap="sm">
                      <AppButton
                        label="Save"
                        icon={BellRing}
                        disabled={updateSettingsMutation.isPending}
                        onPress={() => {
                          if (draftOffsets.length === 0) {
                            Alert.alert("Pick at least one option", "Select one or more offsets.");
                            return;
                          }
                          void updateSettings({ lesson_reminder_offsets_minutes: draftOffsets });
                          setOffsetPickerVisible(false);
                        }}
                      />
                      <AppButton
                        label="Cancel"
                        variant="secondary"
                        icon={SettingsIcon}
                        disabled={updateSettingsMutation.isPending}
                        onPress={() => setOffsetPickerVisible(false)}
                      />
                    </AppStack>
                  </AppCard>
                </View>
              </View>
            </Modal>
          </>
        ) : null}
      </AppStack>
    </Screen>
  );
}
