import { Platform } from "react-native";

import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";

type Input = {
  assessmentId: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
  fileName: string;
  androidDirectoryUri?: string;
  criteria: Record<string, readonly string[]>;
  values: {
    clientName: string;
    address: string;
    contact: string;
    email: string;
    licenseNumber: string;
    licenseVersion: string;
    classHeld: string;
    issueDate: string;
    expiryDate: string;
    date: string;
    instructor: string;
    scores: Record<string, Record<string, string> | string[]>;
    strengths: string;
    improvements: string;
    recommendation: string;
    nextSteps: string;
    totalScorePercent: number | null;
    totalScoreRaw: number;
    feedbackSummary: string;
  };
};

export type ExportDrivingAssessmentPdfResult = {
  uri: string;
  savedTo: "downloads" | "app_storage";
};

function sanitizeFileName(input: string) {
  const withoutReserved = input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "");
  const collapsed = withoutReserved.trim().replace(/\s+/g, "_");
  const safe = collapsed === "" ? "driving_assessment" : collapsed;
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
  const totalPercent = v.totalScorePercent == null ? "N/A" : `${v.totalScorePercent}%`;
  const logoUrl = input.organizationLogoUrl?.trim() || "";
  const logoHtml = logoUrl
    ? `<div class="header-right"><img class="logo" src="${escapeHtml(logoUrl)}" /></div>`
    : "";

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
        h3 { font-size: 11px; margin: 8px 0 4px 0; }
        .org { font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; font-size: 12px; margin-bottom: 4px; }
        .muted { color: #475569; font-size: 10px; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .header-left { flex: 1; min-width: 0; }
        .header-right { flex-shrink: 0; display: flex; justify-content: flex-end; }
        .logo { height: 44px; width: auto; max-width: 140px; object-fit: contain; }
        .page { page-break-after: always; }
        .page:last-child { page-break-after: auto; }
        .box { border: 1px solid #0f172a; padding: 10px 12px; }
        .box-soft { border: 1px solid #0f172a; padding: 10px 12px; border-radius: 0; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 3px 0; vertical-align: top; }
        .label { width: 34%; color: #334155; font-size: 10px; }
        .value { width: 66%; font-size: 10.5px; }
        .section { margin-top: 10px; }
        .pre { white-space: pre-wrap; }
        .guide-title { font-weight: 700; margin: 0 0 8px 0; }
        .guide-lines { margin: 0; padding-left: 14px; }
        .guide-lines li { margin: 3px 0; }
        .ranges { margin-top: 10px; }
        .ranges-grid { display: flex; gap: 14px; align-items: flex-start; }
        .ranges-grid > div { flex: 1; }
        .range { margin: 8px 0 10px 0; }
        .range-head { font-weight: 700; font-size: 10px; margin-bottom: 3px; }
        .range-lines { margin: 0; padding-left: 14px; }
        .range-lines li { margin: 1px 0; }
        .scores { width: 100%; border-collapse: collapse; font-size: 9.5px; }
        .scores th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 5px 4px; color: #475569; }
        .scores td { border-bottom: 1px solid #f1f5f9; padding: 5px 4px; vertical-align: top; }
        .scores .col-cat { width: 88px; }
        .scores .col-score { width: 42px; text-align: center; }
        .feedback h3 { margin-top: 10px; }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div class="header-left">
            <div class="org">${escapeHtml(input.organizationName)}</div>
            <h1>Driving Assessment Result Form</h1>
            <div class="muted">Student: ${escapeHtml(v.clientName || "N/A")}</div>
          </div>
          ${logoHtml}
        </div>

        <div class="section box-soft">
          <h2>Personal information</h2>
          <table class="grid">
            <tr><td class="label">Client name</td><td class="value">${escapeHtml(v.clientName)}</td></tr>
            <tr><td class="label">Address</td><td class="value">${escapeHtml(v.address)}</td></tr>
            <tr><td class="label">Contact</td><td class="value">${escapeHtml(v.contact)}</td></tr>
            <tr><td class="label">Email</td><td class="value">${escapeHtml(v.email)}</td></tr>
            <tr><td class="label">Licence number</td><td class="value">${escapeHtml(v.licenseNumber)}</td></tr>
            <tr><td class="label">Version</td><td class="value">${escapeHtml(v.licenseVersion)}</td></tr>
            <tr><td class="label">Class held</td><td class="value">${escapeHtml(v.classHeld)}</td></tr>
            <tr><td class="label">Issue date</td><td class="value">${escapeHtml(v.issueDate)}</td></tr>
            <tr><td class="label">Expiry date</td><td class="value">${escapeHtml(v.expiryDate)}</td></tr>
            <tr><td class="label">Date of assessment</td><td class="value">${escapeHtml(v.date)}</td></tr>
            <tr><td class="label">Instructor</td><td class="value">${escapeHtml(v.instructor)}</td></tr>
          </table>
        </div>

        <div class="section box">
          <div class="guide-title">Assessment Scoring Guide:</div>
          <ul class="guide-lines">
            <li><strong>5 = Excellent:</strong> Consistently demonstrates mastery of the skill.</li>
            <li><strong>4 = Good:</strong> Performs well with minor errors or areas for improvement.</li>
            <li><strong>3 = Satisfactory:</strong> Demonstrates basic competence but needs practice.</li>
            <li><strong>2 = Needs Improvement:</strong> Struggles with the skill and requires significant practice.</li>
            <li><strong>1 = Unsatisfactory:</strong> Lacks understanding or ability in the skill.</li>
          </ul>

          <div class="ranges">
            <h2 style="margin-top: 14px;">Total Score Assessment Guide</h2>

            <div class="ranges-grid">
              <div>
                <div class="range">
                  <div class="range-head">(90 - 100) Excellent</div>
                  <ul class="range-lines">
                    <li>You have demonstrated outstanding driving ability.</li>
                    <li>Your vehicle control, observation, decision-making, and communication skills show readiness for solo driving.</li>
                    <li>Keep maintaining this high standard.</li>
                  </ul>
                </div>

                <div class="range">
                  <div class="range-head">(80 - 89) Very Good</div>
                  <ul class="range-lines">
                    <li>You have shown strong skills in most areas.</li>
                    <li>Minor improvements can be made in consistency or attention to specific road situations.</li>
                    <li>You're almost ready for your driving test.</li>
                  </ul>
                </div>

                <div class="range">
                  <div class="range-head">(68 - 79) Competent</div>
                  <ul class="range-lines">
                    <li>You are developing well as a driver.</li>
                    <li>Focus on strengthening a few weaker areas, such as observation or road rules, to build greater confidence and control.</li>
                    <li>With more practice, you'll be test-ready.</li>
                  </ul>
                </div>
              </div>

              <div>
                <div class="range">
                  <div class="range-head">(52 - 67) Needs Improvement</div>
                  <ul class="range-lines">
                    <li>Some key driving skills need more practice and development.</li>
                    <li>Concentrate on smoother control, better decision-making, and consistent observation techniques.</li>
                    <li>A few more lessons are recommended.</li>
                  </ul>
                </div>

                <div class="range">
                  <div class="range-head">(32 - 51) At Risk</div>
                  <ul class="range-lines">
                    <li>You're not yet ready for solo driving.</li>
                    <li>Several critical areas need focused attention.</li>
                    <li>A structured plan and frequent practice is essential.</li>
                  </ul>
                </div>

                <div class="range">
                  <div class="range-head">(0 - 31) Significant Support Needed</div>
                  <ul class="range-lines">
                    <li>Your driving skills are currently at a foundational level.</li>
                    <li>It's important to revisit basic techniques and work closely with a coach to develop control, awareness, and road understanding.</li>
                    <li>Don't be discouraged - with steady guidance and practice, you will progress.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="page">
        <div class="header">
          <div class="header-left">
            <div class="org">${escapeHtml(input.organizationName)}</div>
            <h1>Driving Assessment</h1>
            <div class="muted">Total score: ${escapeHtml(totalPercent)} (raw: ${escapeHtml(String(v.totalScoreRaw))})</div>
          </div>
          ${logoHtml}
        </div>

        <div class="section box-soft">
          <h2>Assessment scores</h2>
          <table class="scores">
            <thead>
              <tr>
                <th class="col-cat">Category</th>
                <th>Criterion</th>
                <th class="col-score">Score</th>
              </tr>
            </thead>
            <tbody>
              ${Object.entries(input.criteria)
                .map(([categoryKey, items]) =>
                  items
                    .map((label, index) => {
                      const categoryScores = v.scores?.[categoryKey];
                      const score =
                        (Array.isArray(categoryScores)
                          ? categoryScores[index]
                          : categoryScores?.[String(index)]) ?? "";
                      const catTitle = categoryKey
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (s) => s.toUpperCase());
                      return `<tr>
                        <td class="col-cat">${escapeHtml(catTitle)}</td>
                        <td>${escapeHtml(label)}</td>
                        <td class="col-score">${escapeHtml(score || "N/A")}</td>
                      </tr>`;
                    })
                    .join(""),
                )
                .join("")}
            </tbody>
          </table>
        </div>

        <div class="section box-soft feedback">
          <h2>Feedback</h2>

          <h3>Feedback summary</h3>
          <div class="pre">${escapeHtml(v.feedbackSummary || "")}</div>

          <h3>Strengths</h3>
          <div class="pre">${escapeHtml(v.strengths || "N/A")}</div>

          <h3>Improvements</h3>
          <div class="pre">${escapeHtml(v.improvements || "N/A")}</div>

          <h3>Recommendation</h3>
          <div class="pre">${escapeHtml(v.recommendation || "N/A")}</div>

          <h3>Next steps</h3>
          <div class="pre">${escapeHtml(v.nextSteps || "N/A")}</div>
        </div>
      </div>
    </body>
  </html>
  `;
}

export async function exportDrivingAssessmentPdf(input: Input) {
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

      return { uri: createdUri, savedTo: "downloads" } satisfies ExportDrivingAssessmentPdfResult;
    } catch {
      // Fall back to app storage if SAF permission is missing or has been revoked.
    }
  }

  const baseDir = FileSystem.documentDirectory ?? FileSystem.cacheDirectory;
  if (!baseDir) {
    throw new Error("Couldn't access a writable folder to save the PDF.");
  }

  const folderUri = `${baseDir}driving-assessments/`;
  const folderInfo = await FileSystem.getInfoAsync(folderUri);
  if (!folderInfo.exists) {
    await FileSystem.makeDirectoryAsync(folderUri, { intermediates: true });
  }

  const destinationUri = `${folderUri}${sanitizeFileName(input.fileName)}.pdf`;
  await FileSystem.deleteAsync(destinationUri, { idempotent: true });
  await FileSystem.copyAsync({ from: uri, to: destinationUri });

  return { uri: destinationUri, savedTo: "app_storage" } satisfies ExportDrivingAssessmentPdfResult;
}
