import { Platform } from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import dayjs from "dayjs";

import {
  fullLicenseMockTestAssessmentItems,
  fullLicenseMockTestCriticalErrors,
  fullLicenseMockTestImmediateErrors,
} from "./constants";
import {
  calculateFullLicenseMockTestSummary,
  scoreFullLicenseMockTestAttempt,
  type FullLicenseMockTestAttempt,
} from "./scoring";
import type { FullLicenseMockTestStoredData } from "./schema";

type Input = {
  assessmentId: string;
  organizationName: string;
  fileName: string;
  androidDirectoryUri?: string;
  values: FullLicenseMockTestStoredData;
};

export type ExportFullLicenseMockTestPdfResult = {
  uri: string;
  savedTo: "downloads" | "app_storage";
};

function sanitizeFileName(input: string) {
  const withoutReserved = input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "");
  const collapsed = withoutReserved.trim().replace(/\s+/g, "_");
  const safe = collapsed === "" ? "full_license_mock_test" : collapsed;
  return safe.slice(0, 80);
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMMSS(totalSeconds: number) {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(clamped / 60);
  const s = clamped % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function buildHtml(input: Input) {
  const v = input.values;

  const normalizedAttempts: FullLicenseMockTestAttempt[] = (v.attempts ?? []).map((attempt) => {
    const items = fullLicenseMockTestAssessmentItems.reduce((acc, item) => {
      const raw = (attempt.items as Record<string, string> | undefined)?.[item.id];
      acc[item.id] = raw === "F" ? "F" : "P";
      return acc;
    }, {} as FullLicenseMockTestAttempt["items"]);

    return {
      id: attempt.id,
      createdAt: attempt.createdAt,
      taskId: attempt.taskId,
      taskName: attempt.taskName,
      variant: attempt.variant,
      repIndex: attempt.repIndex,
      repTarget: attempt.repTarget,
      items,
      hazardsSpoken: attempt.hazardsSpoken ?? "",
      actionsSpoken: attempt.actionsSpoken ?? "",
      notes: attempt.notes ?? "",
      locationTag: attempt.locationTag ?? "",
    };
  });

  const summary = calculateFullLicenseMockTestSummary({
    attempts: normalizedAttempts,
    critical: v.critical || {},
    immediate: v.immediate || {},
  });

  const dateTime = [v.date?.trim(), v.time?.trim()].filter(Boolean).join(" ");
  const generatedAt = dayjs().format("DD/MM/YYYY HH:mm");

  function renderErrorCounts(title: string, errors: readonly string[], counts: Record<string, number>) {
    const lines = errors
      .map((label) => {
        const count = counts[label] ?? 0;
        return count > 0 ? `<li>${escapeHtml(label)}: ${escapeHtml(String(count))}</li>` : null;
      })
      .filter(Boolean)
      .join("");

    return `
      <div class="section box-soft">
        <h2>${escapeHtml(title)}</h2>
        ${lines ? `<ul class="list">${lines}</ul>` : `<div class="muted">None recorded.</div>`}
      </div>
    `;
  }

  const attemptsChrono = [...normalizedAttempts].reverse();
  const attemptBlocks = attemptsChrono
    .map((attempt) => {
      const scored = scoreFullLicenseMockTestAttempt(attempt);
      const headerMeta: string[] = [];
      if (attempt.variant?.trim()) headerMeta.push(attempt.variant.trim());
      if (attempt.repTarget > 1) headerMeta.push(`Rep ${attempt.repIndex}/${attempt.repTarget}`);
      if (attempt.locationTag?.trim()) headerMeta.push(attempt.locationTag.trim());

      const itemLines = fullLicenseMockTestAssessmentItems
        .map((item) => {
          const value = attempt.items?.[item.id] || "";
          const chipClass = value === "F" ? "chip chip-fail" : "chip chip-pass";
          return `
            <div class="row">
              <div class="row-label">${escapeHtml(item.label)}</div>
              <div class="${chipClass}">${escapeHtml(value || "—")}</div>
            </div>
          `;
        })
        .join("");

      return `
        <div class="attempt">
          <div class="attempt-head">
            <div>
              <div class="attempt-title">${escapeHtml(attempt.taskName || "Task")}</div>
              <div class="muted">${escapeHtml(headerMeta.join(" · ") || "—")}</div>
            </div>
            <div class="pill">
              <div class="pill-title">Fails</div>
              <div class="pill-value">${escapeHtml(String(scored.fails))}/${escapeHtml(String(scored.total))}</div>
            </div>
          </div>

          <div class="grid-2">
            <div class="box-soft">
              <div class="label">Hazards spoken</div>
              <div class="pre">${escapeHtml(attempt.hazardsSpoken?.trim() || "")}</div>
            </div>
            <div class="box-soft">
              <div class="label">Action spoken</div>
              <div class="pre">${escapeHtml(attempt.actionsSpoken?.trim() || "")}</div>
            </div>
          </div>

          ${attempt.notes?.trim() ? `<div class="section pre"><span class="label">Notes:</span>\n${escapeHtml(attempt.notes.trim())}</div>` : ""}

          <div class="section">
            <h3>Assessment items</h3>
            <div class="items">
              ${itemLines}
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        @page { size: A4; margin: 16mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          font-size: 11px;
          line-height: 1.25;
        }
        h1 { font-size: 18px; margin: 0; }
        h2 { font-size: 12px; margin: 10px 0 6px 0; }
        h3 { font-size: 11px; margin: 0 0 6px 0; }
        .org { font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; font-size: 12px; margin-bottom: 4px; }
        .muted { color: #475569; font-size: 10px; }
        .label { color: #334155; font-size: 10px; font-weight: 700; }
        .value { font-size: 10.5px; }
        .box-soft { border: 1px solid #cbd5e1; padding: 10px 12px; border-radius: 10px; }
        .section { margin-top: 10px; }
        .pre { white-space: pre-wrap; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 3px 0; vertical-align: top; }
        .pill-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; min-width: 160px; }
        .pill-title { color: #475569; font-size: 10px; margin-bottom: 4px; font-weight: 700; }
        .pill-value { font-size: 12px; font-weight: 700; }
        .list { margin: 0; padding-left: 16px; }
        .attempt { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; margin-top: 10px; }
        .attempt-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
        .attempt-title { font-weight: 700; font-size: 12px; }
        .items { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
        .row { display: flex; justify-content: space-between; gap: 10px; }
        .row-label { font-size: 10.5px; }
        .chip { border: 1px solid #cbd5e1; border-radius: 999px; padding: 1px 8px; font-weight: 700; font-size: 10px; }
        .chip-pass { background: #ecfdf5; border-color: #a7f3d0; color: #065f46; }
        .chip-fail { background: #fef2f2; border-color: #fecaca; color: #991b1b; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      </style>
    </head>
    <body>
      <div>
        <div class="org">${escapeHtml(input.organizationName)}</div>
        <h1>Mock Test – Full License</h1>
        <div class="muted">Generated: ${escapeHtml(generatedAt)}</div>
      </div>

      <div class="section box-soft">
        <h2>Session details</h2>
        <table class="grid">
          <tr><td class="label">Candidate</td><td class="value">${escapeHtml(v.candidateName || "N/A")}</td></tr>
          <tr><td class="label">Instructor</td><td class="value">${escapeHtml(v.instructor || "N/A")}</td></tr>
          <tr><td class="label">Date / time</td><td class="value">${escapeHtml(dateTime || "N/A")}</td></tr>
          <tr><td class="label">Area</td><td class="value">${escapeHtml(v.locationArea || "N/A")}</td></tr>
          <tr><td class="label">Vehicle</td><td class="value">${escapeHtml(v.vehicle || "N/A")}</td></tr>
          <tr><td class="label">Mode</td><td class="value">${escapeHtml(v.mode === "drill" ? "Skills drill" : "Official-style")}</td></tr>
          <tr><td class="label">Conditions</td><td class="value">${escapeHtml(v.weather || "dry")}</td></tr>
          <tr><td class="label">Start</td><td class="value">${escapeHtml(v.startTimeISO ? dayjs(v.startTimeISO).format("DD/MM/YYYY HH:mm") : "—")}</td></tr>
          <tr><td class="label">End</td><td class="value">${escapeHtml(v.endTimeISO ? dayjs(v.endTimeISO).format("DD/MM/YYYY HH:mm") : "—")}</td></tr>
          <tr><td class="label">Remaining</td><td class="value">${escapeHtml(v.remainingSeconds == null ? "—" : formatMMSS(v.remainingSeconds))}</td></tr>
        </table>
        ${v.overallNotes?.trim() ? `<div class="section pre"><span class="label">Overall notes:</span>\n${escapeHtml(v.overallNotes.trim())}</div>` : ""}
      </div>

      <div class="section box-soft">
        <h2>Overview</h2>
        <div class="pill-grid">
          <div class="pill">
            <div class="pill-title">Attempts</div>
            <div class="pill-value">${escapeHtml(String(summary.attemptsCount))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Score</div>
            <div class="pill-value">${escapeHtml(summary.scorePercent == null ? "—" : `${summary.scorePercent}%`)}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Critical</div>
            <div class="pill-value">${escapeHtml(String(summary.criticalTotal))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Immediate</div>
            <div class="pill-value">${escapeHtml(String(summary.immediateTotal))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Readiness</div>
            <div class="pill-value">${escapeHtml(summary.readiness.label)}</div>
          </div>
        </div>
        <div class="section pre">${escapeHtml(summary.readiness.reason)}</div>
      </div>

      ${renderErrorCounts("Critical errors", fullLicenseMockTestCriticalErrors, v.critical || {})}
      ${v.criticalNotes?.trim() ? `<div class="section box-soft pre"><span class="label">Critical notes:</span>\n${escapeHtml(v.criticalNotes.trim())}</div>` : ""}

      ${renderErrorCounts("Immediate failure errors", fullLicenseMockTestImmediateErrors, v.immediate || {})}
      ${v.immediateNotes?.trim() ? `<div class="section box-soft pre"><span class="label">Immediate notes:</span>\n${escapeHtml(v.immediateNotes.trim())}</div>` : ""}

      <div class="section box-soft">
        <h2>Attempts</h2>
        ${attemptBlocks || `<div class="muted">No attempts recorded.</div>`}
      </div>
    </body>
  </html>
  `;
}

export async function exportFullLicenseMockTestPdf(input: Input) {
  const html = buildHtml(input);
  const { uri } = await Print.printToFileAsync({ html });

  if (Platform.OS === "android" && input.androidDirectoryUri) {
    try {
      const baseName = sanitizeFileName(input.fileName);
      const pdfName = `${baseName}.pdf`;

      const createdUri = await FileSystem.StorageAccessFramework.createFileAsync(
        input.androidDirectoryUri,
        pdfName,
        "application/pdf",
      );

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(createdUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      return { uri: createdUri, savedTo: "downloads" } satisfies ExportFullLicenseMockTestPdfResult;
    } catch {
      // Fall back to app storage if SAF permission is missing or revoked.
    }
  }

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("Couldn't access a writable folder to save the PDF.");
  }

  const folderUri = `${baseDir}full-license-mock-tests/`;
  const folderInfo = await FileSystem.getInfoAsync(folderUri);
  if (!folderInfo.exists) {
    await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
  }

  const destinationUri = `${folderUri}${sanitizeFileName(input.fileName)}.pdf`;
  await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: destinationUri });

  return { uri: destinationUri, savedTo: "app_storage" } satisfies ExportFullLicenseMockTestPdfResult;
}
