export const fullLicenseMockTestAssessmentItems = [
  { id: "observation", label: "Observation" },
  { id: "signalling", label: "Signalling" },
  { id: "gapSelection", label: "Gap selection" },
  { id: "followingDistance", label: "Following distance" },
  { id: "hazardDetection", label: "Hazard detection" },
  { id: "hazardResponse", label: "Hazard response" },
] as const;

export type FullLicenseMockTestAssessmentItemId =
  (typeof fullLicenseMockTestAssessmentItems)[number]["id"];

export const fullLicenseMockTestTasks = [
  {
    id: "left_turn",
    name: "Turning Left",
    variants: [
      "Give way – turning left at intersection",
      "Stop sign – turning left",
      "Signalised intersection – turning left",
      "Left turn from side road to main road",
    ],
  },
  {
    id: "right_turn",
    name: "Turning Right",
    variants: [
      "Right turn across oncoming traffic (1 lane)",
      "Right turn across oncoming traffic (2 lanes)",
      "Right turn from side road to main road",
      "Right turn at signalised intersection",
    ],
  },
  {
    id: "lane_change_left",
    name: "Lane Change Left",
    variants: ["Change left – mirror/signal/head-check", "Move left to prepare for turn"],
  },
  {
    id: "lane_change_right",
    name: "Lane Change Right",
    variants: ["Change right – mirror/signal/head-check", "Move right to prepare for turn"],
  },
  {
    id: "roundabout_right",
    name: "Right at Roundabout",
    variants: [
      "3rd exit / right turn at single-lane roundabout",
      "Right at multi-lane roundabout (choose correct lane)",
    ],
  },
] as const;

export type FullLicenseMockTestTaskId = (typeof fullLicenseMockTestTasks)[number]["id"];

export type FullLicenseMockTestMode = "official" | "drill";
export type FullLicenseMockTestWeather = "dry" | "wet" | "low_visibility";

export const fullLicenseMockTestCriticalErrors = [
  "Late/incorrect observation (missed head check / mirrors)",
  "Signalling incorrect / late / missing",
  "Poor gap selection (forced other road users to slow/stop)",
  "Following distance too close for conditions",
  "Speed inappropriate for conditions",
  "Lane position poor (crowding centre line / kerb)",
  "Did not identify obvious hazard",
  "Did not respond appropriately to hazard",
] as const;

export const fullLicenseMockTestImmediateErrors = [
  "Collision or near-collision requiring examiner intervention",
  "Examiner intervention (verbal/physical to prevent danger)",
  "Disobeyed stop sign/red light (dangerous)",
  "Drove on wrong side / dangerous lane incursion",
] as const;

