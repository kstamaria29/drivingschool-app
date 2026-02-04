import * as Print from "expo-print";
import { isAvailableAsync, shareAsync } from "expo-sharing";

type Input = {
  assessmentId: string;
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
    weather: string;
    date: string;
    instructor: string;
    scores: Record<string, Record<string, string>>;
    strengths: string;
    improvements: string;
    recommendation: string;
    nextSteps: string;
    totalScorePercent: number | null;
    totalScoreRaw: number;
    feedbackSummary: string;
  };
};

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildCriteriaHtml(criteria: Record<string, readonly string[]>, scores: Input["values"]["scores"]) {
  const categories = Object.entries(criteria);
  return categories
    .map(([categoryKey, items]) => {
      const categoryTitle = categoryKey.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
      const rows = items
        .map((label, index) => {
          const score = scores?.[categoryKey]?.[String(index)] ?? "";
          return `<tr><td class="criterion">${escapeHtml(label)}</td><td class="score">${escapeHtml(score || "N/A")}</td></tr>`;
        })
        .join("");

      return `
        <h3>${escapeHtml(categoryTitle)}</h3>
        <table class="scores">
          <thead><tr><th>Criterion</th><th class="score">Score</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join("");
}

function buildHtml(input: Input) {
  const v = input.values;
  const totalPercent = v.totalScorePercent == null ? "N/A" : `${v.totalScorePercent}%`;

  return `
  <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif; color: #0f172a; }
        h1 { font-size: 20px; margin: 0 0 4px 0; }
        h2 { font-size: 14px; margin: 18px 0 8px 0; }
        h3 { font-size: 12px; margin: 14px 0 6px 0; }
        .muted { color: #475569; font-size: 11px; }
        .grid { width: 100%; border-collapse: collapse; }
        .grid td { padding: 6px 0; vertical-align: top; }
        .label { width: 34%; color: #475569; font-size: 11px; }
        .value { width: 66%; font-size: 11px; }
        .box { border: 1px solid #cbd5e1; border-radius: 10px; padding: 10px 12px; }
        .scores { width: 100%; border-collapse: collapse; font-size: 10.5px; }
        .scores th { text-align: left; border-bottom: 1px solid #e2e8f0; padding: 6px 4px; color: #475569; }
        .scores td { border-bottom: 1px solid #f1f5f9; padding: 6px 4px; }
        .scores .score { width: 48px; text-align: center; }
        .criterion { width: auto; }
        .section { margin-top: 14px; }
        .pre { white-space: pre-wrap; font-size: 11px; line-height: 1.35; }
      </style>
    </head>
    <body>
      <div>
        <h1>Driving Assessment Result Form</h1>
        <div class="muted">Assessment ID: ${escapeHtml(input.assessmentId)}</div>
      </div>

      <div class="section box">
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
          <tr><td class="label">Weather</td><td class="value">${escapeHtml(v.weather)}</td></tr>
          <tr><td class="label">Date of assessment</td><td class="value">${escapeHtml(v.date)}</td></tr>
          <tr><td class="label">Instructor</td><td class="value">${escapeHtml(v.instructor)}</td></tr>
        </table>
      </div>

      <div class="section box">
        <h2>Assessment scores</h2>
        <div class="muted">Total score: ${escapeHtml(totalPercent)} (raw: ${escapeHtml(String(v.totalScoreRaw))})</div>
        <div class="section">${buildCriteriaHtml(input.criteria, v.scores)}</div>
      </div>

      <div class="section box">
        <h2>Feedback summary</h2>
        <div class="pre">${escapeHtml(v.feedbackSummary || "")}</div>
      </div>

      <div class="section box">
        <h2>Strengths</h2>
        <div class="pre">${escapeHtml(v.strengths || "N/A")}</div>
      </div>

      <div class="section box">
        <h2>Improvements</h2>
        <div class="pre">${escapeHtml(v.improvements || "N/A")}</div>
      </div>

      <div class="section box">
        <h2>Recommendation</h2>
        <div class="pre">${escapeHtml(v.recommendation || "N/A")}</div>
      </div>

      <div class="section box">
        <h2>Next steps</h2>
        <div class="pre">${escapeHtml(v.nextSteps || "N/A")}</div>
      </div>
    </body>
  </html>
  `;
}

export async function exportDrivingAssessmentPdf(input: Input) {
  const html = buildHtml(input);
  const { uri } = await Print.printToFileAsync({ html });

  const canShare = await isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing isn't available on this device.");
  }

  await shareAsync(uri, { UTI: ".pdf", mimeType: "application/pdf" });
}
