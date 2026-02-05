import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import { useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { ChevronRight, RefreshCw, UserPlus } from "lucide-react-native";
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

function initials(firstName: string, lastName: string) {
  const first = firstName.trim().slice(0, 1).toUpperCase();
  const last = lastName.trim().slice(0, 1).toUpperCase();
  return `${first}${last}`.trim() || "S";
}

function formatLicenseType(type: string | null) {
  if (!type) return "—";
  if (type === "learner") return "Learner";
  if (type === "restricted") return "Restricted";
  if (type === "full") return "Full";
  return type;
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
              {archived ? "Archived students" : "Active students"} • {rows.length} shown
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
              <AppText variant="heading">Couldn't load students</AppText>
              <AppText variant="body">{toErrorMessage(query.error)}</AppText>
            </AppCard>
            <AppButton label="Retry" icon={RefreshCw} onPress={() => query.refetch()} />
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
          <AppCard className={cn("overflow-hidden p-0", !isCompact && "flex-1")}>
            {!isCompact ? (
              <View className="flex-row border-b border-border bg-background px-4 py-3 dark:border-borderDark dark:bg-backgroundDark">
                <AppText className="flex-[3]" variant="label">
                  Student
                </AppText>
                <AppText className="flex-[2]" variant="label">
                  Contact
                </AppText>
                <AppText className="flex-[2]" variant="label">
                  Licence
                </AppText>
                <AppText className="w-10 text-right" variant="label">
                  {" "}
                </AppText>
              </View>
            ) : null}

            <ScrollView
              className={cn(!isCompact && "flex-1")}
              keyboardShouldPersistTaps="handled"
              contentContainerClassName={cn("py-2", isCompact && "gap-2 px-2 pb-2")}
            >
              {rows.map((student) => {
                const fullName = `${student.first_name} ${student.last_name}`.trim();
                const contact = [student.phone, student.email].filter(Boolean).join(" • ");
                const license = [
                  formatLicenseType(student.license_type),
                  student.license_number ? `#${student.license_number}` : null,
                ]
                  .filter(Boolean)
                  .join(" ");

                const rowBase =
                  "border-border dark:border-borderDark bg-card dark:bg-cardDark";

                return (
                  <Pressable
                    key={student.id}
                    onPress={() => navigation.navigate("StudentDetail", { studentId: student.id })}
                    className={cn(
                      isCompact
                        ? `rounded-2xl border p-4 ${rowBase}`
                        : `flex-row items-center border-b px-4 py-3 ${rowBase}`,
                    )}
                  >
                    <View className={cn(isCompact ? "flex-row items-center gap-3" : "flex-[3] flex-row items-center gap-3")}>
                      <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-background dark:border-borderDark dark:bg-backgroundDark">
                        <AppText className="text-primary dark:text-primaryDark" variant="label">
                          {initials(student.first_name, student.last_name)}
                        </AppText>
                      </View>
                      <View className={cn(isCompact ? "flex-1" : "flex-1")}>
                        <AppText numberOfLines={1} variant="heading" className={cn(isCompact && "text-base")}>
                          {fullName || "Student"}
                        </AppText>
                        {student.address ? (
                          <AppText numberOfLines={1} variant="caption">
                            {student.address}
                          </AppText>
                        ) : null}
                      </View>
                    </View>

                    {isCompact ? (
                      <>
                        {contact ? (
                          <AppText className="mt-2" variant="caption">
                            {contact}
                          </AppText>
                        ) : null}
                        <View className="mt-2 flex-row items-center justify-between gap-3">
                          <AppText variant="caption">Licence: {license || "—"}</AppText>
                          <ChevronRight size={18} color={iconMuted} />
                        </View>
                      </>
                    ) : (
                      <>
                        <View className="flex-[2] pr-3">
                          <AppText numberOfLines={1} variant="caption">
                            {contact || "—"}
                          </AppText>
                        </View>
                        <View className="flex-[2] pr-3">
                          <AppText numberOfLines={1} variant="caption">
                            {license || "—"}
                          </AppText>
                        </View>
                        <View className="w-10 items-end">
                          <ChevronRight size={18} color={iconMuted} />
                        </View>
                      </>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </AppCard>
        )}
      </AppStack>
    </Screen>
  );
}
