import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, {
  Marker,
  PROVIDER_GOOGLE,
  type LatLng,
} from "react-native-maps";
import { MapPin, Plus, RefreshCw, Trash2, User } from "lucide-react-native";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppInput } from "../../components/AppInput";
import { AppSegmentedControl } from "../../components/AppSegmentedControl";
import { AppText } from "../../components/AppText";
import { useCurrentUser } from "../../features/auth/current-user";
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

export function GoogleMapsScreen(_props: Props) {
  const { profile } = useCurrentUser();
  const pinsQuery = useMapPinsQuery({ organizationId: profile.organization_id });
  const studentsQuery = useStudentsQuery({ archived: false });
  const createMapPin = useCreateMapPinMutation();
  const deleteMapPin = useDeleteMapPinMutation();

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

  function clearDraft() {
    setDraftCoordinate(null);
    setDraftTitle("");
    setDraftNotes("");
    setDraftStudentId(null);
    setStudentSearch("");
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
        <AppButton
          width="auto"
          variant="danger"
          icon={Trash2}
          label={deleteMapPin.isPending ? "Deleting..." : "Delete"}
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
    </AppCard>
  ) : null;

  return (
    <SafeAreaView className={cn(theme.screen.safeArea, "px-0 py-0")} edges={["bottom"]}>
      <View className="flex-1">
        <MapView
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
                  Long-press to add a pin. Tap a marker to view or delete it.
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
                  onPress={() => void pinsQuery.refetch()}
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

            {pinsQuery.isError ? <AppText variant="error">{toErrorMessage(pinsQuery.error)}</AppText> : null}

            {studentsQuery.isError ? (
              <AppText variant="error">{toErrorMessage(studentsQuery.error)}</AppText>
            ) : null}
          </AppCard>
        </View>

        <View pointerEvents="box-none" className="absolute bottom-4 left-4 right-4">
          {draftCard ?? selectedPinCard ?? (
            <Pressable
              accessibilityRole="button"
              className="rounded-xl border border-border bg-card/95 px-4 py-3 dark:border-borderDark dark:bg-cardDark/95"
              onPress={() => startDraftAtCoordinate(mapCenter)}
            >
              <AppText variant="caption">
                Tip: Long-press anywhere to add a pin with notes, or tap here to drop one at center.
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
  );
}
