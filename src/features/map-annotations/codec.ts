export const DEFAULT_DRAW_COLOR = "#ef4444";
export const DEFAULT_DRAW_WIDTH = 4;

type JsonRecord = Record<string, unknown>;

export type SnapshotPoint = {
  x: number;
  y: number;
};

export type SnapshotStroke = {
  id: string;
  points: SnapshotPoint[];
  color: string;
  width: number;
};

export type SnapshotText = {
  id: string;
  text: string;
  color: string;
  x: number;
  y: number;
};

export type SnapshotAnnotationContent = {
  strokes: SnapshotStroke[];
  texts: SnapshotText[];
};

function asRecord(value: unknown): JsonRecord | null {
  if (typeof value !== "object" || value == null || Array.isArray(value)) return null;
  return value as JsonRecord;
}

function asNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asText(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asColor(value: unknown) {
  return asText(value) ?? DEFAULT_DRAW_COLOR;
}

function asStrokeWidth(value: unknown) {
  const numeric = asNumber(value);
  if (numeric == null) return DEFAULT_DRAW_WIDTH;
  return Math.max(1, Math.min(16, numeric));
}

export function parseSnapshotAnnotation(raw: JsonRecord | null): SnapshotAnnotationContent {
  const payload = asRecord(raw);
  const rawStrokes = Array.isArray(payload?.strokes) ? payload.strokes : [];
  const rawTexts = Array.isArray(payload?.texts) ? payload.texts : [];

  const strokes = rawStrokes
    .map((stroke, strokeIndex) => {
      const strokeRecord = asRecord(stroke);
      const id = asText(strokeRecord?.id) ?? `snapshot_${strokeIndex}`;
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

      return {
        id,
        points,
        color: asColor(strokeRecord?.color),
        width: asStrokeWidth(strokeRecord?.width),
      };
    })
    .filter((stroke) => stroke.points.length >= 2);

  const texts = rawTexts
    .map((textEntry, textIndex) => {
      const textRecord = asRecord(textEntry);
      const text = asText(textRecord?.text);
      const x = asNumber(textRecord?.x);
      const y = asNumber(textRecord?.y);
      if (!text || x == null || y == null) return null;

      return {
        id: asText(textRecord?.id) ?? `snapshot_text_${textIndex}`,
        text,
        color: asColor(textRecord?.color),
        x,
        y,
      };
    })
    .filter((text): text is SnapshotText => text != null);

  return { strokes, texts };
}

export function serializeSnapshotAnnotation(content: SnapshotAnnotationContent): JsonRecord {
  return {
    version: 2,
    strokes: content.strokes.map((stroke) => ({
      id: stroke.id,
      color: stroke.color,
      width: stroke.width,
      points: stroke.points.map((point) => ({
        x: point.x,
        y: point.y,
      })),
    })),
    texts: content.texts.map((text) => ({
      id: text.id,
      text: text.text,
      color: text.color,
      x: text.x,
      y: text.y,
    })),
  };
}

export function parseSnapshotStrokes(raw: JsonRecord | null): SnapshotStroke[] {
  return parseSnapshotAnnotation(raw).strokes;
}

export function serializeSnapshotStrokes(strokes: SnapshotStroke[]): JsonRecord {
  return serializeSnapshotAnnotation({ strokes, texts: [] });
}
