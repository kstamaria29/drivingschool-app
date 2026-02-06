import type { GestureResponderHandlers, LayoutChangeEvent } from "react-native";
import { Image, Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline as SvgPolyline } from "react-native-svg";

import { AppButton } from "../../components/AppButton";
import { AppInput } from "../../components/AppInput";
import { AppText } from "../../components/AppText";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import type { SnapshotPoint, SnapshotStroke } from "../../features/map-annotations/codec";

type Props = {
  visible: boolean;
  imageBase64: string | null;
  title: string;
  notes: string;
  strokes: SnapshotStroke[];
  activeStroke: SnapshotPoint[];
  saving: boolean;
  onClose: () => void;
  onChangeTitle: (value: string) => void;
  onChangeNotes: (value: string) => void;
  onUndo: () => void;
  onClear: () => void;
  onSave: () => void;
  onCanvasLayout: (event: LayoutChangeEvent) => void;
  panHandlers: GestureResponderHandlers;
};

function pointsToSvgPath(points: SnapshotPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

export function SnapshotAnnotationModal({
  visible,
  imageBase64,
  title,
  notes,
  strokes,
  activeStroke,
  saving,
  onClose,
  onChangeTitle,
  onChangeNotes,
  onUndo,
  onClear,
  onSave,
  onCanvasLayout,
  panHandlers,
}: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className={cn(theme.screen.safeArea, "px-4 py-4")}>
        <View className="flex-1 gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <AppText variant="heading">Snapshot Annotation</AppText>
            <AppButton width="auto" variant="ghost" label="Close" onPress={onClose} />
          </View>

          <AppInput label="Title" value={title} onChangeText={onChangeTitle} />
          <AppInput
            label="Notes"
            value={notes}
            onChangeText={onChangeNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            inputClassName="h-20 py-3"
          />

          <View
            className="flex-1 overflow-hidden rounded-2xl border border-border bg-black dark:border-borderDark"
            onLayout={onCanvasLayout}
          >
            {imageBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${imageBase64}` }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}

            <Svg style={StyleSheet.absoluteFillObject}>
              {strokes.map((stroke) => (
                <SvgPolyline
                  key={stroke.id}
                  points={pointsToSvgPath(stroke.points)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ))}

              {activeStroke.length >= 2 ? (
                <SvgPolyline
                  points={pointsToSvgPath(activeStroke)}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={3}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              ) : null}
            </Svg>

            <View style={StyleSheet.absoluteFillObject} {...panHandlers} />
          </View>

          <View className="flex-row flex-wrap gap-2">
            <AppButton width="auto" variant="secondary" label="Undo" onPress={onUndo} />
            <AppButton width="auto" variant="secondary" label="Clear" onPress={onClear} />
            <AppButton
              width="auto"
              label={saving ? "Saving..." : "Save snapshot"}
              disabled={saving}
              onPress={onSave}
            />
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
