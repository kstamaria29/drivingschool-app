import { Platform } from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

import {
  restrictedMockTestCriticalErrors,
  restrictedMockTestImmediateErrors,
  restrictedMockTestStages,
} from "./constants";
import { calculateRestrictedMockTestSummary, getRestrictedMockTestTaskFaults } from "./scoring";
import type { RestrictedMockTestStoredData } from "./schema";

type Input = {
  assessmentId: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  fileName: string;
  androidDirectoryUri?: string;
  values: RestrictedMockTestStoredData;
};

export type ExportRestrictedMockTestPdfResult = {
  uri: string;
  savedTo: "downloads" | "app_storage";
};

function sanitizeFileName(input: string) {
  const withoutReserved = input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "");
  const collapsed = withoutReserved.trim().replace(/\s+/g, "_");
  const safe = collapsed === "" ? "restricted_mock_test" : collapsed;
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

function buildHtml(input: Input) {
  const v = input.values;
  const summary = v.summary
    ? v.summary
    : calculateRestrictedMockTestSummary({
        stagesState: v.stagesState,
        critical: v.critical,
        immediate: v.immediate,
      });

  const dateTime = [v.date?.trim(), v.time?.trim()].filter(Boolean).join(" ");
  const logoUrl = input.organizationLogoUrl?.trim() || "";
  const logoHtml = logoUrl
    ? `<div class="header-right"><img class="logo" src="${escapeHtml(logoUrl)}" /></div>`
    : "";

  function renderStage(stageId: "stage1" | "stage2") {
    const stage = restrictedMockTestStages.find((s) => s.id === stageId);
    if (!stage) return "";

    const stageTasks = v.stagesState[stageId] || {};
    const rows = stage.tasks
      .map((taskDef) => {
        const t = stageTasks?.[taskDef.id];
        if (!t) return null;

        const faults = getRestrictedMockTestTaskFaults(t);
        const hasDetails =
          Boolean(t.location?.trim()) || Boolean(t.notes?.trim()) || faults.length > 0;
        if (!hasDetails) return null;

        return `
          <div class="task">
            <div class="task-head">
              <div class="task-name">${escapeHtml(taskDef.name)}</div>
              <div class="task-speed">Typical speed: ${escapeHtml(taskDef.speed)}</div>
            </div>
            ${t.location?.trim() ? `<div><span class="label">Location:</span> ${escapeHtml(t.location.trim())}</div>` : ""}
            ${faults.length ? `<div><span class="label">Faults:</span> ${escapeHtml(faults.join(", "))}</div>` : ""}
            ${t.notes?.trim() ? `<div class="pre"><span class="label">Notes:</span> ${escapeHtml(t.notes.trim())}</div>` : ""}
          </div>
        `;
      })
      .filter(Boolean)
      .join("");

    if (!rows) {
      return `<div class="muted">No items recorded for this stage.</div>`;
    }

    return `<div class="stage">${rows}</div>`;
  }

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
        .org { font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; font-size: 12px; margin-bottom: 4px; }
        .muted { color: #475569; font-size: 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .header-left { flex: 1; min-width: 0; }
        .header-right { flex-shrink: 0; display: flex; justify-content: flex-end; }
        .logo { height: 44px; width: auto; max-width: 140px; object-fit: contain; }
        .box-soft { border: 1px solid #0f172a; padding: 10px 12px; border-radius: 0; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 3px 0; vertical-align: top; }
        .label { color: #334155; font-size: 10px; font-weight: 700; }
        .value { font-size: 10.5px; }
        .section { margin-top: 10px; }
        .pre { white-space: pre-wrap; }
        .pill-grid { display: flex; gap: 10px; flex-wrap: wrap; }
        .pill { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; min-width: 160px; }
        .pill-title { color: #475569; font-size: 10px; margin-bottom: 4px; font-weight: 700; }
        .pill-value { font-size: 12px; font-weight: 700; }
        .list { margin: 6px 0 0 0; padding-left: 14px; }
        .list li { margin: 2px 0; }
        .task { border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; }
        .task:first-child { border-top: none; padding-top: 0; margin-top: 0; }
        .task-head { display: flex; justify-content: space-between; gap: 10px; }
        .task-name { font-weight: 700; }
        .task-speed { color: #475569; font-size: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          <div class="org">${escapeHtml(input.organizationName)}</div>
          <h1>Mock Test – Restricted Licence</h1>
          <div class="muted">Student: ${escapeHtml(v.candidateName || "N/A")}</div>
        </div>
        ${logoHtml}
      </div>

      <div class="section box-soft">
        <h2>Session details</h2>
        <table class="grid">
          <tr><td class="label">Candidate</td><td class="value">${escapeHtml(v.candidateName || "N/A")}</td></tr>
          <tr><td class="label">Instructor</td><td class="value">${escapeHtml(v.instructor || "N/A")}</td></tr>
          <tr><td class="label">Date / time</td><td class="value">${escapeHtml(dateTime || "N/A")}</td></tr>
          <tr><td class="label">Vehicle</td><td class="value">${escapeHtml(v.vehicleInfo || "N/A")}</td></tr>
          <tr><td class="label">Route / area</td><td class="value">${escapeHtml(v.routeInfo || "N/A")}</td></tr>
        </table>
        ${v.preDriveNotes?.trim() ? `<div class="section pre"><span class="label">Pre-drive notes:</span>\n${escapeHtml(v.preDriveNotes.trim())}</div>` : ""}
      </div>

      <div class="section box-soft">
        <h2>Overview</h2>
        <div class="pill-grid">
          <div class="pill">
            <div class="pill-title">Stage 1 task faults</div>
            <div class="pill-value">${escapeHtml(String(summary.stage1Faults))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Stage 2 task faults</div>
            <div class="pill-value">${escapeHtml(String(summary.stage2Faults))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Critical errors</div>
            <div class="pill-value">${escapeHtml(String(summary.criticalTotal))}</div>
          </div>
          <div class="pill">
            <div class="pill-title">Immediate failure errors</div>
            <div class="pill-value">${escapeHtml(String(summary.immediateTotal))}</div>
          </div>
        </div>
        <div class="section pre">${escapeHtml(summary.resultText || "")}</div>
      </div>

      <div class="section box-soft">
        <h2>Stage 1 – recorded items</h2>
        ${renderStage("stage1")}
      </div>

      <div class="section box-soft">
        <h2>Stage 2 – recorded items</h2>
        ${v.stage2Enabled ? renderStage("stage2") : `<div class="muted">Stage 2 not enabled.</div>`}
      </div>

      ${renderErrorCounts("Critical errors", restrictedMockTestCriticalErrors, v.critical || {})}
      ${v.criticalNotes?.trim() ? `<div class="section box-soft pre"><span class="label">Critical notes:</span>\n${escapeHtml(v.criticalNotes.trim())}</div>` : ""}

      ${renderErrorCounts("Immediate failure errors", restrictedMockTestImmediateErrors, v.immediate || {})}
      ${v.immediateNotes?.trim() ? `<div class="section box-soft pre"><span class="label">Immediate notes:</span>\n${escapeHtml(v.immediateNotes.trim())}</div>` : ""}
    </body>
  </html>
  `;
}

export async function exportRestrictedMockTestPdf(input: Input) {
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

      return { uri: createdUri, savedTo: "downloads" } satisfies ExportRestrictedMockTestPdfResult;
    } catch {
      // Fall back to app storage if SAF permission is missing or has been revoked.
    }
  }

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("Couldn't access a writable folder to save the PDF.");
  }

  const folderUri = `${baseDir}restricted-mock-tests/`;
  const folderInfo = await FileSystem.getInfoAsync(folderUri);
  if (!folderInfo.exists) {
    await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
  }

  const destinationUri = `${folderUri}${sanitizeFileName(input.fileName)}.pdf`;
  await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: destinationUri });

  return { uri: destinationUri, savedTo: "app_storage" } satisfies ExportRestrictedMockTestPdfResult;
}
