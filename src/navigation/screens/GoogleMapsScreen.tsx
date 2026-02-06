import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import * as Location from "expo-location";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LayoutChangeEvent,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  Polyline as MapPolyline,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import { Camera, MapPin, Plus, RefreshCw, Trash2, User } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppText } from "../../components/AppText";
import { SnapshotAnnotationModal } from "../components/SnapshotAnnotationModal";
import { SnapshotPreviewModal, type SnapshotPreview } from "../components/SnapshotPreviewModal";
import { useCurrentUser } from "../../features/auth/current-user";
import {
  parseSnapshotStrokes,
  parseVectorStrokes,
  serializeSnapshotStrokes,
  serializeVectorStrokes,
  type SnapshotPoint,
  type SnapshotStroke,
  type VectorStroke,
} from "../../features/map-annotations/codec";
import {
  useCreateMapAnnotationMutation,
  useDeleteMapAnnotationMutation,
  useMapAnnotationsQuery,
} from "../../features/map-annotations/queries";
import { createMapPin as createMapPinApi } from "../../features/map-pins/api";
import {
  useCreateMapPinMutation,
  useDeleteMapPinMutation,
  useMapPinsQuery,
} from "../../features/map-pins/queries";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import type { MapsStackParamList } from "../MapsStackNavigator";

type Props = NativeStackScreenProps<MapsStackParamList, "GoogleMapsMain">;

type MapLayer = "standard" | "satellite" | "hybrid";

type SnapshotCanvasSize = {
  width: number;
  height: number;
};

type ParsedVectorAnnotation = {
  id: string;
  title: string;
  strokes: VectorStroke[];
};

const VECTOR_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#ef4444", "#a855f7", "#14b8a6"] as const;
const SNAPSHOT_CAPTURE_SIZE = 1080;
const SNAPSHOT_CAPTURE_QUALITY = 0.65;

const MAP_LAYER_OPTIONS: Array<{ value: MapLayer; label: string }> = [
  { value: "standard", label: "Default" },
  { value: "satellite", label: "Satellite" },
  { value: "hybrid", label: "Hybrid" },
];

const DEFAULT_REGION = {
  latitude: -36.8485,
  longitude: 174.7633,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function createLocalId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

function normalizeSnapshotPoint(x: number, y: number, canvasSize: SnapshotCanvasSize): SnapshotPoint {
  if (canvasSize.width <= 0 || canvasSize.height <= 0) return { x, y };
  return {
    x: clamp(x, 0, canvasSize.width),
    y: clamp(y, 0, canvasSize.height),
  };
}

export function GoogleMapsScreen(_props: Props) {
  const mapRef = useRef<MapView | null>(null);
  const { profile } = useCurrentUser();
  const pinsQuery = useMapPinsQuery({ organizationId: profile.organization_id });
  const studentsQuery = useStudentsQuery({ archived: false });
  const annotationsQuery = useMapAnnotationsQuery({ organizationId: profile.organization_id });
  const createMapPin = useCreateMapPinMutation();
  const deleteMapPin = useDeleteMapPinMutation();
  const createMapAnnotation = useCreateMapAnnotationMutation();
  const deleteMapAnnotation = useDeleteMapAnnotationMutation();

  const [mapLayer, setMapLayer] = useState<MapLayer>("standard");
  const [mapCenter, setMapCenter] = useState<LatLng>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const [draftCoordinate, setDraftCoordinate] = useState<LatLng | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftStudentId, setDraftStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [autopinPending, setAutopinPending] = useState(false);
  const [snapshotCapturePending, setSnapshotCapturePending] = useState(false);

  const [vectorModeEnabled, setVectorModeEnabled] = useState(false);
  const [vectorTitle, setVectorTitle] = useState("");
  const [vectorNotes, setVectorNotes] = useState("");
  const [vectorStrokes, setVectorStrokes] = useState<VectorStroke[]>([]);
  const [activeVectorStroke, setActiveVectorStroke] = useState<LatLng[]>([]);

  const [snapshotEditorVisible, setSnapshotEditorVisible] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [snapshotBase64, setSnapshotBase64] = useState<string | null>(null);
  const [snapshotStrokes, setSnapshotStrokes] = useState<SnapshotStroke[]>([]);
  const [activeSnapshotStroke, setActiveSnapshotStroke] = useState<SnapshotPoint[]>([]);
  const [snapshotCanvasSize, setSnapshotCanvasSize] = useState<SnapshotCanvasSize>({
    width: 0,
    height: 0,
  });

  const [previewSnapshotId, setPreviewSnapshotId] = useState<string | null>(null);
  const [previewCanvasSize, setPreviewCanvasSize] = useState<SnapshotCanvasSize>({
    width: 0,
    height: 0,
  });

  const studentsById = useMemo(
    () => new Map((studentsQuery.data ?? []).map((student) => [student.id, student])),
    [studentsQuery.data],
  );

  const selectedPin = useMemo(
    () => (pinsQuery.data ?? []).find((pin) => pin.id === selectedPinId) ?? null,
    [pinsQuery.data, selectedPinId],
  );

  const studentOptions = useMemo(() => {
    const all = studentsQuery.data ?? [];
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return all.slice(0, 8);
    return all
      .filter((student) => {
        const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
        const address = (student.address ?? "").toLowerCase();
        return fullName.includes(needle) || address.includes(needle);
      })
      .slice(0, 8);
  }, [studentSearch, studentsQuery.data]);

  const vectorAnnotationsForSelectedPin = useMemo((): ParsedVectorAnnotation[] => {
    if (!selectedPinId) return [];
    const all = annotationsQuery.data ?? [];
    return all
      .filter(
        (annotation) =>
          annotation.map_pin_id === selectedPinId && annotation.annotation_type === "anchored_vector",
      )
      .map((annotation) => ({
        id: annotation.id,
        title: annotation.title,
        strokes: parseVectorStrokes(annotation.vector_strokes),
      }))
      .filter((annotation) => annotation.strokes.length > 0);
  }, [annotationsQuery.data, selectedPinId]);

  const snapshotAnnotationsForSelectedPin = useMemo((): SnapshotPreview[] => {
    if (!selectedPinId) return [];
    const all = annotationsQuery.data ?? [];
    return all
      .filter(
        (annotation) => annotation.map_pin_id === selectedPinId && annotation.annotation_type === "snapshot",
      )
      .map((annotation) => {
        if (!annotation.snapshot_image_base64) return null;
        return {
          id: annotation.id,
          title: annotation.title,
          notes: annotation.notes,
          imageBase64: annotation.snapshot_image_base64,
          strokes: parseSnapshotStrokes(annotation.snapshot_strokes),
          width: annotation.snapshot_width ?? SNAPSHOT_CAPTURE_SIZE,
          height: annotation.snapshot_height ?? SNAPSHOT_CAPTURE_SIZE,
          createdAt: annotation.created_at,
        };
      })
      .filter((annotation): annotation is SnapshotPreview => annotation != null);
  }, [annotationsQuery.data, selectedPinId]);

  const previewSnapshot = useMemo(
    () => snapshotAnnotationsForSelectedPin.find((snapshot) => snapshot.id === previewSnapshotId) ?? null,
    [previewSnapshotId, snapshotAnnotationsForSelectedPin],
  );

  function clearDraft() {
    setDraftCoordinate(null);
    setDraftTitle("");
    setDraftNotes("");
    setDraftStudentId(null);
    setStudentSearch("");
  }

  function startDraftAtCoordinate(coordinate: LatLng) {
    if (vectorModeEnabled) return;
    setSelectedPinId(null);
    setDraftCoordinate(coordinate);
  }

  async function saveDraftPin() {
    if (!draftCoordinate) return;

    const linkedStudent = draftStudentId ? studentsById.get(draftStudentId) : null;
    const resolvedInstructorId = linkedStudent?.assigned_instructor_id ?? profile.id;
    const resolvedTitle =
      draftTitle.trim() ||
      (linkedStudent ? `${linkedStudent.first_name} ${linkedStudent.last_name}` : "Map pin");
    const manualNotes = draftNotes.trim();
    const fallbackAddress = linkedStudent?.address?.trim();
    const resolvedNotes = manualNotes || (fallbackAddress ? `Address: ${fallbackAddress}` : null);

    try {
      await createMapPin.mutateAsync({
        organization_id: profile.organization_id,
        instructor_id: resolvedInstructorId,
        student_id: draftStudentId,
        title: resolvedTitle,
        notes: resolvedNotes,
        latitude: draftCoordinate.latitude,
        longitude: draftCoordinate.longitude,
      });
      clearDraft();
    } catch (error) {
      Alert.alert("Couldn't save pin", toErrorMessage(error));
    }
  }

  function confirmDeletePin() {
    if (!selectedPin) return;

    Alert.alert("Delete pin?", "This will remove the selected map pin.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteMapPin
            .mutateAsync({
              mapPinId: selectedPin.id,
              organizationId: selectedPin.organization_id,
            })
            .then(() => {
              setSelectedPinId(null);
            })
            .catch((error) => {
              Alert.alert("Couldn't delete pin", toErrorMessage(error));
            });
        },
      },
    ]);
  }

  function confirmDeleteAnnotation(annotationId: string, annotationTitle: string) {
    Alert.alert("Delete annotation?", `Delete "${annotationTitle}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void deleteMapAnnotation
            .mutateAsync({
              annotationId,
              organizationId: profile.organization_id,
            })
            .catch((error) => {
              Alert.alert("Couldn't delete annotation", toErrorMessage(error));
            });
        },
      },
    ]);
  }

  function startVectorMode() {
    if (!selectedPin) {
      Alert.alert("Select a pin", "Tap a map pin first, then start anchored vector mode.");
      return;
    }
    clearDraft();
    setPreviewSnapshotId(null);
    setVectorModeEnabled(true);
    setVectorTitle(`${selectedPin.title} coaching`);
    setVectorNotes("");
    setVectorStrokes([]);
    setActiveVectorStroke([]);
  }

  function stopVectorMode() {
    setVectorModeEnabled(false);
    setVectorTitle("");
    setVectorNotes("");
    setVectorStrokes([]);
    setActiveVectorStroke([]);
  }

  function addVectorPoint(coordinate: LatLng) {
    if (!vectorModeEnabled) return;
    setActiveVectorStroke((previous) => [...previous, coordinate]);
  }

  function finishVectorStroke() {
    setActiveVectorStroke((activeStroke) => {
      if (activeStroke.length < 2) return [];
      setVectorStrokes((previous) => [
        ...previous,
        { id: createLocalId("vector_stroke"), points: activeStroke },
      ]);
      return [];
    });
  }

  function undoVectorPoint() {
    if (activeVectorStroke.length > 0) {
      setActiveVectorStroke((previous) => previous.slice(0, -1));
      return;
    }
    if (vectorStrokes.length > 0) {
      setVectorStrokes((previous) => previous.slice(0, -1));
    }
  }

  async function saveVectorAnnotation() {
    if (!selectedPin) {
      Alert.alert("Select a pin", "Tap a pin and try again.");
      return;
    }

    const finalStrokes =
      activeVectorStroke.length >= 2
        ? [...vectorStrokes, { id: createLocalId("vector_stroke"), points: activeVectorStroke }]
        : vectorStrokes;

    if (finalStrokes.length === 0) {
      Alert.alert("No drawing", "Add at least one stroke before saving.");
      return;
    }

    try {
      await createMapAnnotation.mutateAsync({
        organization_id: profile.organization_id,
        map_pin_id: selectedPin.id,
        student_id: selectedPin.student_id,
        instructor_id: selectedPin.instructor_id,
        annotation_type: "anchored_vector",
        title: vectorTitle.trim() || `${selectedPin.title} vector`,
        notes: vectorNotes.trim() || null,
        vector_strokes: serializeVectorStrokes(finalStrokes),
        snapshot_image_base64: null,
        snapshot_strokes: null,
        snapshot_width: null,
        snapshot_height: null,
      });
      stopVectorMode();
    } catch (error) {
      Alert.alert("Couldn't save vector annotation", toErrorMessage(error));
    }
  }

  function closeSnapshotEditor() {
    setSnapshotEditorVisible(false);
    setSnapshotTitle("");
    setSnapshotNotes("");
    setSnapshotBase64(null);
    setSnapshotStrokes([]);
    setActiveSnapshotStroke([]);
    setSnapshotCanvasSize({ width: 0, height: 0 });
  }

  async function startSnapshotEditor() {
    if (!selectedPin) {
      Alert.alert("Select a pin", "Tap a pin first, then create a snapshot.");
      return;
    }
    if (!mapRef.current) {
      Alert.alert("Map unavailable", "Could not capture the map right now.");
      return;
    }
    if (vectorModeEnabled) {
      Alert.alert("Finish vector mode first", "Save or cancel vector drawing before capturing a snapshot.");
      return;
    }

    setSnapshotCapturePending(true);
    try {
      const base64Snapshot = await mapRef.current.takeSnapshot({
        width: SNAPSHOT_CAPTURE_SIZE,
        height: SNAPSHOT_CAPTURE_SIZE,
        format: "jpg",
        quality: SNAPSHOT_CAPTURE_QUALITY,
        result: "base64",
      });

      if (!base64Snapshot) {
        Alert.alert("Snapshot failed", "No image was returned.");
        return;
      }

      setSnapshotBase64(base64Snapshot);
      setSnapshotTitle(`${selectedPin.title} snapshot`);
      setSnapshotNotes("");
      setSnapshotStrokes([]);
      setActiveSnapshotStroke([]);
      setSnapshotCanvasSize({ width: 0, height: 0 });
      setSnapshotEditorVisible(true);
    } catch (error) {
      Alert.alert("Couldn't capture snapshot", toErrorMessage(error));
    } finally {
      setSnapshotCapturePending(false);
    }
  }

  function finishSnapshotStroke() {
    setActiveSnapshotStroke((activeStroke) => {
      if (activeStroke.length < 2) return [];
      setSnapshotStrokes((previous) => [
        ...previous,
        { id: createLocalId("snapshot_stroke"), points: activeStroke },
      ]);
      return [];
    });
  }

  function undoSnapshotStroke() {
    if (activeSnapshotStroke.length > 0) {
      setActiveSnapshotStroke((previous) => previous.slice(0, -1));
      return;
    }
    if (snapshotStrokes.length > 0) {
      setSnapshotStrokes((previous) => previous.slice(0, -1));
    }
  }

  async function saveSnapshotAnnotation() {
    if (!selectedPin) {
      Alert.alert("Select a pin", "Tap a pin and try again.");
      return;
    }
    if (!snapshotBase64) {
      Alert.alert("No snapshot", "Capture a snapshot and try again.");
      return;
    }

    const finalStrokes =
      activeSnapshotStroke.length >= 2
        ? [
            ...snapshotStrokes,
            { id: createLocalId("snapshot_stroke"), points: activeSnapshotStroke },
          ]
        : snapshotStrokes;

    try {
      await createMapAnnotation.mutateAsync({
        organization_id: profile.organization_id,
        map_pin_id: selectedPin.id,
        student_id: selectedPin.student_id,
        instructor_id: selectedPin.instructor_id,
        annotation_type: "snapshot",
        title: snapshotTitle.trim() || `${selectedPin.title} snapshot`,
        notes: snapshotNotes.trim() || null,
        vector_strokes: null,
        snapshot_image_base64: snapshotBase64,
        snapshot_strokes: serializeSnapshotStrokes(finalStrokes),
        snapshot_width:
          snapshotCanvasSize.width > 0 ? Math.round(snapshotCanvasSize.width) : SNAPSHOT_CAPTURE_SIZE,
        snapshot_height:
          snapshotCanvasSize.height > 0 ? Math.round(snapshotCanvasSize.height) : SNAPSHOT_CAPTURE_SIZE,
      });
      closeSnapshotEditor();
    } catch (error) {
      Alert.alert("Couldn't save snapshot annotation", toErrorMessage(error));
    }
  }

  async function autopinActiveStudentAddresses() {
    if (autopinPending) return;

    const students = studentsQuery.data ?? [];
    if (students.length === 0) {
      Alert.alert("No students", "There are no active students to auto-pin.");
      return;
    }

    const existingStudentPins = new Set(
      (pinsQuery.data ?? []).map((pin) => pin.student_id).filter((studentId): studentId is string => !!studentId),
    );

    const candidates = students.filter(
      (student) => !!student.address?.trim() && !existingStudentPins.has(student.id),
    );

    const skippedNoAddress = students.filter((student) => !student.address?.trim()).length;
    const skippedPinned = students.filter((student) => existingStudentPins.has(student.id)).length;

    if (candidates.length === 0) {
      Alert.alert(
        "Nothing to auto-pin",
        [
          "All active students are already pinned or have no address.",
          skippedPinned > 0 ? `${skippedPinned} already pinned.` : null,
          skippedNoAddress > 0 ? `${skippedNoAddress} missing address.` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      );
      return;
    }

    setAutopinPending(true);
    let created = 0;
    let notGeocoded = 0;
    let failed = 0;

    try {
      for (const student of candidates) {
        const address = student.address?.trim();
        if (!address) continue;

        try {
          const candidatesFromGeocode = await Location.geocodeAsync(address);
          const first = candidatesFromGeocode.find(
            (result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
          );

          if (!first) {
            notGeocoded += 1;
            continue;
          }

          await createMapPinApi({
            organization_id: profile.organization_id,
            instructor_id: student.assigned_instructor_id,
            student_id: student.id,
            title: `${student.first_name} ${student.last_name}`,
            notes: `Address: ${address}`,
            latitude: first.latitude,
            longitude: first.longitude,
          });
          created += 1;
        } catch {
          failed += 1;
        }
      }
    } finally {
      setAutopinPending(false);
      void pinsQuery.refetch();
    }

    const message = [
      `${created} pin${created === 1 ? "" : "s"} created.`,
      skippedPinned > 0 ? `${skippedPinned} already pinned.` : null,
      skippedNoAddress > 0 ? `${skippedNoAddress} missing address.` : null,
      notGeocoded > 0 ? `${notGeocoded} addresses could not be geocoded.` : null,
      failed > 0 ? `${failed} failed due to unexpected errors.` : null,
    ]
      .filter(Boolean)
      .join("\n");

    Alert.alert("Auto-pin complete", message);
  }

  const snapshotPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => snapshotEditorVisible,
        onMoveShouldSetPanResponder: () => snapshotEditorVisible,
        onPanResponderGrant: (event) => {
          if (!snapshotEditorVisible) return;
          const startPoint = normalizeSnapshotPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            snapshotCanvasSize,
          );
          setActiveSnapshotStroke([startPoint]);
        },
        onPanResponderMove: (event) => {
          if (!snapshotEditorVisible) return;
          const nextPoint = normalizeSnapshotPoint(
            event.nativeEvent.locationX,
            event.nativeEvent.locationY,
            snapshotCanvasSize,
          );
          setActiveSnapshotStroke((previous) => {
            if (previous.length === 0) return [nextPoint];
            const last = previous[previous.length - 1];
            if (Math.abs(last.x - nextPoint.x) < 1 && Math.abs(last.y - nextPoint.y) < 1) {
              return previous;
            }
            return [...previous, nextPoint];
          });
        },
        onPanResponderRelease: () => finishSnapshotStroke(),
        onPanResponderTerminate: () => finishSnapshotStroke(),
      }),
    [snapshotCanvasSize, snapshotEditorVisible],
  );

  function handleSnapshotCanvasLayout(event: LayoutChangeEvent) {
    setSnapshotCanvasSize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  }

  function handlePreviewCanvasLayout(event: LayoutChangeEvent) {
    setPreviewCanvasSize({
      width: event.nativeEvent.layout.width,
      height: event.nativeEvent.layout.height,
    });
  }

  const draftCard = draftCoordinate ? (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">New Pin</AppText>
        <AppButton width="auto" variant="ghost" label="Cancel" onPress={clearDraft} />
      </View>

      <AppText variant="caption">
        Lat {draftCoordinate.latitude.toFixed(5)}, Lng {draftCoordinate.longitude.toFixed(5)}
      </AppText>

      <AppInput
        label="Label"
        placeholder="e.g. Roundabout practice"
        value={draftTitle}
        onChangeText={setDraftTitle}
      />

      <AppInput
        label="Notes"
        placeholder="What happened here?"
        multiline
        numberOfLines={4}
        textAlignVertical="top"
        inputClassName="h-24 py-3"
        value={draftNotes}
        onChangeText={setDraftNotes}
      />

      <View className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <AppText variant="label">Linked student (optional)</AppText>
          <AppButton
            width="auto"
            variant="ghost"
            label={draftStudentId ? "Clear" : ""}
            disabled={!draftStudentId}
            onPress={() => setDraftStudentId(null)}
          />
        </View>

        <AppInput
          label="Search student"
          placeholder="Name or address"
          autoCapitalize="none"
          value={studentSearch}
          onChangeText={setStudentSearch}
        />

        {studentsQuery.isPending ? (
          <View className="py-2">
            <ActivityIndicator />
          </View>
        ) : studentOptions.length === 0 ? (
          <AppText variant="caption">No matching students.</AppText>
        ) : (
          <View className="gap-2">
            {studentOptions.map((student) => {
              const selected = draftStudentId === student.id;
              return (
                <AppButton
                  key={student.id}
                  variant={selected ? "primary" : "secondary"}
                  label={`${student.first_name} ${student.last_name}`}
                  icon={User}
                  onPress={() => setDraftStudentId(selected ? null : student.id)}
                />
              );
            })}
          </View>
        )}
      </View>

      {createMapPin.isError ? <AppText variant="error">{toErrorMessage(createMapPin.error)}</AppText> : null}

      <AppButton
        label={createMapPin.isPending ? "Saving..." : "Save pin"}
        icon={MapPin}
        disabled={createMapPin.isPending}
        onPress={() => void saveDraftPin()}
      />
    </AppCard>
  ) : null;

  const vectorDraftCard =
    vectorModeEnabled && selectedPin ? (
      <AppCard className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <AppText variant="heading">Anchored Vector</AppText>
          <AppButton width="auto" variant="ghost" label="Cancel" onPress={stopVectorMode} />
        </View>

        <AppText variant="caption">
          Tap or long-press on the map to draw points over this pin location.
        </AppText>

        <AppInput label="Title" value={vectorTitle} onChangeText={setVectorTitle} />
        <AppInput
          label="Notes"
          value={vectorNotes}
          onChangeText={setVectorNotes}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          inputClassName="h-20 py-3"
        />

        <AppText variant="caption">
          Strokes: {vectorStrokes.length}
          {activeVectorStroke.length > 0 ? ` + active (${activeVectorStroke.length} points)` : ""}
        </AppText>

        <View className="flex-row flex-wrap gap-2">
          <AppButton
            width="auto"
            variant="secondary"
            label="Finish stroke"
            disabled={activeVectorStroke.length < 2}
            onPress={finishVectorStroke}
          />
          <AppButton width="auto" variant="secondary" label="Undo" onPress={undoVectorPoint} />
          <AppButton
            width="auto"
            variant="secondary"
            label="Clear all"
            onPress={() => {
              setVectorStrokes([]);
              setActiveVectorStroke([]);
            }}
          />
        </View>

        {createMapAnnotation.isError ? (
          <AppText variant="error">{toErrorMessage(createMapAnnotation.error)}</AppText>
        ) : null}

        <AppButton
          label={createMapAnnotation.isPending ? "Saving..." : "Save anchored vector"}
          disabled={createMapAnnotation.isPending}
          onPress={() => void saveVectorAnnotation()}
        />
      </AppCard>
    ) : null;

  const selectedPinCard = !draftCoordinate && !vectorModeEnabled && selectedPin ? (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">{selectedPin.title}</AppText>
        <AppButton
          width="auto"
          variant="danger"
          icon={Trash2}
          label={deleteMapPin.isPending ? "Deleting..." : "Delete pin"}
          disabled={deleteMapPin.isPending}
          onPress={confirmDeletePin}
        />
      </View>

      {selectedPin.student_id ? (
        <AppText variant="caption">
          Student:{" "}
          {(() => {
            const student = studentsById.get(selectedPin.student_id!);
            if (!student) return "Unknown student";
            return `${student.first_name} ${student.last_name}`;
          })()}
        </AppText>
      ) : null}

      {selectedPin.notes ? <AppText variant="body">{selectedPin.notes}</AppText> : null}

      <AppText variant="caption">
        Lat {selectedPin.latitude.toFixed(5)}, Lng {selectedPin.longitude.toFixed(5)}
      </AppText>

      <AppText variant="caption">
        Anchored vectors: {vectorAnnotationsForSelectedPin.length} | Snapshots:{" "}
        {snapshotAnnotationsForSelectedPin.length}
      </AppText>

      <View className="flex-row flex-wrap gap-2">
        <AppButton width="auto" label="Anchored vector" onPress={startVectorMode} />
        <AppButton
          width="auto"
          variant="secondary"
          icon={Camera}
          label={snapshotCapturePending ? "Capturing..." : "Snapshot"}
          disabled={snapshotCapturePending}
          onPress={() => void startSnapshotEditor()}
        />
      </View>

      {snapshotAnnotationsForSelectedPin.slice(0, 4).map((annotation) => (
        <View
          key={annotation.id}
          className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
        >
          <View className="flex-row items-center justify-between gap-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setPreviewSnapshotId(annotation.id)}
              className="flex-1"
            >
              <AppText variant="label">{annotation.title}</AppText>
              <AppText variant="caption">{dayjs(annotation.createdAt).format("DD MMM YYYY, h:mm A")}</AppText>
            </Pressable>

            <AppButton
              width="auto"
              variant="ghost"
              label="Delete"
              onPress={() => confirmDeleteAnnotation(annotation.id, annotation.title)}
            />
          </View>
        </View>
      ))}

      {vectorAnnotationsForSelectedPin.slice(0, 2).map((annotation) => (
        <View
          key={annotation.id}
          className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
        >
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <AppText variant="label">{annotation.title}</AppText>
              <AppText variant="caption">
                {annotation.strokes.length} stroke{annotation.strokes.length === 1 ? "" : "s"}
              </AppText>
            </View>
            <AppButton
              width="auto"
              variant="ghost"
              label="Delete"
              onPress={() => confirmDeleteAnnotation(annotation.id, annotation.title)}
            />
          </View>
        </View>
      ))}
    </AppCard>
  ) : null;

  const snapshotEditorModal = (
    <SnapshotAnnotationModal
      visible={snapshotEditorVisible}
      imageBase64={snapshotBase64}
      title={snapshotTitle}
      notes={snapshotNotes}
      strokes={snapshotStrokes}
      activeStroke={activeSnapshotStroke}
      saving={createMapAnnotation.isPending}
      onClose={closeSnapshotEditor}
      onChangeTitle={setSnapshotTitle}
      onChangeNotes={setSnapshotNotes}
      onUndo={undoSnapshotStroke}
      onClear={() => {
        setSnapshotStrokes([]);
        setActiveSnapshotStroke([]);
      }}
      onSave={() => void saveSnapshotAnnotation()}
      onCanvasLayout={handleSnapshotCanvasLayout}
      panHandlers={snapshotPanResponder.panHandlers}
    />
  );

  const snapshotPreviewModal = (
    <SnapshotPreviewModal
      snapshot={previewSnapshot}
      canvasSize={previewCanvasSize}
      onClose={() => setPreviewSnapshotId(null)}
      onCanvasLayout={handlePreviewCanvasLayout}
    />
  );

  return (
    <>
      <SafeAreaView className={cn(theme.screen.safeArea, "px-0 py-0")} edges={["bottom"]}>
        <View className="flex-1">
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFillObject}
            provider={Platform.OS === "android" ? PROVIDER_GOOGLE : undefined}
            mapType={mapLayer}
            initialRegion={DEFAULT_REGION}
            onLongPress={(event) => {
              if (vectorModeEnabled) {
                addVectorPoint(event.nativeEvent.coordinate);
                return;
              }
              startDraftAtCoordinate(event.nativeEvent.coordinate);
            }}
            onPress={(event) => {
              if (event.nativeEvent.action === "marker-press") return;
              if (vectorModeEnabled) {
                addVectorPoint(event.nativeEvent.coordinate);
                return;
              }
              setSelectedPinId(null);
            }}
            onRegionChangeComplete={(region) =>
              setMapCenter({ latitude: region.latitude, longitude: region.longitude })
            }
            showsCompass
            showsBuildings
            showsUserLocation
            toolbarEnabled
          >
            {(pinsQuery.data ?? []).map((pin) => {
              const student = pin.student_id ? studentsById.get(pin.student_id) : null;
              const descriptionParts = [
                student ? `Student: ${student.first_name} ${student.last_name}` : null,
                pin.notes,
              ].filter(Boolean);

              return (
                <Marker
                  key={pin.id}
                  coordinate={{ latitude: pin.latitude, longitude: pin.longitude }}
                  title={pin.title}
                  description={descriptionParts.join("\n") || undefined}
                  pinColor={pin.student_id ? theme.colors.accent : undefined}
                  onPress={() => setSelectedPinId(pin.id)}
                />
              );
            })}

            {vectorAnnotationsForSelectedPin.map((annotation, annotationIndex) =>
              annotation.strokes.map((stroke) => (
                <MapPolyline
                  key={`${annotation.id}:${stroke.id}`}
                  coordinates={stroke.points}
                  strokeColor={VECTOR_COLORS[annotationIndex % VECTOR_COLORS.length]}
                  strokeWidth={4}
                />
              )),
            )}

            {vectorStrokes.map((stroke) => (
              <MapPolyline
                key={stroke.id}
                coordinates={stroke.points}
                strokeColor="#f97316"
                strokeWidth={4}
              />
            ))}

            {activeVectorStroke.length >= 2 ? (
              <MapPolyline
                coordinates={activeVectorStroke}
                strokeColor="#ef4444"
                strokeWidth={4}
                lineDashPattern={[8, 6]}
              />
            ) : null}

            {draftCoordinate ? (
              <Marker
                coordinate={draftCoordinate}
                title="New pin"
                description="Tap Save pin in the panel below."
                pinColor={theme.colors.primary}
              />
            ) : null}
          </MapView>

          <View pointerEvents="box-none" className="absolute left-4 right-4 top-4 gap-3">
            <AppCard className="gap-3">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-1">
                  <AppText variant="heading">Google Maps</AppText>
                  <AppText variant="caption">
                    Long-press to add pins. Select a pin for anchored vectors and snapshots.
                  </AppText>
                </View>
                <View className="items-end gap-2">
                  <AppButton
                    width="auto"
                    variant="secondary"
                    icon={RefreshCw}
                    label=""
                    className="h-10 w-10 px-0"
                    accessibilityLabel="Refresh pins"
                    onPress={() => {
                      void pinsQuery.refetch();
                      void annotationsQuery.refetch();
                    }}
                  />
                  <AppButton
                    width="auto"
                    icon={Plus}
                    label=""
                    className="h-10 w-10 px-0"
                    accessibilityLabel="Add pin at map center"
                    onPress={() => startDraftAtCoordinate(mapCenter)}
                  />
                </View>
              </View>

              <AppSegmentedControl<MapLayer>
                value={mapLayer}
                options={MAP_LAYER_OPTIONS}
                onChange={setMapLayer}
              />

              <AppButton
                width="auto"
                variant="secondary"
                label={autopinPending ? "Auto-pinning..." : "Auto-pin active student addresses"}
                disabled={autopinPending}
                onPress={() => void autopinActiveStudentAddresses()}
              />

              {pinsQuery.isError ? <AppText variant="error">{toErrorMessage(pinsQuery.error)}</AppText> : null}
              {studentsQuery.isError ? (
                <AppText variant="error">{toErrorMessage(studentsQuery.error)}</AppText>
              ) : null}
              {annotationsQuery.isError ? (
                <AppText variant="error">{toErrorMessage(annotationsQuery.error)}</AppText>
              ) : null}
            </AppCard>
          </View>

          <View pointerEvents="box-none" className="absolute bottom-4 left-4 right-4">
            {draftCard ??
              vectorDraftCard ??
              selectedPinCard ?? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-xl border border-border bg-card/95 px-4 py-3 dark:border-borderDark dark:bg-cardDark/95"
                  onPress={() => startDraftAtCoordinate(mapCenter)}
                >
                  <AppText variant="caption">
                    Tip: Long-press to add a pin, then select a pin to create anchored vectors and snapshots.
                  </AppText>
                </Pressable>
              )}
          </View>

          {pinsQuery.isPending ? (
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <AppCard className="items-center gap-3">
                <ActivityIndicator />
                <AppText variant="caption">Loading map pins...</AppText>
              </AppCard>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
      {snapshotEditorModal}
      {snapshotPreviewModal}
    </>
  );
}
