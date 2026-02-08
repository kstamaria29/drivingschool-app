import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { ChevronDown, ChevronUp, User } from "lucide-react-native";
import { useColorScheme } from "nativewind";

import { AppInput } from "../../components/AppInput";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import type { Student } from "../../features/students/api";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";

type Props = {
  students: Student[];
  selectedStudentId: string | null;
  currentUserId: string;
  onSelectStudent: (student: Student) => void;
  disabled?: boolean;
  error?: string;
};

const MAX_VISIBLE_STUDENT_ROWS = 6;
const STUDENT_ROW_HEIGHT = 52;

function fullNameOf(student: Student) {
  return `${student.first_name} ${student.last_name}`.trim() || "Student";
}

function sortStudentsWithOwnFirst(students: Student[], currentUserId: string) {
  return [...students].sort((a, b) => {
    const aRank = a.assigned_instructor_id === currentUserId ? 0 : 1;
    const bRank = b.assigned_instructor_id === currentUserId ? 0 : 1;
    if (aRank !== bRank) return aRank - bRank;

    const aLast = (a.last_name ?? "").trim();
    const bLast = (b.last_name ?? "").trim();
    const byLast = aLast.localeCompare(bLast, undefined, { sensitivity: "base" });
    if (byLast !== 0) return byLast;

    return (a.first_name ?? "").trim().localeCompare((b.first_name ?? "").trim(), undefined, {
      sensitivity: "base",
    });
  });
}

export function AssessmentStudentDropdown({
  students,
  selectedStudentId,
  currentUserId,
  onSelectStudent,
  disabled = false,
  error,
}: Props) {
  const { colorScheme } = useColorScheme();
  const [open, setOpen] = useState(() => !selectedStudentId);
  const [search, setSearch] = useState("");

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [selectedStudentId, students],
  );

  const sortedStudents = useMemo(
    () => sortStudentsWithOwnFirst(students, currentUserId),
    [currentUserId, students],
  );

  const filteredStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return sortedStudents;
    return sortedStudents.filter((student) => {
      const haystack = [
        student.first_name,
        student.last_name,
        student.email ?? "",
        student.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [search, sortedStudents]);

  const ownStudents = useMemo(
    () => filteredStudents.filter((student) => student.assigned_instructor_id === currentUserId),
    [currentUserId, filteredStudents],
  );

  const otherStudents = useMemo(
    () => filteredStudents.filter((student) => student.assigned_instructor_id !== currentUserId),
    [currentUserId, filteredStudents],
  );

  const iconColor = colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;
  const chevronColor = colorScheme === "dark" ? theme.colors.foregroundDark : theme.colors.foregroundLight;

  function onSelect(student: Student) {
    setOpen(false);
    setSearch("");
    onSelectStudent(student);
  }

  return (
    <AppStack gap="sm">
      {error ? <AppText variant="error">{error}</AppText> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={selectedStudent ? `Selected student ${fullNameOf(selectedStudent)}` : "Select student"}
        disabled={disabled}
        className={cn(
          "rounded-xl border border-border bg-background px-3 py-3 dark:border-borderDark dark:bg-backgroundDark",
          disabled && "opacity-60",
        )}
        onPress={() => setOpen((value) => !value)}
      >
        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-1">
            <AppText variant="label">Select student</AppText>
            <AppText className="mt-1" variant="body">
              {selectedStudent ? fullNameOf(selectedStudent) : "Choose from the list"}
            </AppText>
          </View>
          {open ? (
            <ChevronUp size={18} color={chevronColor} />
          ) : (
            <ChevronDown size={18} color={chevronColor} />
          )}
        </View>
      </Pressable>

      {open ? (
        <View className="rounded-xl border border-border bg-card p-3 dark:border-borderDark dark:bg-cardDark">
          <AppInput
            label="Search students"
            autoCapitalize="none"
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
            placeholder="Name, email, or phone"
          />

          {filteredStudents.length === 0 ? (
            <AppText className="mt-3" variant="caption">
              No students match this search.
            </AppText>
          ) : (
            <ScrollView
              className="mt-3"
              style={{ maxHeight: MAX_VISIBLE_STUDENT_ROWS * STUDENT_ROW_HEIGHT }}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              <AppStack gap="sm">
                <View className="gap-1">
                  <AppText variant="label">Your students</AppText>
                  {ownStudents.length === 0 ? (
                    <AppText variant="caption">No matching students assigned to you.</AppText>
                  ) : (
                    ownStudents.map((student) => {
                      const isSelected = student.id === selectedStudentId;
                      return (
                        <Pressable
                          key={student.id}
                          accessibilityRole="button"
                          className={cn(
                            "mt-1 flex-row items-center justify-between rounded-lg border px-3 py-3",
                            isSelected
                              ? "border-primary bg-primary/10 dark:border-primaryDark dark:bg-primaryDark/20"
                              : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
                          )}
                          onPress={() => onSelect(student)}
                        >
                          <AppText variant="body">{fullNameOf(student)}</AppText>
                          <User size={16} color={iconColor} />
                        </Pressable>
                      );
                    })
                  )}
                </View>

                {otherStudents.length > 0 ? (
                  <View className="gap-1">
                    <AppText variant="label">Other instructors&apos; students</AppText>
                    {otherStudents.map((student) => {
                      const isSelected = student.id === selectedStudentId;
                      return (
                        <Pressable
                          key={student.id}
                          accessibilityRole="button"
                          className={cn(
                            "mt-1 flex-row items-center justify-between rounded-lg border px-3 py-3",
                            isSelected
                              ? "border-primary bg-primary/10 dark:border-primaryDark dark:bg-primaryDark/20"
                              : "border-border bg-background dark:border-borderDark dark:bg-backgroundDark",
                          )}
                          onPress={() => onSelect(student)}
                        >
                          <AppText variant="body">{fullNameOf(student)}</AppText>
                          <User size={16} color={iconColor} />
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </AppStack>
            </ScrollView>
          )}
        </View>
      ) : null}
    </AppStack>
  );
}
