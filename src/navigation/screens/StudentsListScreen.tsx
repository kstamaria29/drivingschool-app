import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import dayjs from "dayjs";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import {
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  UserPlus,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";

import {
  CenteredLoadingState,
  EmptyStateCard,
  ErrorStateCard,
} from "../../components/AsyncState";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { Screen } from "../../components/Screen";
import { useCurrentUser } from "../../features/auth/current-user";
import { useOrganizationProfilesQuery } from "../../features/profiles/queries";
import type { Student } from "../../features/students/api";
import { normalizeStudentOrganization } from "../../features/students/constants";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";
import { getProfileFullName } from "../../utils/profileName";

import type { StudentsStackParamList } from "../StudentsStackNavigator";

type Props = NativeStackScreenProps<StudentsStackParamList, "StudentsList">;

type SortKey = "name" | "recent";
type StatusKey = "active" | "archived";
type InstructorViewState = "hide" | "show";
type OrganizationFilterState = "off" | "on";

type StudentSection = {
  key: string;
  title: string;
  students: Student[];
  emptyMessage?: string;
};

const STUDENTS_PAGE_SIZE = 10;
const ORGANIZATION_FILTER_SHOW_ALL = "Show all";
const ORGANIZATION_FILTER_OTHERS = "Other's (not listed)";
const ORGANIZATION_PRIORITY_ORDER = [
  "Renaissance",
  "Lifeskill",
  "UMMA Trust",
] as const;
const privateOrganizationLowercase = "private";

function isPrivateOrganization(value: string) {
  return (
    normalizeStudentOrganization(value).toLowerCase() ===
    privateOrganizationLowercase
  );
}

function isPriorityOrganization(value: string) {
  const normalized = normalizeStudentOrganization(value).toLowerCase();
  return ORGANIZATION_PRIORITY_ORDER.some(
    (organization) => organization.toLowerCase() === normalized,
  );
}

function organizationShowAllRank(value: string) {
  const normalized = normalizeStudentOrganization(value).toLowerCase();
  if (normalized === "renaissance") return 1;
  if (normalized === "lifeskill") return 2;
  if (normalized === "umma trust") return 3;
  return 0;
}

function paginateSections(
  sections: StudentSection[],
  page: number,
  pageSize: number,
): StudentSection[] {
  const pageStart = Math.max(0, (page - 1) * pageSize);
  const pageEnd = pageStart + pageSize;
  const paginated: StudentSection[] = [];

  let runningIndex = 0;
  for (const section of sections) {
    const sectionStart = runningIndex;
    const sectionEnd = runningIndex + section.students.length;
    runningIndex = sectionEnd;

    const overlapStart = Math.max(pageStart, sectionStart);
    const overlapEnd = Math.min(pageEnd, sectionEnd);
    if (overlapStart >= overlapEnd) continue;

    const startInSection = overlapStart - sectionStart;
    const endInSection = overlapEnd - sectionStart;
    paginated.push({
      ...section,
      students: section.students.slice(startInSection, endInSection),
    });
  }

  return paginated;
}

function formatOrganizationName(value: string | null) {
  const normalized = normalizeStudentOrganization(value ?? "");
  if (!normalized) return "-";
  return normalized;
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
      wrapper:
        "border-blue-500/30 bg-blue-500/15 dark:border-blue-400/30 dark:bg-blue-400/15",
      text: "text-blue-700 dark:text-blue-300",
    };
  }
  if (type === "restricted") {
    return {
      wrapper:
        "border-green-600/30 bg-green-600/15 dark:border-green-500/30 dark:bg-green-500/15",
      text: "text-green-800 dark:text-green-200",
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
    wrapper:
      "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
    text: "text-muted dark:text-mutedDark",
  };
}

function LicenseTypeCircle({ type }: { type: string | null }) {
  const classes = licenseTypeBadgeClasses(type);
  return (
    <View
      className={cn(
        "h-8 w-8 items-center justify-center rounded-full border",
        classes.wrapper,
      )}
    >
      <AppText
        className={cn("text-sm font-bold", classes.text)}
        variant="caption"
      >
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

function getMemberName(profile: {
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}) {
  return getProfileFullName(profile) || profile.display_name || "Member";
}

function StudentsSectionCard({
  title,
  students,
  emptyMessage,
  isCompact,
  iconMuted,
  onPressStudent,
  headerRight,
}: {
  title: string;
  students: Student[];
  emptyMessage: string;
  isCompact: boolean;
  iconMuted: string;
  onPressStudent: (studentId: string) => void;
  headerRight?: ReactNode;
}) {
  return (
    <AppCard className="overflow-hidden p-0">
      <View className="flex-row items-center justify-between gap-3 border-b border-border px-4 py-3 dark:border-borderDark">
        <AppText className="flex-1" variant="heading">
          {title}
        </AppText>
        {headerRight}
      </View>

      {students.length === 0 ? (
        <View className="px-4 py-4">
          <AppText variant="caption">{emptyMessage}</AppText>
        </View>
      ) : isCompact ? (
        <View className="gap-2 px-2 py-2">
          {students.map((student) => {
            const fullName =
              `${student.first_name} ${student.last_name}`.trim() || "Student";
            const email = student.email ?? "";
            const phone = student.phone ?? "";
            const licenseType = student.license_type;
            const rowBase =
              "border-border bg-card dark:border-borderDark dark:bg-cardDark";

            return (
              <Pressable
                key={student.id}
                onPress={() => onPressStudent(student.id)}
                className={`rounded-2xl border p-4 ${rowBase}`}
              >
                <View className="gap-3">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1 gap-2">
                      <AppText
                        numberOfLines={1}
                        variant="heading"
                        className="text-base"
                      >
                        {fullName}
                      </AppText>
                      <ContactLine
                        icon={Mail}
                        text={email}
                        iconColor={iconMuted}
                      />
                    </View>
                    <View className="flex-row items-center gap-2">
                      <LicenseTypeCircle type={licenseType} />
                      <ChevronRight size={18} color={iconMuted} />
                    </View>
                  </View>

                  {phone ? (
                    <AppText variant="caption">Phone: {phone}</AppText>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <>
          <View className="flex-row border-b border-border bg-background px-4 py-3 dark:border-borderDark dark:bg-backgroundDark">
            <AppText className="flex-[5]" variant="label">
              Student
            </AppText>
            <View className="flex-[3] flex-row items-center gap-2">
              <Phone size={14} color={iconMuted} />
              <AppText variant="label">Phone</AppText>
            </View>
            <AppText className="flex-[2] text-right" variant="label">
              Organization
            </AppText>
          </View>

          <View className="py-2">
            {students.map((student) => {
              const fullName =
                `${student.first_name} ${student.last_name}`.trim() ||
                "Student";
              const email = student.email ?? "";
              const phone = student.phone ?? "";
              const licenseType = student.license_type;
              const organizationName = formatOrganizationName(
                student.organization_name,
              );
              const rowBase =
                "border-border bg-card dark:border-borderDark dark:bg-cardDark";

              return (
                <Pressable
                  key={student.id}
                  onPress={() => onPressStudent(student.id)}
                  className={`flex-row items-center border-b px-4 py-3 ${rowBase}`}
                >
                  <View className="flex-[5] pr-3">
                    <AppText numberOfLines={1} variant="heading">
                      {fullName}
                    </AppText>
                    <View className="mt-1">
                      <ContactLine
                        icon={Mail}
                        text={email || "-"}
                        iconColor={iconMuted}
                      />
                    </View>
                  </View>

                  <View className="flex-[3] pr-3">
                    <AppText numberOfLines={1} variant="caption">
                      {phone || "-"}
                    </AppText>
                  </View>

                  <View className="flex-[2] flex-row items-center justify-end gap-2">
                    <AppText
                      className="text-right"
                      numberOfLines={1}
                      variant="caption"
                    >
                      {organizationName}
                    </AppText>
                    <LicenseTypeCircle type={licenseType} />
                    <ChevronRight size={18} color={iconMuted} />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      )}
    </AppCard>
  );
}

function StudentsSectionList({
  sections,
  isCompact,
  iconMuted,
  onPressStudent,
}: {
  sections: StudentSection[];
  isCompact: boolean;
  iconMuted: string;
  onPressStudent: (studentId: string) => void;
}) {
  return (
    <AppStack gap="md">
      {sections.map((section) => (
        <StudentsSectionCard
          key={section.key}
          title={section.title}
          students={section.students}
          emptyMessage={section.emptyMessage ?? "No students in this group."}
          isCompact={isCompact}
          iconMuted={iconMuted}
          onPressStudent={onPressStudent}
        />
      ))}
    </AppStack>
  );
}

export function StudentsListScreen({ navigation }: Props) {
  const { profile } = useCurrentUser();
  const { width, height } = useWindowDimensions();
  const isCompact = Math.min(width, height) < 600;
  const isTabletLandscape = !isCompact && width > height;
  const { colorScheme } = useColorScheme();
  const iconMuted =
    colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  const isOwner = profile.role === "owner";
  const isAdmin = profile.role === "admin";
  const orgProfilesQuery = useOrganizationProfilesQuery(isOwner || isAdmin);

  const hasInstructorRole = useMemo(() => {
    return (orgProfilesQuery.data ?? []).some((p) => p.role === "instructor");
  }, [orgProfilesQuery.data]);

  const [status, setStatus] = useState<StatusKey>("active");
  const archived = status === "archived";
  const query = useStudentsQuery({ archived });

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("recent");
  const [instructorView, setInstructorView] =
    useState<InstructorViewState>("hide");
  const [organizationFilter, setOrganizationFilter] =
    useState<OrganizationFilterState>("off");
  const [selectedOrganization, setSelectedOrganization] = useState<string>(
    ORGANIZATION_FILTER_SHOW_ALL,
  );
  const [page, setPage] = useState(1);
  const showInstructorStudents = instructorView === "show";

  useFocusEffect(
    useCallback(() => {
      // Always reset students screen controls when returning to this screen.
      setSearch("");
      setStatus("active");
      setSort("recent");
      setInstructorView("hide");
      setOrganizationFilter("off");
      setSelectedOrganization(ORGANIZATION_FILTER_SHOW_ALL);
      setPage(1);
    }, []),
  );

  const organizationOptions = useMemo(
    () => [
      ORGANIZATION_FILTER_SHOW_ALL,
      ...ORGANIZATION_PRIORITY_ORDER,
      ORGANIZATION_FILTER_OTHERS,
    ],
    [],
  );

  useEffect(() => {
    if (organizationFilter !== "on") return;

    setSelectedOrganization((current) => {
      const normalizedCurrent = normalizeStudentOrganization(current);
      if (
        normalizedCurrent.length > 0 &&
        organizationOptions.some(
          (option) => option.toLowerCase() === normalizedCurrent.toLowerCase(),
        )
      ) {
        return normalizedCurrent;
      }
      return organizationOptions[0] ?? ORGANIZATION_FILTER_SHOW_ALL;
    });
  }, [organizationFilter, organizationOptions]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const organizationFilterValue =
      organizationFilter === "on"
        ? normalizeStudentOrganization(selectedOrganization)
        : "";
    let data = query.data ?? [];

    if (organizationFilterValue) {
      const selectedOrganizationValue = organizationFilterValue.toLowerCase();

      if (
        selectedOrganizationValue === ORGANIZATION_FILTER_SHOW_ALL.toLowerCase()
      ) {
        data = data.filter(
          (student) => !isPrivateOrganization(student.organization_name ?? ""),
        );
      } else if (
        selectedOrganizationValue === ORGANIZATION_FILTER_OTHERS.toLowerCase()
      ) {
        data = data.filter((student) => {
          const organizationName = normalizeStudentOrganization(
            student.organization_name ?? "",
          );
          return (
            organizationName.length > 0 &&
            !isPrivateOrganization(organizationName) &&
            !isPriorityOrganization(organizationName)
          );
        });
      } else {
        data = data.filter((student) => {
          const studentOrganization = normalizeStudentOrganization(
            student.organization_name ?? "",
          ).toLowerCase();
          return studentOrganization === selectedOrganizationValue;
        });
      }
    }

    if (q) {
      data = data.filter((student) => {
        const haystack = [
          student.first_name,
          student.last_name,
          student.organization_name ?? "",
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
      if (
        organizationFilterValue.toLowerCase() ===
        ORGANIZATION_FILTER_SHOW_ALL.toLowerCase()
      ) {
        const organizationRankDelta =
          organizationShowAllRank(a.organization_name ?? "") -
          organizationShowAllRank(b.organization_name ?? "");
        if (organizationRankDelta !== 0) return organizationRankDelta;
      }

      if (sort === "recent") {
        const aTime = a.updated_at ? dayjs(a.updated_at).valueOf() : 0;
        const bTime = b.updated_at ? dayjs(b.updated_at).valueOf() : 0;
        return bTime - aTime;
      }

      const first = (a.first_name ?? "").localeCompare(b.first_name ?? "");
      if (first !== 0) return first;
      return (a.last_name ?? "").localeCompare(b.last_name ?? "");
    });

    return sorted;
  }, [organizationFilter, query.data, search, selectedOrganization, sort]);

  const ownerSelfStudents = useMemo(
    () =>
      isOwner
        ? rows.filter(
            (student) => student.assigned_instructor_id === profile.id,
          )
        : [],
    [isOwner, profile.id, rows],
  );

  const adminSelfStudents = useMemo(
    () =>
      isAdmin
        ? rows.filter(
            (student) => student.assigned_instructor_id === profile.id,
          )
        : [],
    [isAdmin, profile.id, rows],
  );

  const ownerRecord = useMemo(
    () =>
      (orgProfilesQuery.data ?? []).find(
        (orgProfile) => orgProfile.role === "owner",
      ) ?? null,
    [orgProfilesQuery.data],
  );

  const instructorRecords = useMemo(
    () =>
      (orgProfilesQuery.data ?? []).filter(
        (orgProfile) => orgProfile.role === "instructor",
      ),
    [orgProfilesQuery.data],
  );

  const ownerBaseSection = useMemo<StudentSection>(
    () => ({
      key: "owner-self",
      title: `Owner: ${getMemberName(profile)}`,
      students: ownerSelfStudents,
      emptyMessage: archived
        ? "No archived students assigned to the owner."
        : "No active students assigned to the owner.",
    }),
    [archived, ownerSelfStudents, profile],
  );

  const ownerInstructorSections = useMemo<StudentSection[]>(() => {
    if (
      !isOwner ||
      !showInstructorStudents ||
      orgProfilesQuery.isPending ||
      orgProfilesQuery.isError
    ) {
      return [];
    }

    return instructorRecords
      .map((instructor) => {
        const students = rows.filter(
          (student) => student.assigned_instructor_id === instructor.id,
        );
        return {
          key: `owner-instructor-${instructor.id}`,
          title: `Instructor: ${getMemberName(instructor)}`,
          students,
          emptyMessage: archived
            ? "No archived students assigned to this instructor."
            : "No active students assigned to this instructor.",
        };
      })
      .filter((section) => section.students.length > 0);
  }, [
    archived,
    instructorRecords,
    isOwner,
    orgProfilesQuery.isError,
    orgProfilesQuery.isPending,
    rows,
    showInstructorStudents,
  ]);

  const shouldShowAdminFallback = isAdmin && adminSelfStudents.length === 0;
  const adminFallbackSections = useMemo<StudentSection[]>(() => {
    if (
      !shouldShowAdminFallback ||
      orgProfilesQuery.isPending ||
      orgProfilesQuery.isError
    ) {
      return [];
    }

    const sections: StudentSection[] = [];
    if (ownerRecord) {
      sections.push({
        key: `admin-owner-${ownerRecord.id}`,
        title: `Owner: ${getMemberName(ownerRecord)}`,
        students: rows.filter(
          (student) => student.assigned_instructor_id === ownerRecord.id,
        ),
        emptyMessage: archived
          ? "No archived students assigned to the owner."
          : "No active students assigned to the owner.",
      });
    }

    const instructorSections = instructorRecords
      .map((instructor) => {
        const students = rows.filter(
          (student) => student.assigned_instructor_id === instructor.id,
        );
        return {
          key: `admin-instructor-${instructor.id}`,
          title: `Instructor: ${getMemberName(instructor)}`,
          students,
          emptyMessage: archived
            ? "No archived students assigned to this instructor."
            : "No active students assigned to this instructor.",
        };
      })
      .filter((section) => section.students.length > 0);

    return [...sections, ...instructorSections];
  }, [
    archived,
    instructorRecords,
    orgProfilesQuery.isError,
    orgProfilesQuery.isPending,
    ownerRecord,
    rows,
    shouldShowAdminFallback,
  ]);

  const shownCount = useMemo(() => {
    if (isOwner) {
      const instructorCount = showInstructorStudents
        ? ownerInstructorSections.reduce(
            (total, section) => total + section.students.length,
            0,
          )
        : 0;
      return ownerBaseSection.students.length + instructorCount;
    }

    if (shouldShowAdminFallback) {
      return adminFallbackSections.reduce(
        (total, section) => total + section.students.length,
        0,
      );
    }

    return rows.length;
  }, [
    adminFallbackSections,
    isOwner,
    ownerBaseSection.students.length,
    ownerInstructorSections,
    rows.length,
    shouldShowAdminFallback,
    showInstructorStudents,
  ]);

  const allDisplaySections = useMemo<StudentSection[]>(() => {
    if (isOwner) {
      return [
        ownerBaseSection,
        ...(showInstructorStudents ? ownerInstructorSections : []),
      ];
    }

    if (shouldShowAdminFallback) {
      return adminFallbackSections;
    }

    return [
      {
        key: "students-default",
        title: "Students",
        students: rows,
        emptyMessage: archived
          ? "No archived students yet."
          : "No active students yet.",
      },
    ];
  }, [
    adminFallbackSections,
    archived,
    isOwner,
    ownerBaseSection,
    ownerInstructorSections,
    rows,
    shouldShowAdminFallback,
    showInstructorStudents,
  ]);

  const totalPages = Math.max(1, Math.ceil(shownCount / STUDENTS_PAGE_SIZE));
  const canPaginate = shownCount > 0;

  useEffect(() => {
    setPage(1);
  }, [
    organizationFilter,
    search,
    selectedOrganization,
    sort,
    status,
    instructorView,
  ]);

  useEffect(() => {
    setPage((current) => {
      if (!canPaginate) return 1;
      return Math.min(Math.max(current, 1), totalPages);
    });
  }, [canPaginate, totalPages]);

  const pagedSections = useMemo(
    () => paginateSections(allDisplaySections, page, STUDENTS_PAGE_SIZE),
    [allDisplaySections, page],
  );
  const ownerPageSection = isOwner
    ? (pagedSections.find((section) => section.key === ownerBaseSection.key) ??
      null)
    : null;
  const ownerOtherPageSections = isOwner
    ? pagedSections.filter((section) => section.key !== ownerBaseSection.key)
    : pagedSections;

  const canGoPrev = canPaginate && page > 1;
  const canGoNext = canPaginate && page < totalPages;

  const topPaginationControls = canPaginate ? (
    <View className="flex-row items-center gap-1">
      <AppButton
        label=""
        size="icon"
        width="auto"
        variant="secondary"
        icon={ChevronLeft}
        disabled={!canGoPrev}
        onPress={() => setPage((current) => Math.max(1, current - 1))}
      />
      <AppButton
        label=""
        size="icon"
        width="auto"
        variant="secondary"
        icon={ChevronRight}
        disabled={!canGoNext}
        onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
      />
    </View>
  ) : null;

  const bottomPaginationControls = canPaginate ? (
    <View className="mt-2 flex-row items-center justify-center gap-3">
      <AppButton
        label=""
        size="icon"
        width="auto"
        variant="secondary"
        icon={ChevronLeft}
        disabled={!canGoPrev}
        onPress={() => setPage((current) => Math.max(1, current - 1))}
      />
      <View className="rounded-xl border border-border bg-card px-3 py-2 dark:border-borderDark dark:bg-cardDark">
        <AppText variant="caption">{`Page ${page} / ${totalPages}`}</AppText>
      </View>
      <AppButton
        label=""
        size="icon"
        width="auto"
        variant="secondary"
        icon={ChevronRight}
        disabled={!canGoNext}
        onPress={() => setPage((current) => Math.min(totalPages, current + 1))}
      />
    </View>
  ) : null;

  return (
    <Screen scroll className={cn(isTabletLandscape && "max-w-[1100px]")}>
      <AppStack gap="lg">
        <View className="flex-row flex-wrap items-start justify-between gap-3">
          <View className="min-w-56 flex-1">
            <AppText variant="title">Students</AppText>
            <AppText className="mt-1" variant="caption">
              {archived ? "Archived students" : "Active students"} -{" "}
              {shownCount} shown
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
          <View
            className={cn(
              "flex-row flex-wrap gap-3",
              !isCompact && "items-end",
            )}
          >
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
                  { value: "recent", label: "Recent" },
                  { value: "name", label: "Name" },
                ]}
              />
            </View>

            <View className={cn(isCompact ? "w-full" : "w-56")}>
              <AppText variant="label">By organization</AppText>
              <AppSegmentedControl<OrganizationFilterState>
                className="mt-2"
                value={organizationFilter}
                onChange={setOrganizationFilter}
                options={[
                  { value: "off", label: "Off" },
                  { value: "on", label: "On" },
                ]}
              />
            </View>

            {organizationFilter === "on" ? (
              <View className={cn("w-full", !isCompact && "min-w-80 flex-1")}>
                <AppText variant="label">Organization</AppText>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {organizationOptions.map((option) => (
                    <AppButton
                      key={option}
                      width="auto"
                      label={option}
                      variant={
                        selectedOrganization.toLowerCase() ===
                        option.toLowerCase()
                          ? "primary"
                          : "secondary"
                      }
                      onPress={() => setSelectedOrganization(option)}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <AppButton
              width="auto"
              variant="secondary"
              label=""
              accessibilityLabel="Refresh students"
              icon={RefreshCw}
              disabled={query.isFetching}
              onPress={() => query.refetch()}
            />

            {isOwner && hasInstructorRole ? (
              <View className={cn(isCompact ? "w-full" : "ml-auto w-64")}>
                <AppText variant="label">
                  View other instructor&apos;s students
                </AppText>
                <AppSegmentedControl<InstructorViewState>
                  className="mt-2"
                  value={instructorView}
                  onChange={setInstructorView}
                  options={[
                    { value: "hide", label: "Hide" },
                    { value: "show", label: "Show" },
                  ]}
                />
              </View>
            ) : null}
          </View>
        </AppCard>

        {query.isPending ? (
          <CenteredLoadingState label="Loading students..." />
        ) : query.isError ? (
          <ErrorStateCard
            title="Couldn't load students"
            message={toErrorMessage(query.error)}
            onRetry={() => query.refetch()}
            retryIcon={RefreshCw}
            retryVariant="primary"
          />
        ) : isOwner ? (
          <AppStack gap="md">
            {shownCount === 0 ? (
              <EmptyStateCard
                title="No students"
                message={
                  archived
                    ? "No archived students available for this page."
                    : "No active students available for this page."
                }
              />
            ) : (
              <>
                <StudentsSectionCard
                  title={ownerBaseSection.title}
                  students={ownerPageSection?.students ?? []}
                  emptyMessage={
                    ownerBaseSection.emptyMessage ??
                    "No students in this group."
                  }
                  isCompact={isCompact}
                  iconMuted={iconMuted}
                  headerRight={topPaginationControls}
                  onPressStudent={(studentId) =>
                    navigation.navigate("StudentDetail", { studentId })
                  }
                />
                {ownerOtherPageSections.length > 0 ? (
                  <StudentsSectionList
                    sections={ownerOtherPageSections}
                    isCompact={isCompact}
                    iconMuted={iconMuted}
                    onPressStudent={(studentId) =>
                      navigation.navigate("StudentDetail", { studentId })
                    }
                  />
                ) : null}
              </>
            )}

            {showInstructorStudents ? (
              orgProfilesQuery.isPending ? (
                <CenteredLoadingState
                  label="Loading instructors..."
                  className="py-8"
                />
              ) : orgProfilesQuery.isError ? (
                <ErrorStateCard
                  title="Couldn't load instructors"
                  message={toErrorMessage(orgProfilesQuery.error)}
                  onRetry={() => orgProfilesQuery.refetch()}
                  retryIcon={RefreshCw}
                  retryVariant="primary"
                />
              ) : ownerInstructorSections.length === 0 ? (
                <EmptyStateCard
                  title="Instructor students"
                  message={
                    archived
                      ? "No archived students are assigned to instructors."
                      : "No active students are assigned to instructors."
                  }
                />
              ) : null
            ) : null}

            {bottomPaginationControls}
          </AppStack>
        ) : shouldShowAdminFallback ? (
          orgProfilesQuery.isPending ? (
            <CenteredLoadingState
              label="Loading organization members..."
              className="py-8"
            />
          ) : orgProfilesQuery.isError ? (
            <ErrorStateCard
              title="Couldn't load organization members"
              message={toErrorMessage(orgProfilesQuery.error)}
              onRetry={() => orgProfilesQuery.refetch()}
              retryIcon={RefreshCw}
              retryVariant="primary"
            />
          ) : adminFallbackSections.length === 0 ? (
            <EmptyStateCard
              title="No students"
              message={
                archived
                  ? "No archived students for owner or instructors."
                  : "No active students for owner or instructors."
              }
            />
          ) : (
            <AppStack gap="md">
              <StudentsSectionList
                sections={pagedSections}
                isCompact={isCompact}
                iconMuted={iconMuted}
                onPressStudent={(studentId) =>
                  navigation.navigate("StudentDetail", { studentId })
                }
              />
              {bottomPaginationControls}
            </AppStack>
          )
        ) : rows.length === 0 ? (
          <EmptyStateCard
            title="No students"
            message={
              archived
                ? "No archived students yet."
                : "Create your first student to start scheduling lessons later."
            }
          />
        ) : (
          <AppStack gap="md">
            <StudentsSectionList
              sections={pagedSections}
              isCompact={isCompact}
              iconMuted={iconMuted}
              onPressStudent={(studentId) =>
                navigation.navigate("StudentDetail", { studentId })
              }
            />
            {bottomPaginationControls}
          </AppStack>
        )}
      </AppStack>
    </Screen>
  );
}
