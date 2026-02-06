import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import * as Location from "expo-location";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import { Camera, MapPin, Pin, Trash2, User } from "lucide-react-native";

import { AddressAutocompleteInput } from "../../components/AddressAutocompleteInput";
import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppText } from "../../components/AppText";
import { SnapshotAnnotationModal } from "../components/SnapshotAnnotationModal";
import { SnapshotPreviewModal, type SnapshotPreview } from "../components/SnapshotPreviewModal";
import { useCurrentUser } from "../../features/auth/current-user";
import {
  DEFAULT_DRAW_COLOR,
  DEFAULT_DRAW_WIDTH,
  DEFAULT_TEXT_SIZE,
  parseSnapshotAnnotation,
  serializeSnapshotAnnotation,
  type SnapshotAnnotationContent,
  type SnapshotPoint,
  type SnapshotStroke,
  type SnapshotText,
} from "../../features/map-annotations/codec";
import {
  useCreateMapAnnotationMutation,
  useDeleteMapAnnotationMutation,
  useMapAnnotationsQuery,
} from "../../features/map-annotations/queries";
import {
  fetchPlaceCoordinatesById,
  geocodeNewZealandAddress,
  isGooglePlacesConfigured,
  type PlacePrediction,
} from "../../features/maps/places";
import { createMapPin as createMapPinApi } from "../../features/map-pins/api";
import {
  useCreateMapPinMutation,
  useDeleteMapPinMutation,
  useMapPinsQuery,
} from "../../features/map-pins/queries";
import type { Student } from "../../features/students/api";
import { useStudentsQuery } from "../../features/students/queries";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import type { MapsStackParamList } from "../MapsStackNavigator";

type Props = NativeStackScreenProps<MapsStackParamList, "GoogleMapsMain">;

type MapLayer = "standard" | "satellite" | "hybrid";
type TrafficMode = "off" | "on";

type SnapshotCanvasSize = {
  width: number;
  height: number;
};

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

const DRAW_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#111827",
  "#a855f7",
  "#14b8a6",
  "#eab308",
] as const;
const DRAW_WIDTH_OPTIONS = [2, 4, 6, 8] as const;
const SNAPSHOT_TEXT_SIZE_OPTIONS = [12, 16, 20, 24, 28] as const;
const SNAPSHOT_CAPTURE_SIZE = 1080;
const SNAPSHOT_CAPTURE_QUALITY = 0.65;

const MAP_LAYER_OPTIONS: Array<{ value: MapLayer; label: string }> = [
  { value: "standard", label: "Default" },
  { value: "satellite", label: "Satellite" },
  { value: "hybrid", label: "Hybrid" },
];
const TRAFFIC_OPTIONS: Array<{ value: TrafficMode; label: string }> = [
  { value: "off", label: "Traffic Off" },
  { value: "on", label: "Traffic On" },
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

function createHistoryState<T>(present: T): HistoryState<T> {
  return { past: [], present, future: [] };
}

function pushHistoryState<T>(history: HistoryState<T>, nextPresent: T): HistoryState<T> {
  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: [],
  };
}

function undoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.past.length === 0) return history;
  const previous = history.past[history.past.length - 1];
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
  };
}

function redoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  if (history.future.length === 0) return history;
  const next = history.future[0];
  return {
    past: [...history.past, history.present],
    present: next,
    future: history.future.slice(1),
  };
}

export function GoogleMapsScreen(_props: Props) {
  const mapRef = useRef<MapView | null>(null);
  const { profile } = useCurrentUser();
  const placesConfigured = isGooglePlacesConfigured();
  const pinsQuery = useMapPinsQuery({ organizationId: profile.organization_id });
  const studentsQuery = useStudentsQuery({ archived: false });
  const annotationsQuery = useMapAnnotationsQuery({ organizationId: profile.organization_id });
  const createMapPin = useCreateMapPinMutation();
  const deleteMapPin = useDeleteMapPinMutation();
  const createMapAnnotation = useCreateMapAnnotationMutation();
  const deleteMapAnnotation = useDeleteMapAnnotationMutation();
  const refetchPins = pinsQuery.refetch;

  const [mapLayer, setMapLayer] = useState<MapLayer>("standard");
  const [trafficMode, setTrafficMode] = useState<TrafficMode>("off");
  const [mapCenter, setMapCenter] = useState<LatLng>({
    latitude: DEFAULT_REGION.latitude,
    longitude: DEFAULT_REGION.longitude,
  });
  const [mapSearchValue, setMapSearchValue] = useState("");
  const [mapSearchPending, setMapSearchPending] = useState(false);

  const [selectedPinId, setSelectedPinId] = useState<string | null>(null);

  const [draftCoordinate, setDraftCoordinate] = useState<LatLng | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [draftStudentId, setDraftStudentId] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  const [autopinPending, setAutopinPending] = useState(false);
  const [snapshotCapturePending, setSnapshotCapturePending] = useState(false);

  const [snapshotEditorVisible, setSnapshotEditorVisible] = useState(false);
  const [snapshotTitle, setSnapshotTitle] = useState("");
  const [snapshotNotes, setSnapshotNotes] = useState("");
  const [snapshotBase64, setSnapshotBase64] = useState<string | null>(null);
  const [snapshotHistory, setSnapshotHistory] = useState<HistoryState<SnapshotAnnotationContent>>(
    createHistoryState({ strokes: [], texts: [] }),
  );
  const [activeSnapshotStroke, setActiveSnapshotStroke] = useState<SnapshotPoint[]>([]);
  const [activeSnapshotRedoPoints, setActiveSnapshotRedoPoints] = useState<SnapshotPoint[]>([]);
  const [snapshotColor, setSnapshotColor] = useState<string>(DEFAULT_DRAW_COLOR);
  const [snapshotLineWidth, setSnapshotLineWidth] = useState<number>(DEFAULT_DRAW_WIDTH);
  const [snapshotTextDraft, setSnapshotTextDraft] = useState("");
  const [snapshotTextSize, setSnapshotTextSize] = useState<number>(DEFAULT_TEXT_SIZE);
  const [snapshotTextPlacementEnabled, setSnapshotTextPlacementEnabled] = useState(false);
  const [snapshotCanvasSize, setSnapshotCanvasSize] = useState<SnapshotCanvasSize>({
    width: 0,
    height: 0,
  });
  const lastAutoPinRunKeyRef = useRef("");

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

  const autoPinCandidates = useMemo(() => {
    const students = studentsQuery.data ?? [];
    const existingStudentPins = new Set(
      (pinsQuery.data ?? []).map((pin) => pin.student_id).filter((studentId): studentId is string => !!studentId),
    );

    return students.filter((student) => !!student.address?.trim() && !existingStudentPins.has(student.id));
  }, [pinsQuery.data, studentsQuery.data]);

  const autoPinCandidateKey = useMemo(
    () =>
      autoPinCandidates
        .map((student) => `${student.id}:${(student.address ?? "").trim().toLowerCase()}`)
        .sort()
        .join("|"),
    [autoPinCandidates],
  );

  const snapshotAnnotationsForSelectedPin = useMemo((): SnapshotPreview[] => {
    if (!selectedPinId) return [];
    const all = annotationsQuery.data ?? [];
    return all
      .filter(
        (annotation) => annotation.map_pin_id === selectedPinId && annotation.annotation_type === "snapshot",
      )
      .map((annotation) => {
        if (!annotation.snapshot_image_base64) return null;
        const parsed = parseSnapshotAnnotation(annotation.snapshot_strokes);

        return {
          id: annotation.id,
          title: annotation.title,
          notes: annotation.notes,
          imageBase64: annotation.snapshot_image_base64,
          strokes: parsed.strokes,
          texts: parsed.texts,
          width: annotation.snapshot_width ?? SNAPSHOT_CAPTURE_SIZE,
          height: annotation.snapshot_height ?? SNAPSHOT_CAPTURE_SIZE,
          createdAt: annotation.created_at,
        };
      })
      .filter((annotation): annotation is SnapshotPreview => annotation != null);
  }, [annotationsQuery.data, selectedPinId]);

  const mapLevelSnapshotAnnotations = useMemo((): SnapshotPreview[] => {
    const all = annotationsQuery.data ?? [];
    return all
      .filter((annotation) => annotation.map_pin_id == null && annotation.annotation_type === "snapshot")
      .map((annotation) => {
        if (!annotation.snapshot_image_base64) return null;
        const parsed = parseSnapshotAnnotation(annotation.snapshot_strokes);

        return {
          id: annotation.id,
          title: annotation.title,
          notes: annotation.notes,
          imageBase64: annotation.snapshot_image_base64,
          strokes: parsed.strokes,
          texts: parsed.texts,
          width: annotation.snapshot_width ?? SNAPSHOT_CAPTURE_SIZE,
          height: annotation.snapshot_height ?? SNAPSHOT_CAPTURE_SIZE,
          createdAt: annotation.created_at,
        };
      })
      .filter((annotation): annotation is SnapshotPreview => annotation != null);
  }, [annotationsQuery.data]);

  const activeSnapshotAnnotations = selectedPin
    ? snapshotAnnotationsForSelectedPin
    : mapLevelSnapshotAnnotations;

  const previewSnapshot = useMemo(
    () => activeSnapshotAnnotations.find((snapshot) => snapshot.id === previewSnapshotId) ?? null,
    [activeSnapshotAnnotations, previewSnapshotId],
  );

  useEffect(() => {
    if (!previewSnapshotId) return;
    const stillExists = activeSnapshotAnnotations.some((snapshot) => snapshot.id === previewSnapshotId);
    if (!stillExists) {
      setPreviewSnapshotId(null);
    }
  }, [activeSnapshotAnnotations, previewSnapshotId]);

  useEffect(() => {
    if (autoPinCandidates.length === 0) {
      lastAutoPinRunKeyRef.current = "";
    }
  }, [autoPinCandidates.length]);

  function clearDraft() {
    setDraftCoordinate(null);
    setDraftTitle("");
    setDraftNotes("");
    setDraftStudentId(null);
    setStudentSearch("");
  }

  function focusMapOnCoordinates(latitude: number, longitude: number) {
    const nextRegion = {
      latitude,
      longitude,
      latitudeDelta: 0.012,
      longitudeDelta: 0.012,
    };

    mapRef.current?.animateToRegion(nextRegion, 450);
    setMapCenter({ latitude, longitude });
    setSelectedPinId(null);
  }

  async function handleMapAddressPredictionSelected(prediction: PlacePrediction) {
    setMapSearchValue(prediction.description);

    try {
      setMapSearchPending(true);
      const place = await fetchPlaceCoordinatesById(prediction.placeId);
      if (place.formattedAddress) {
        setMapSearchValue(place.formattedAddress);
      }
      focusMapOnCoordinates(place.latitude, place.longitude);
    } catch (error) {
      Alert.alert("Address lookup failed", toErrorMessage(error));
    } finally {
      setMapSearchPending(false);
    }
  }

  async function searchAddressAndZoom() {
    if (mapSearchPending) return;

    const query = mapSearchValue.trim();
    if (!query) {
      Alert.alert("Enter an address", "Type an address first.");
      return;
    }

    if (!placesConfigured) {
      Alert.alert(
        "Missing Google key",
        "Set GOOGLE_MAPS_API_KEY (or EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) to use address search.",
      );
      return;
    }

    try {
      setMapSearchPending(true);
      const geocoded = await geocodeNewZealandAddress(query);
      if (!geocoded) {
        Alert.alert("No result", "No matching New Zealand address found.");
        return;
      }

      setMapSearchValue(geocoded.formattedAddress || query);
      focusMapOnCoordinates(geocoded.latitude, geocoded.longitude);
    } catch (error) {
      Alert.alert("Address search failed", toErrorMessage(error));
    } finally {
      setMapSearchPending(false);
    }
  }

  function startDraftAtCoordinate(coordinate: LatLng) {
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

  function closeSnapshotEditor() {
    setSnapshotEditorVisible(false);
    setSnapshotTitle("");
    setSnapshotNotes("");
    setSnapshotBase64(null);
    setSnapshotHistory(createHistoryState({ strokes: [], texts: [] }));
    setActiveSnapshotStroke([]);
    setActiveSnapshotRedoPoints([]);
    setSnapshotColor(DEFAULT_DRAW_COLOR);
    setSnapshotLineWidth(DEFAULT_DRAW_WIDTH);
    setSnapshotTextDraft("");
    setSnapshotTextSize(DEFAULT_TEXT_SIZE);
    setSnapshotTextPlacementEnabled(false);
    setSnapshotCanvasSize({ width: 0, height: 0 });
  }

  async function startSnapshotEditor() {
    if (!mapRef.current) {
      Alert.alert("Map unavailable", "Could not capture the map right now.");
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
      setSnapshotTitle(selectedPin ? `${selectedPin.title} snapshot` : "Main map snapshot");
      setSnapshotNotes("");
      setSnapshotHistory(createHistoryState({ strokes: [], texts: [] }));
      setActiveSnapshotStroke([]);
      setActiveSnapshotRedoPoints([]);
      setSnapshotColor(DEFAULT_DRAW_COLOR);
      setSnapshotLineWidth(DEFAULT_DRAW_WIDTH);
      setSnapshotTextDraft("");
      setSnapshotTextSize(DEFAULT_TEXT_SIZE);
      setSnapshotTextPlacementEnabled(false);
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

      setSnapshotHistory((history) =>
        pushHistoryState(history, {
          ...history.present,
          strokes: [
            ...history.present.strokes,
            {
              id: createLocalId("snapshot_stroke"),
              points: activeStroke,
              color: snapshotColor,
              width: snapshotLineWidth,
            },
          ],
        }),
      );
      return [];
    });
    setActiveSnapshotRedoPoints([]);
  }

  function undoSnapshotAction() {
    if (activeSnapshotStroke.length > 0) {
      setActiveSnapshotStroke((previous) => {
        if (previous.length === 0) return previous;
        const removedPoint = previous[previous.length - 1];
        setActiveSnapshotRedoPoints((redoPoints) => [...redoPoints, removedPoint]);
        return previous.slice(0, -1);
      });
      return;
    }

    setSnapshotHistory((history) => undoHistoryState(history));
  }

  function redoSnapshotAction() {
    if (activeSnapshotRedoPoints.length > 0) {
      setActiveSnapshotRedoPoints((redoPoints) => {
        if (redoPoints.length === 0) return redoPoints;

        const point = redoPoints[redoPoints.length - 1];
        setActiveSnapshotStroke((stroke) => [...stroke, point]);
        return redoPoints.slice(0, -1);
      });
      return;
    }

    setSnapshotHistory((history) => redoHistoryState(history));
  }

  function clearSnapshotDraft() {
    const hasEntries =
      snapshotHistory.present.strokes.length > 0 ||
      snapshotHistory.present.texts.length > 0 ||
      activeSnapshotStroke.length > 0;

    if (hasEntries) {
      setSnapshotHistory((history) =>
        pushHistoryState(history, {
          strokes: [],
          texts: [],
        }),
      );
    }

    setActiveSnapshotStroke([]);
    setActiveSnapshotRedoPoints([]);
    setSnapshotTextPlacementEnabled(false);
  }

  async function saveSnapshotAnnotation() {
    if (!snapshotBase64) {
      Alert.alert("No snapshot", "Capture a snapshot and try again.");
      return;
    }

    const draft = snapshotHistory.present;
    const finalStrokes =
      activeSnapshotStroke.length >= 2
        ? [
            ...draft.strokes,
            {
              id: createLocalId("snapshot_stroke"),
              points: activeSnapshotStroke,
              color: snapshotColor,
              width: snapshotLineWidth,
            },
          ]
        : draft.strokes;

    if (finalStrokes.length === 0 && draft.texts.length === 0) {
      Alert.alert("No annotation", "Add at least one stroke or text label before saving.");
      return;
    }

    try {
      await createMapAnnotation.mutateAsync({
        organization_id: profile.organization_id,
        map_pin_id: selectedPin?.id ?? null,
        student_id: selectedPin?.student_id ?? null,
        instructor_id: selectedPin?.instructor_id ?? profile.id,
        annotation_type: "snapshot",
        title: snapshotTitle.trim() || `${selectedPin ? selectedPin.title : "Main map"} snapshot`,
        notes: snapshotNotes.trim() || null,
        vector_strokes: null,
        snapshot_image_base64: snapshotBase64,
        snapshot_strokes: serializeSnapshotAnnotation({
          strokes: finalStrokes,
          texts: draft.texts,
        }),
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

  const autopinStudents = useCallback(async (candidates: Student[]) => {
    if (candidates.length === 0) return;

    setAutopinPending(true);
    try {
      for (const student of candidates) {
        const address = student.address?.trim();
        if (!address) continue;

        let coordinates: { latitude: number; longitude: number } | null = null;

        try {
          if (placesConfigured) {
            const geocoded = await geocodeNewZealandAddress(address);
            if (geocoded) {
              coordinates = {
                latitude: geocoded.latitude,
                longitude: geocoded.longitude,
              };
            }
          }
        } catch {
          // Fall through to Expo geocoding fallback.
        }

        if (!coordinates) {
          try {
            const candidatesFromGeocode = await Location.geocodeAsync(address);
            const first = candidatesFromGeocode.find(
              (result) => Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
            );
            if (first) {
              coordinates = {
                latitude: first.latitude,
                longitude: first.longitude,
              };
            }
          } catch {
            continue;
          }
        }

        if (!coordinates) continue;

        try {
          await createMapPinApi({
            organization_id: profile.organization_id,
            instructor_id: student.assigned_instructor_id,
            student_id: student.id,
            title: `${student.first_name} ${student.last_name}`,
            notes: `Address: ${address}`,
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          });
        } catch {
          // Keep auto-pin non-blocking and continue remaining students.
        }
      }
    } finally {
      setAutopinPending(false);
      void refetchPins();
    }
  }, [placesConfigured, profile.organization_id, refetchPins]);

  useEffect(() => {
    if (studentsQuery.isPending || pinsQuery.isPending) return;
    if (autoPinCandidates.length === 0 || autopinPending) return;
    if (!autoPinCandidateKey) return;
    if (autoPinCandidateKey === lastAutoPinRunKeyRef.current) return;

    lastAutoPinRunKeyRef.current = autoPinCandidateKey;
    void autopinStudents(autoPinCandidates);
  }, [
    autoPinCandidateKey,
    autoPinCandidates,
    autopinPending,
    autopinStudents,
    pinsQuery.isPending,
    studentsQuery.isPending,
  ]);

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

          if (snapshotTextPlacementEnabled) {
            const label = snapshotTextDraft.trim();
            if (!label) {
              Alert.alert("Enter text", "Type text first, then tap the image to place it.");
              setSnapshotTextPlacementEnabled(false);
              return;
            }

            setSnapshotHistory((history) =>
              pushHistoryState(history, {
                ...history.present,
                texts: [
                  ...history.present.texts,
                  {
                    id: createLocalId("snapshot_text"),
                    text: label,
                    color: snapshotColor,
                    size: snapshotTextSize,
                    x: startPoint.x,
                    y: startPoint.y,
                  },
                ],
              }),
            );
            setSnapshotTextPlacementEnabled(false);
            return;
          }

          setActiveSnapshotRedoPoints([]);
          setActiveSnapshotStroke([startPoint]);
        },
        onPanResponderMove: (event) => {
          if (!snapshotEditorVisible || snapshotTextPlacementEnabled) return;

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
    [
      snapshotCanvasSize,
      snapshotColor,
      snapshotEditorVisible,
      snapshotLineWidth,
      snapshotTextDraft,
      snapshotTextSize,
      snapshotTextPlacementEnabled,
    ],
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

  const snapshotCanUndo = activeSnapshotStroke.length > 0 || snapshotHistory.past.length > 0;
  const snapshotCanRedo = activeSnapshotRedoPoints.length > 0 || snapshotHistory.future.length > 0;

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

  const selectedPinCard = !draftCoordinate && selectedPin ? (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">{selectedPin.title}</AppText>
        <View className="flex-row items-center gap-2">
          <AppButton
            width="auto"
            size="icon"
            variant="secondary"
            icon={Camera}
            label=""
            accessibilityLabel="Capture snapshot for selected pin"
            disabled={snapshotCapturePending}
            onPress={() => void startSnapshotEditor()}
          />
          <AppButton
            width="auto"
            variant="danger"
            icon={Trash2}
            label={deleteMapPin.isPending ? "Deleting..." : "Delete pin"}
            disabled={deleteMapPin.isPending}
            onPress={confirmDeletePin}
          />
        </View>
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

      <AppText variant="caption">Snapshots: {activeSnapshotAnnotations.length}</AppText>

      {activeSnapshotAnnotations.slice(0, 4).map((annotation) => (
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

      {activeSnapshotAnnotations.length === 0 ? (
        <AppText variant="caption">
          Tip: Use the camera button to add a snapshot annotation for this pin.
        </AppText>
      ) : null}
    </AppCard>
  ) : null;

  const mapAnnotationsCard = !draftCoordinate && !selectedPin ? (
    <AppCard className="gap-3">
      <View className="flex-row items-start justify-between gap-3 px-1 pt-1">
        <AppText variant="heading">Main Map Annotations</AppText>
        <AppButton
          width="auto"
          size="icon"
          variant="secondary"
          icon={Camera}
          label=""
          accessibilityLabel="Capture snapshot for main map"
          disabled={snapshotCapturePending}
          onPress={() => void startSnapshotEditor()}
        />
      </View>

      <AppText variant="caption">Snapshots: {mapLevelSnapshotAnnotations.length}</AppText>

      {mapLevelSnapshotAnnotations.slice(0, 4).map((annotation) => (
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

      {mapLevelSnapshotAnnotations.length === 0 ? (
        <AppText variant="caption">Tip: Use the camera button to annotate the main map.</AppText>
      ) : null}
    </AppCard>
  ) : null;

  const snapshotEditorModal = (
    <SnapshotAnnotationModal
      visible={snapshotEditorVisible}
      imageBase64={snapshotBase64}
      title={snapshotTitle}
      notes={snapshotNotes}
      strokes={snapshotHistory.present.strokes}
      texts={snapshotHistory.present.texts}
      activeStroke={activeSnapshotStroke}
      activeColor={snapshotColor}
      lineWidth={snapshotLineWidth}
      colorOptions={DRAW_COLORS}
      widthOptions={DRAW_WIDTH_OPTIONS}
      textDraft={snapshotTextDraft}
      textSize={snapshotTextSize}
      textSizeOptions={SNAPSHOT_TEXT_SIZE_OPTIONS}
      placingText={snapshotTextPlacementEnabled}
      saving={createMapAnnotation.isPending}
      canUndo={snapshotCanUndo}
      canRedo={snapshotCanRedo}
      onClose={closeSnapshotEditor}
      onChangeTitle={setSnapshotTitle}
      onChangeNotes={setSnapshotNotes}
      onChangeTextDraft={setSnapshotTextDraft}
      onSelectTextSize={setSnapshotTextSize}
      onSelectColor={setSnapshotColor}
      onSelectWidth={setSnapshotLineWidth}
      onToggleTextPlacement={() => setSnapshotTextPlacementEnabled((previous) => !previous)}
      onUndo={undoSnapshotAction}
      onRedo={redoSnapshotAction}
      onClear={clearSnapshotDraft}
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
            onLongPress={(event) => startDraftAtCoordinate(event.nativeEvent.coordinate)}
            onPress={(event) => {
              if (event.nativeEvent.action === "marker-press") return;
              setSelectedPinId(null);
            }}
            onRegionChangeComplete={(region) =>
              setMapCenter({ latitude: region.latitude, longitude: region.longitude })
            }
            showsCompass
            showsBuildings
            showsTraffic={trafficMode === "on"}
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
                    Long-press to add pins. Use snapshots in the bottom annotation panel.
                  </AppText>
                </View>
                <AppButton
                  width="auto"
                  size="icon"
                  icon={Pin}
                  label=""
                  accessibilityLabel="Add pin at map center"
                  onPress={() => startDraftAtCoordinate(mapCenter)}
                />
              </View>

              <AppSegmentedControl<MapLayer>
                value={mapLayer}
                options={MAP_LAYER_OPTIONS}
                onChange={setMapLayer}
              />

              <View className="gap-1">
                <AppText variant="label">Live traffic</AppText>
                <AppSegmentedControl<TrafficMode>
                  value={trafficMode}
                  options={TRAFFIC_OPTIONS}
                  onChange={setTrafficMode}
                />
              </View>

              <AddressAutocompleteInput
                label="Search address (NZ)"
                placeholder="Start typing an address"
                autoCapitalize="words"
                autoCorrect={false}
                value={mapSearchValue}
                onChangeText={setMapSearchValue}
                onSelectPrediction={(prediction) => {
                  void handleMapAddressPredictionSelected(prediction);
                }}
                onSubmitEditing={() => void searchAddressAndZoom()}
                returnKeyType="search"
                editable={!mapSearchPending}
                inputRightAccessory={
                  <AppButton
                    width="auto"
                    variant="ghost"
                    label="Clear"
                    onPress={() => setMapSearchValue("")}
                  />
                }
              />

              {!placesConfigured ? (
                <AppText variant="caption">
                  Set GOOGLE_MAPS_API_KEY to enable New Zealand address autocomplete/search.
                </AppText>
              ) : null}

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
              selectedPinCard ??
              mapAnnotationsCard ?? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-xl border border-border bg-card/95 px-4 py-3 dark:border-borderDark dark:bg-cardDark/95"
                  onPress={() => startDraftAtCoordinate(mapCenter)}
                >
                  <AppText variant="caption">
                    Tip: Long-press to add a pin. Use snapshots from the annotation cards.
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
