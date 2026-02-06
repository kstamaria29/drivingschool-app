import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import dayjs from "dayjs";
import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
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
  parseSnapshotAnnotation,
  parseVectorAnnotation,
  serializeSnapshotAnnotation,
  serializeVectorAnnotation,
  type SnapshotAnnotationContent,
  type SnapshotPoint,
  type SnapshotStroke,
  type SnapshotText,
  type VectorAnnotationContent,
  type VectorStroke,
  type VectorText,
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

type HistoryState<T> = {
  past: T[];
  present: T;
  future: T[];
};

type ParsedVectorAnnotation = {
  id: string;
  title: string;
  notes: string | null;
  strokes: VectorStroke[];
  texts: VectorText[];
};

const DRAW_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#ef4444",
  "#a855f7",
  "#14b8a6",
  "#eab308",
] as const;
const DRAW_WIDTH_OPTIONS = [2, 4, 6, 8] as const;
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

  const [mapLayer, setMapLayer] = useState<MapLayer>("standard");
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

  const [vectorModeEnabled, setVectorModeEnabled] = useState(false);
  const [vectorTitle, setVectorTitle] = useState("");
  const [vectorNotes, setVectorNotes] = useState("");
  const [vectorHistory, setVectorHistory] = useState<HistoryState<VectorAnnotationContent>>(
    createHistoryState({ strokes: [], texts: [] }),
  );
  const [activeVectorStroke, setActiveVectorStroke] = useState<LatLng[]>([]);
  const [activeVectorRedoPoints, setActiveVectorRedoPoints] = useState<LatLng[]>([]);
  const [vectorColor, setVectorColor] = useState<string>(DEFAULT_DRAW_COLOR);
  const [vectorLineWidth, setVectorLineWidth] = useState<number>(DEFAULT_DRAW_WIDTH);
  const [vectorTextDraft, setVectorTextDraft] = useState("");
  const [vectorTextPlacementEnabled, setVectorTextPlacementEnabled] = useState(false);

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
  const [snapshotTextPlacementEnabled, setSnapshotTextPlacementEnabled] = useState(false);
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
      .map((annotation) => {
        const parsed = parseVectorAnnotation(annotation.vector_strokes);
        if (parsed.strokes.length === 0 && parsed.texts.length === 0) return null;

        return {
          id: annotation.id,
          title: annotation.title,
          notes: annotation.notes,
          strokes: parsed.strokes,
          texts: parsed.texts,
        };
      })
      .filter((annotation): annotation is ParsedVectorAnnotation => annotation != null);
  }, [annotationsQuery.data, selectedPinId]);

  const mapLevelVectorAnnotations = useMemo((): ParsedVectorAnnotation[] => {
    const all = annotationsQuery.data ?? [];
    return all
      .filter((annotation) => annotation.map_pin_id == null && annotation.annotation_type === "anchored_vector")
      .map((annotation) => {
        const parsed = parseVectorAnnotation(annotation.vector_strokes);
        if (parsed.strokes.length === 0 && parsed.texts.length === 0) return null;

        return {
          id: annotation.id,
          title: annotation.title,
          notes: annotation.notes,
          strokes: parsed.strokes,
          texts: parsed.texts,
        };
      })
      .filter((annotation): annotation is ParsedVectorAnnotation => annotation != null);
  }, [annotationsQuery.data]);

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

  const activeVectorAnnotations = selectedPin ? vectorAnnotationsForSelectedPin : mapLevelVectorAnnotations;
  const activeSnapshotAnnotations = selectedPin
    ? snapshotAnnotationsForSelectedPin
    : mapLevelSnapshotAnnotations;

  const visibleVectorAnnotations = selectedPin
    ? [...mapLevelVectorAnnotations, ...vectorAnnotationsForSelectedPin]
    : mapLevelVectorAnnotations;

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
    if (snapshotEditorVisible) {
      Alert.alert("Finish snapshot first", "Save or close the snapshot editor before starting vectors.");
      return;
    }

    clearDraft();
    setPreviewSnapshotId(null);

    setVectorModeEnabled(true);
    setVectorTitle(selectedPin ? `${selectedPin.title} coaching` : "Main map coaching");
    setVectorNotes("");
    setVectorHistory(createHistoryState({ strokes: [], texts: [] }));
    setActiveVectorStroke([]);
    setActiveVectorRedoPoints([]);
    setVectorColor(DEFAULT_DRAW_COLOR);
    setVectorLineWidth(DEFAULT_DRAW_WIDTH);
    setVectorTextDraft("");
    setVectorTextPlacementEnabled(false);
  }

  function stopVectorMode() {
    setVectorModeEnabled(false);
    setVectorTitle("");
    setVectorNotes("");
    setVectorHistory(createHistoryState({ strokes: [], texts: [] }));
    setActiveVectorStroke([]);
    setActiveVectorRedoPoints([]);
    setVectorTextDraft("");
    setVectorTextPlacementEnabled(false);
  }

  function addVectorPoint(coordinate: LatLng) {
    if (!vectorModeEnabled) return;

    if (vectorTextPlacementEnabled) {
      const label = vectorTextDraft.trim();
      if (!label) {
        Alert.alert("Enter text", "Type text first, then tap the map to place it.");
        setVectorTextPlacementEnabled(false);
        return;
      }

      setVectorHistory((history) =>
        pushHistoryState(history, {
          ...history.present,
          texts: [
            ...history.present.texts,
            {
              id: createLocalId("vector_text"),
              text: label,
              color: vectorColor,
              coordinate,
            },
          ],
        }),
      );
      setVectorTextPlacementEnabled(false);
      return;
    }

    setActiveVectorRedoPoints([]);
    setActiveVectorStroke((previous) => [...previous, coordinate]);
  }

  function finishVectorStroke() {
    setActiveVectorStroke((activeStroke) => {
      if (activeStroke.length < 2) return [];

      setVectorHistory((history) =>
        pushHistoryState(history, {
          ...history.present,
          strokes: [
            ...history.present.strokes,
            {
              id: createLocalId("vector_stroke"),
              points: activeStroke,
              color: vectorColor,
              width: vectorLineWidth,
            },
          ],
        }),
      );
      return [];
    });
    setActiveVectorRedoPoints([]);
  }

  function undoVectorAction() {
    if (activeVectorStroke.length > 0) {
      setActiveVectorStroke((previous) => {
        if (previous.length === 0) return previous;
        const removedPoint = previous[previous.length - 1];
        setActiveVectorRedoPoints((redoPoints) => [...redoPoints, removedPoint]);
        return previous.slice(0, -1);
      });
      return;
    }

    setVectorHistory((history) => undoHistoryState(history));
  }

  function redoVectorAction() {
    if (activeVectorRedoPoints.length > 0) {
      setActiveVectorRedoPoints((redoPoints) => {
        if (redoPoints.length === 0) return redoPoints;

        const point = redoPoints[redoPoints.length - 1];
        setActiveVectorStroke((stroke) => [...stroke, point]);
        return redoPoints.slice(0, -1);
      });
      return;
    }

    setVectorHistory((history) => redoHistoryState(history));
  }

  function clearVectorDraft() {
    const hasEntries =
      vectorHistory.present.strokes.length > 0 ||
      vectorHistory.present.texts.length > 0 ||
      activeVectorStroke.length > 0;

    if (hasEntries) {
      setVectorHistory((history) =>
        pushHistoryState(history, {
          strokes: [],
          texts: [],
        }),
      );
    }

    setActiveVectorStroke([]);
    setActiveVectorRedoPoints([]);
    setVectorTextPlacementEnabled(false);
  }

  async function saveVectorAnnotation() {
    const draft = vectorHistory.present;

    const finalStrokes =
      activeVectorStroke.length >= 2
        ? [
            ...draft.strokes,
            {
              id: createLocalId("vector_stroke"),
              points: activeVectorStroke,
              color: vectorColor,
              width: vectorLineWidth,
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
        annotation_type: "anchored_vector",
        title: vectorTitle.trim() || `${selectedPin ? selectedPin.title : "Main map"} vector`,
        notes: vectorNotes.trim() || null,
        vector_strokes: serializeVectorAnnotation({
          strokes: finalStrokes,
          texts: draft.texts,
        }),
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
    setSnapshotHistory(createHistoryState({ strokes: [], texts: [] }));
    setActiveSnapshotStroke([]);
    setActiveSnapshotRedoPoints([]);
    setSnapshotColor(DEFAULT_DRAW_COLOR);
    setSnapshotLineWidth(DEFAULT_DRAW_WIDTH);
    setSnapshotTextDraft("");
    setSnapshotTextPlacementEnabled(false);
    setSnapshotCanvasSize({ width: 0, height: 0 });
  }

  async function startSnapshotEditor() {
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
      setSnapshotTitle(selectedPin ? `${selectedPin.title} snapshot` : "Main map snapshot");
      setSnapshotNotes("");
      setSnapshotHistory(createHistoryState({ strokes: [], texts: [] }));
      setActiveSnapshotStroke([]);
      setActiveSnapshotRedoPoints([]);
      setSnapshotColor(DEFAULT_DRAW_COLOR);
      setSnapshotLineWidth(DEFAULT_DRAW_WIDTH);
      setSnapshotTextDraft("");
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

  const vectorCanUndo = activeVectorStroke.length > 0 || vectorHistory.past.length > 0;
  const vectorCanRedo = activeVectorRedoPoints.length > 0 || vectorHistory.future.length > 0;
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

  const vectorDraftCard =
    vectorModeEnabled ? (
      <AppCard className="gap-3">
        <View className="flex-row items-center justify-between gap-3">
          <AppText variant="heading">Anchored Vector</AppText>
          <AppButton width="auto" variant="ghost" label="Cancel" onPress={stopVectorMode} />
        </View>

        <AppText variant="caption">
          Drawing target: {selectedPin ? selectedPin.title : "Main map"}. Tap or long-press to draw.
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

        <View className="gap-2 rounded-xl border border-border p-3 dark:border-borderDark">
          <AppText variant="label">Drawing style</AppText>

          <View className="flex-row flex-wrap gap-2">
            {DRAW_COLORS.map((colorOption) => {
              const selected = colorOption.toLowerCase() === vectorColor.toLowerCase();
              return (
                <Pressable
                  key={colorOption}
                  accessibilityRole="button"
                  accessibilityLabel={`Select color ${colorOption}`}
                  className={cn(
                    "h-7 w-7 rounded-full border",
                    selected ? "border-foreground dark:border-foregroundDark" : "border-border dark:border-borderDark",
                  )}
                  style={{ backgroundColor: colorOption }}
                  onPress={() => setVectorColor(colorOption)}
                />
              );
            })}
          </View>

          <View className="flex-row flex-wrap gap-2">
            {DRAW_WIDTH_OPTIONS.map((option) => (
              <AppButton
                key={`vector-width-${option}`}
                width="auto"
                variant={vectorLineWidth === option ? "primary" : "secondary"}
                label={`${option}px`}
                onPress={() => setVectorLineWidth(option)}
              />
            ))}
          </View>

          <AppInput
            label="Text label"
            placeholder="e.g. Slow down before entry"
            value={vectorTextDraft}
            onChangeText={setVectorTextDraft}
          />
          <AppButton
            width="auto"
            variant={vectorTextPlacementEnabled ? "primary" : "secondary"}
            label={vectorTextPlacementEnabled ? "Tap map to place text" : "Place text"}
            onPress={() => setVectorTextPlacementEnabled((previous) => !previous)}
          />
        </View>

        <AppText variant="caption">
          Strokes: {vectorHistory.present.strokes.length}
          {activeVectorStroke.length > 0 ? ` + active (${activeVectorStroke.length} points)` : ""} | Text:
          {` ${vectorHistory.present.texts.length}`}
        </AppText>

        <View className="flex-row flex-wrap gap-2">
          <AppButton
            width="auto"
            variant="secondary"
            label="Finish stroke"
            disabled={activeVectorStroke.length < 2}
            onPress={finishVectorStroke}
          />
          <AppButton width="auto" variant="secondary" label="Undo" disabled={!vectorCanUndo} onPress={undoVectorAction} />
          <AppButton width="auto" variant="secondary" label="Redo" disabled={!vectorCanRedo} onPress={redoVectorAction} />
          <AppButton width="auto" variant="secondary" label="Clear all" onPress={clearVectorDraft} />
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
        Anchored vectors: {activeVectorAnnotations.length} | Snapshots: {activeSnapshotAnnotations.length}
      </AppText>

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

      {activeVectorAnnotations.slice(0, 3).map((annotation) => (
        <View
          key={annotation.id}
          className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
        >
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <AppText variant="label">{annotation.title}</AppText>
              <AppText variant="caption">
                {annotation.strokes.length} stroke{annotation.strokes.length === 1 ? "" : "s"},{" "}
                {annotation.texts.length} text label{annotation.texts.length === 1 ? "" : "s"}
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

  const mapAnnotationsCard = !draftCoordinate && !vectorModeEnabled && !selectedPin ? (
    <AppCard className="gap-3">
      <View className="flex-row items-center justify-between gap-3">
        <AppText variant="heading">Main Map Annotations</AppText>
      </View>

      <AppText variant="caption">
        Anchored vectors: {mapLevelVectorAnnotations.length} | Snapshots: {mapLevelSnapshotAnnotations.length}
      </AppText>

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

      {mapLevelVectorAnnotations.slice(0, 3).map((annotation) => (
        <View
          key={annotation.id}
          className="rounded-xl border border-border bg-background px-3 py-2 dark:border-borderDark dark:bg-backgroundDark"
        >
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-1">
              <AppText variant="label">{annotation.title}</AppText>
              <AppText variant="caption">
                {annotation.strokes.length} stroke{annotation.strokes.length === 1 ? "" : "s"},{" "}
                {annotation.texts.length} text label{annotation.texts.length === 1 ? "" : "s"}
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

      {mapLevelSnapshotAnnotations.length === 0 && mapLevelVectorAnnotations.length === 0 ? (
        <AppText variant="caption">
          Tip: Use Anchored vector or Snapshot from the top panel to annotate the main map.
        </AppText>
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
      placingText={snapshotTextPlacementEnabled}
      saving={createMapAnnotation.isPending}
      canUndo={snapshotCanUndo}
      canRedo={snapshotCanRedo}
      onClose={closeSnapshotEditor}
      onChangeTitle={setSnapshotTitle}
      onChangeNotes={setSnapshotNotes}
      onChangeTextDraft={setSnapshotTextDraft}
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

            {visibleVectorAnnotations.map((annotation) => (
              <View key={`vector-render-${annotation.id}`}>
                {annotation.strokes.map((stroke) => (
                  <MapPolyline
                    key={`${annotation.id}:${stroke.id}`}
                    coordinates={stroke.points}
                    strokeColor={stroke.color}
                    strokeWidth={stroke.width}
                  />
                ))}

                {annotation.texts.map((textEntry) => (
                  <Marker
                    key={`${annotation.id}:${textEntry.id}`}
                    coordinate={textEntry.coordinate}
                    tracksViewChanges={false}
                    anchor={{ x: 0.5, y: 1 }}
                  >
                    <View className="rounded-md bg-black/75 px-2 py-1">
                      <AppText variant="caption" className="text-white">
                        {textEntry.text}
                      </AppText>
                    </View>
                  </Marker>
                ))}
              </View>
            ))}

            {vectorHistory.present.strokes.map((stroke) => (
              <MapPolyline
                key={stroke.id}
                coordinates={stroke.points}
                strokeColor={stroke.color}
                strokeWidth={stroke.width}
              />
            ))}

            {vectorHistory.present.texts.map((textEntry) => (
              <Marker
                key={textEntry.id}
                coordinate={textEntry.coordinate}
                tracksViewChanges={false}
                anchor={{ x: 0.5, y: 1 }}
              >
                <View className="rounded-md bg-black/75 px-2 py-1">
                  <AppText variant="caption" className="text-white">
                    {textEntry.text}
                  </AppText>
                </View>
              </Marker>
            ))}

            {activeVectorStroke.length >= 2 ? (
              <MapPolyline
                coordinates={activeVectorStroke}
                strokeColor={vectorColor}
                strokeWidth={vectorLineWidth}
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
                    Long-press to add pins. Use Anchored vector/Snapshot for selected pin or main map.
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
                editable={!mapSearchPending}
              />

              <View className="flex-row flex-wrap gap-2">
                <AppButton
                  width="auto"
                  variant="secondary"
                  label={mapSearchPending ? "Searching..." : "Search address"}
                  disabled={mapSearchPending}
                  onPress={() => void searchAddressAndZoom()}
                />
                <AppButton
                  width="auto"
                  variant="ghost"
                  label="Clear"
                  onPress={() => setMapSearchValue("")}
                />
              </View>

              {!placesConfigured ? (
                <AppText variant="caption">
                  Set GOOGLE_MAPS_API_KEY to enable New Zealand address autocomplete/search.
                </AppText>
              ) : null}

              <AppSegmentedControl<MapLayer>
                value={mapLayer}
                options={MAP_LAYER_OPTIONS}
                onChange={setMapLayer}
              />

              <View className="flex-row flex-wrap gap-2">
                <AppButton
                  width="auto"
                  variant={vectorModeEnabled ? "primary" : "secondary"}
                  label={vectorModeEnabled ? "Vector mode active" : "Anchored vector"}
                  onPress={vectorModeEnabled ? stopVectorMode : startVectorMode}
                />
                <AppButton
                  width="auto"
                  variant="secondary"
                  icon={Camera}
                  label={snapshotCapturePending ? "Capturing..." : "Snapshot"}
                  disabled={snapshotCapturePending || vectorModeEnabled}
                  onPress={() => void startSnapshotEditor()}
                />
              </View>

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
              selectedPinCard ??
              mapAnnotationsCard ?? (
                <Pressable
                  accessibilityRole="button"
                  className="rounded-xl border border-border bg-card/95 px-4 py-3 dark:border-borderDark dark:bg-cardDark/95"
                  onPress={() => startDraftAtCoordinate(mapCenter)}
                >
                  <AppText variant="caption">
                    Tip: Long-press to add a pin. Use Anchored vector or Snapshot from the top panel to annotate the map.
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
