import type { LatLng } from "react-native-maps";

export type VectorStroke = {
  id: string;
  points: LatLng[];
};

export type SnapshotPoint = {
  x: number;
  y: number;
};

export type SnapshotStroke = {
  id: string;
  points: SnapshotPoint[];
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value == null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseVectorStrokes(raw: Record<string, unknown> | null): VectorStroke[] {
  const payload = asRecord(raw);
  const rawStrokes = Array.isArray(payload?.strokes) ? payload.strokes : [];

  return rawStrokes
    .map((stroke, strokeIndex) => {
      const strokeRecord = asRecord(stroke);
      const id =
        typeof strokeRecord?.id === "string" && strokeRecord.id.trim()
          ? strokeRecord.id
          : `vector_${strokeIndex}`;
      const rawPoints = Array.isArray(strokeRecord?.points) ? strokeRecord.points : [];

      const points = rawPoints
        .map((point) => {
          const pointRecord = asRecord(point);
          const latitude = asNumber(pointRecord?.latitude);
          const longitude = asNumber(pointRecord?.longitude);
          if (latitude == null || longitude == null) return null;
          return { latitude, longitude };
        })
        .filter((point): point is LatLng => point != null);

      return { id, points };
    })
    .filter((stroke) => stroke.points.length >= 2);
}

export function parseSnapshotStrokes(raw: Record<string, unknown> | null): SnapshotStroke[] {
  const payload = asRecord(raw);
  const rawStrokes = Array.isArray(payload?.strokes) ? payload.strokes : [];

  return rawStrokes
    .map((stroke, strokeIndex) => {
      const strokeRecord = asRecord(stroke);
      const id =
        typeof strokeRecord?.id === "string" && strokeRecord.id.trim()
          ? strokeRecord.id
          : `snapshot_${strokeIndex}`;
      const rawPoints = Array.isArray(strokeRecord?.points) ? strokeRecord.points : [];

      const points = rawPoints
        .map((point) => {
          const pointRecord = asRecord(point);
          const x = asNumber(pointRecord?.x);
          const y = asNumber(pointRecord?.y);
          if (x == null || y == null) return null;
          return { x, y };
        })
        .filter((point): point is SnapshotPoint => point != null);

      return { id, points };
    })
    .filter((stroke) => stroke.points.length >= 2);
}

export function serializeVectorStrokes(strokes: VectorStroke[]): Record<string, unknown> {
  return {
    version: 1,
    strokes: strokes.map((stroke) => ({
      id: stroke.id,
      points: stroke.points.map((point) => ({
        latitude: point.latitude,
        longitude: point.longitude,
      })),
    })),
  };
}

export function serializeSnapshotStrokes(strokes: SnapshotStroke[]): Record<string, unknown> {
  return {
    version: 1,
    strokes: strokes.map((stroke) => ({
      id: stroke.id,
      points: stroke.points.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    })),
  };
}
