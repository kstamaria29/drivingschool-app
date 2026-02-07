import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, useWindowDimensions, View } from "react-native";
import { ChevronRight, Mail, Phone, RefreshCw, UserPlus } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentsList">;

type SortKey = "name" | "recent";
type StatusKey = "active" | "archived";

function formatLicenseType(type: string | null) {
  if (!type) return "-";
  if (type === "learner") return "Learner";
  if (type === "restricted") return "Restricted";
  if (type === "full") return "Full";
  return type;
}

function licenseTypeLetter(type: string | null) {
  if (type === "learner") return "L";
  if (type === "restricted") return "R";
  if (type === "full") return "F";
  return "-";
}

function licenseTypeBadgeClasses(type: string | null) {
  if (type === "learner") {
    return {
      wrapper: "border-blue-500/30 bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-400/15",
      text: "text-blue-700 dark:text-blue-300",
    };
  }
  if (type === "restricted") {
    return {
      wrapper: "border-amber-500/30 bg-amber-500/15 dark:border-amber-400/30 dark:bg-amber-400/15",
      text: "text-amber-800 dark:text-amber-200",
    };
  }
  if (type === "full") {
    return {
      wrapper:
        "border-emerald-600/30 bg-emerald-600/15 dark:border-emerald-500/30 dark:bg-emerald-500/15",
      text: "text-emerald-800 dark:text-emerald-200",
    };
  }

  return {
    wrapper: "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
    text: "text-muted dark:text-mutedDark",
  };
}

function LicenseTypeCircle({ type }: { type: string | null }) {
  const classes = licenseTypeBadgeClasses(type);
  return (
    <View className={cn("h-8 w-8 items-center justify-center rounded-full border", classes.wrapper)}>
      <AppText className={cn("text-xs font-semibold", classes.text)} variant="caption">
        {licenseTypeLetter(type)}
      </AppText>
    </View>
  );
}

function ContactLine({
  icon: Icon,
  text,
  iconColor,
}: {
  icon: typeof Mail;
  text: string;
  iconColor: string;
}) {
  if (!text) return null;
  return (
    <View className="flex-row items-center gap-2">
      <Icon size={14} color={iconColor} />
      <AppText numberOfLines={1} variant="caption">
        {text}
      </AppText>
    </View>
  );
}

export function StudentsListScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();
  const isCompact = Math.min(width, height) < 600;
  const isTabletLandscape = !isCompact && width > height;
  const { colorScheme } = useColorScheme();
  const iconMuted = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const [status, setStatus] = useState<StatusKey>("active");
  const archived = status === "archived";
  const query = useStudentsQuery({ archived });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("name");

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    let data = query.data ?? [];

    if (q) {
      data = data.filter((student) => {
        const haystack = [
          student.first_name,
          student.last_name,
          student.email ?? "",
          student.phone ?? "",
          student.license_number ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    const sorted = [...data];
    sorted.sort((a, b) => {
      if (sort === "recent") {
        const aTime = a.updated_at ? dayjs(a.updated_at).valueOf() : 0;
        const bTime = b.updated_at ? dayjs(b.updated_at).valueOf() : 0;
        return bTime - aTime;
      }

      const last = (a.last_name ?? "").localeCompare(b.last_name ?? "");
      if (last !== 0) return last;
      return (a.first_name ?? "").localeCompare(b.first_name ?? "");
    });

    return sorted;
  }, [query.data, search, sort]);

  return (
    <Screen scroll className={cn(isTabletLandscape && "max-w-[1100px]")}>
      <AppStack gap="lg">
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View className="min-w-56 flex-1">
            <AppText variant="title">Students</AppText>
            <AppText className="mt-1" variant="caption">
              {archived ? "Archived students" : "Active students"} - {rows.length} shown
            </AppText>
          </View>

          <AppButton
            width="auto"
            label="New student"
            icon={UserPlus}
            onPress={() => navigation.navigate("StudentCreate")}
          />
        </View>

        <AppCard className="gap-4">
          <View className={cn("flex-row flex-wrap gap-3", !isCompact && "items-end")}>
            <View className={cn("flex-1", !isCompact && "min-w-80")}>
              <AppInput
                label="Search"
                autoCapitalize="none"
                value={search}
                onChangeText={setSearch}
                placeholder="Name, phone, email, licence"
              />
            </View>

            <View className={cn(isCompact ? "w-full" : "w-56")}>
              <AppText variant="label">Status</AppText>
              <AppSegmentedControl<StatusKey>
                className="mt-2"
                value={status}
                onChange={(next) => setStatus(next)}
                options={[
                  { value: "active", label: "Active" },
                  { value: "archived", label: "Archived" },
                ]}
              />
            </View>

            <View className={cn(isCompact ? "w-full" : "w-56")}>
              <AppText variant="label">Sort</AppText>
              <AppSegmentedControl<SortKey>
                className="mt-2"
                value={sort}
                onChange={(next) => setSort(next)}
                options={[
                  { value: "name", label: "Name" },
                  { value: "recent", label: "Recent" },
                ]}
              />
            </View>

            <AppButton
              width="auto"
              variant="secondary"
              label={query.isFetching ? "Refreshing..." : "Refresh"}
              icon={RefreshCw}
              disabled={query.isFetching}
              onPress={() => query.refetch()}
            />
          </View>
        </AppCard>

        {query.isPending ? (
          <View className={cn("items-center justify-center py-10", theme.text.base)}>
            <ActivityIndicator />
            <AppText className="mt-3 text-center" variant="body">
              Loading students...
            </AppText>
          </View>
        ) : query.isError ? (
          <AppStack gap="md">
            <AppCard className="gap-2">
              <AppText variant="heading">Couldn&apos;t load students</AppText>
              <AppText variant="body">{toErrorMessage(query.error)}</AppText>
            </AppCard>
            <AppButton width="auto" label="Retry" icon={RefreshCw} onPress={() => query.refetch()} />
          </AppStack>
        ) : rows.length === 0 ? (
          <AppCard className="gap-2">
            <AppText variant="heading">No students</AppText>
            <AppText variant="body">
              {archived
                ? "No archived students yet."
                : "Create your first student to start scheduling lessons later."}
            </AppText>
          </AppCard>
        ) : (
          <AppCard className="overflow-hidden p-0">
            {!isCompact ? (
              <View className="flex-row border-b border-border bg-background px-4 py-3 dark:border-borderDark dark:bg-backgroundDark">
                <AppText className="flex-[5]" variant="label">
                  Student
                </AppText>
                <View className="flex-[3] flex-row items-center gap-2">
                  <Phone size={14} color={iconMuted} />
                  <AppText variant="label">Phone</AppText>
                </View>
                <AppText className="flex-[2] text-right" variant="label">
                  Licence
                </AppText>
              </View>
            ) : null}

            {isCompact ? (
              <View className="gap-2 px-2 py-2">
                {rows.map((student) => {
                  const fullName = `${student.first_name} ${student.last_name}`.trim() || "Student";
                  const email = student.email ?? "";
                  const phone = student.phone ?? "";
                  const licenseType = student.license_type;
                  const rowBase = "border-border bg-card dark:border-borderDark dark:bg-cardDark";

                  return (
                    <Pressable
                      key={student.id}
                      onPress={() => navigation.navigate("StudentDetail", { studentId: student.id })}
                      className={`rounded-2xl border p-4 ${rowBase}`}
                    >
                      <View className="gap-3">
                        <View className="flex-row items-start justify-between gap-3">
                          <View className="flex-1 gap-2">
                            <AppText numberOfLines={1} variant="heading" className="text-base">
                              {fullName}
                            </AppText>
                            <ContactLine icon={Mail} text={email} iconColor={iconMuted} />
                          </View>
                          <View className="flex-row items-center gap-2">
                            <LicenseTypeCircle type={licenseType} />
                            <ChevronRight size={18} color={iconMuted} />
                          </View>
                        </View>

                        {phone ? <AppText variant="caption">Phone: {phone}</AppText> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View className="py-2">
                {rows.map((student) => {
                  const fullName = `${student.first_name} ${student.last_name}`.trim() || "Student";
                  const email = student.email ?? "";
                  const phone = student.phone ?? "";
                  const licenseType = student.license_type;
                  const rowBase = "border-border bg-card dark:border-borderDark dark:bg-cardDark";

                  return (
                    <Pressable
                      key={student.id}
                      onPress={() => navigation.navigate("StudentDetail", { studentId: student.id })}
                      className={`flex-row items-center border-b px-4 py-3 ${rowBase}`}
                    >
                      <View className="flex-[5] pr-3">
                        <AppText numberOfLines={1} variant="heading">
                          {fullName}
                        </AppText>
                        <View className="mt-1">
                          <ContactLine icon={Mail} text={email || "-"} iconColor={iconMuted} />
                        </View>
                      </View>

                      <View className="flex-[3] pr-3">
                        <AppText numberOfLines={1} variant="caption">
                          {phone || "-"}
                        </AppText>
                      </View>

                      <View className="flex-[2] flex-row items-center justify-end gap-2">
                        <AppText variant="caption">{formatLicenseType(licenseType)}</AppText>
                        <LicenseTypeCircle type={licenseType} />
                        <ChevronRight size={18} color={iconMuted} />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </AppCard>
        )}
      </AppStack>
    </Screen>
  );
}
