import dayjs from "dayjs";
import type { LayoutChangeEvent } from "react-native";
import { Image, Modal, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Polyline as SvgPolyline } from "react-native-svg";

import { AppButton } from "../../components/AppButton";
import { AppText } from "../../components/AppText";
import type { SnapshotPoint, SnapshotStroke } from "../../features/map-annotations/codec";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";

export type SnapshotPreview = {
  id: string;
  title: string;
  notes: string | null;
  imageBase64: string;
  strokes: SnapshotStroke[];
  width: number;
  height: number;
  createdAt: string;
};

type CanvasSize = {
  width: number;
  height: number;
};

type Props = {
  snapshot: SnapshotPreview | null;
  canvasSize: CanvasSize;
  onClose: () => void;
  onCanvasLayout: (event: LayoutChangeEvent) => void;
};

function pointsToSvgPath(points: SnapshotPoint[]) {
  return points.map((point) => `${point.x},${point.y}`).join(" ");
}

function scalePoint(
  point: SnapshotPoint,
  originalWidth: number,
  originalHeight: number,
  targetSize: CanvasSize,
) {
  if (originalWidth <= 0 || originalHeight <= 0 || targetSize.width <= 0 || targetSize.height <= 0) {
    return point;
  }
  return {
    x: (point.x / originalWidth) * targetSize.width,
    y: (point.y / originalHeight) * targetSize.height,
  };
}

export function SnapshotPreviewModal({
  snapshot,
  canvasSize,
  onClose,
  onCanvasLayout,
}: Props) {
  return (
    <Modal visible={snapshot != null} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className={cn(theme.screen.safeArea, "px-4 py-4")}>
        <View className="flex-1 gap-3">
          <View className="flex-row items-center justify-between gap-3">
            <View className="flex-1">
              <AppText variant="heading">{snapshot?.title ?? "Snapshot"}</AppText>
              {snapshot ? (
                <AppText variant="caption">
                  {dayjs(snapshot.createdAt).format("DD MMM YYYY, h:mm A")}
                </AppText>
              ) : null}
            </View>
            <AppButton width="auto" variant="ghost" label="Close" onPress={onClose} />
          </View>

          {snapshot?.notes ? <AppText variant="body">{snapshot.notes}</AppText> : null}

          <View
            className="flex-1 overflow-hidden rounded-2xl border border-border bg-black dark:border-borderDark"
            onLayout={onCanvasLayout}
          >
            {snapshot ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${snapshot.imageBase64}` }}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            ) : null}

            {snapshot ? (
              <Svg style={StyleSheet.absoluteFillObject}>
                {snapshot.strokes.map((stroke) => (
                  <SvgPolyline
                    key={stroke.id}
                    points={pointsToSvgPath(
                      stroke.points.map((point) =>
                        scalePoint(point, snapshot.width, snapshot.height, canvasSize),
                      ),
                    )}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                ))}
              </Svg>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
