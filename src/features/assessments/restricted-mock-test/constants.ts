export const restrictedMockTestTaskItems = [
  { id: "observation", label: "Observation" },
  { id: "signalling", label: "Signalling" },
  { id: "gap", label: "Gap selection" },
  { id: "speed", label: "Speed choice" },
  { id: "following", label: "Following distance" },
  { id: "lateral", label: "Lateral position" },
  { id: "parkObs", label: "Parking observation" },
  { id: "parkMove", label: "Parking movement" },
  { id: "leavePark", label: "Leaving park" },
  { id: "turnMovement", label: "Turning movement (3-pt turn)" },
] as const;

export type RestrictedMockTestTaskItemId = (typeof restrictedMockTestTaskItems)[number]["id"];

export const restrictedMockTestStages = [
  {
    id: "stage1",
    name: "Stage 1 – Basic tasks (approx. 10 min, ≤60 km/h)",
    note: "Screening stage in simpler traffic. If performance is clearly unsafe, don’t continue to Stage 2.",
    badge: "Screening stage",
    tasks: [
      { id: "s1_rt", name: "Right turn giving way", speed: "≤60", targetReps: 10 },
      { id: "s1_lt", name: "Left turn giving way", speed: "≤60", targetReps: 10 },
      { id: "s1_lcr", name: "Lane change right", speed: "≤60", targetReps: 5 },
      { id: "s1_lcl", name: "Lane change left", speed: "≤60", targetReps: 5 },
      { id: "s1_rpp", name: "Reverse Parallel Park", speed: "Low / kerbside", targetReps: 3 },
      { id: "s1_extra", name: "Extra task/variation", speed: "Custom", targetReps: 5 },
    ],
  },
  {
    id: "stage2",
    name: "Stage 2 – Higher-demand tasks (approx. 35 min, ≤110 km/h)",
    note: "Moderate to heavy traffic, wider range of turns, lane changes, merges, roundabouts and speeds.",
    badge: "Main assessment",
    tasks: [
      { id: "s2_turns", name: "All turns give way", speed: "50–60", targetReps: 10 },
      { id: "s2_laneChanges", name: "All lane changes", speed: "50–80", targetReps: 5 },
      { id: "s2_merge", name: "Merge lanes", speed: "70–100", targetReps: 6 },
      { id: "s2_straight", name: "All straight drives", speed: "60–110", targetReps: 4 },
      { id: "s2_roundabouts", name: "All roundabouts", speed: "Varies", targetReps: 4 },
      { id: "s2_extra", name: "All extra complex tasks / variations", speed: "Custom", targetReps: 5 },
    ],
  },
] as const;

export type RestrictedMockTestStageId = (typeof restrictedMockTestStages)[number]["id"];
export type RestrictedMockTestTaskId = (typeof restrictedMockTestStages)[number]["tasks"][number]["id"];

export const restrictedMockTestCriticalErrors = [
  "Too slow",
  "Too fast (minor)",
  "Failing to look",
  "Failing to signal",
  "Blocking pedestrian crossing",
  "Mounting kerb (single wheel, low risk)",
  "Stalling vehicle",
  "Incomplete stop at Stop sign",
  "Other illegal action",
] as const;

export const restrictedMockTestImmediateErrors = [
  "Testing officer / support person intervention",
  "Failing to carry out instruction",
  "Collision (kerb, object, vehicle, cyclist, pedestrian)",
  "Failing to give way (other road user takes evasive action)",
  "Excessive speed (≥5 km/h for 5+ sec, or ≥10 km/h)",
  "Stopping at dangerous position",
  "Failing to stop (Stop sign, red/yellow, rail)",
  "Other dangerous action",
] as const;
