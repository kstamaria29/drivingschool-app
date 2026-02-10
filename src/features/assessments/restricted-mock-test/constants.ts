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
    name: "Stage 1 - Basic Tasks(approx 10min)",
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
    name: "Stage 2 - Higher-Demand Tasks (approx 35min)",
    note: "Moderate to heavy traffic, wider range of turns, lane changes, merges, roundabouts and speeds.",
    badge: "Main assessment",
    tasks: [
      { id: "s2_rt1", name: "Right turn giving way (1 lane each way)", speed: "50–60", targetReps: 10 },
      { id: "s2_rt2", name: "Right turn giving way (2 lanes each way)", speed: "50–60", targetReps: 10 },
      { id: "s2_rtOncoming1", name: "Right turn across 1 lane oncoming", speed: "50–60", targetReps: 10 },
      { id: "s2_rtOncoming2", name: "Right turn across 2 lanes oncoming", speed: "50–60", targetReps: 10 },
      { id: "s2_lt1", name: "Left turn giving way (1 lane each way)", speed: "50–60", targetReps: 10 },
      { id: "s2_lt2", name: "Left turn giving way (2 lanes each way)", speed: "50–60", targetReps: 10 },
      { id: "s2_ltPrio", name: "Left turn with priority", speed: "50–60", targetReps: 10 },
      { id: "s2_lcr", name: "Lane change right", speed: "50–80", targetReps: 5 },
      { id: "s2_lcl", name: "Lane change left", speed: "50–80", targetReps: 5 },
      { id: "s2_lcrTurn", name: "Lane change right for upcoming turn", speed: "50–80", targetReps: 5 },
      { id: "s2_lclTurn", name: "Lane change left for upcoming turn", speed: "50–80", targetReps: 5 },
      { id: "s2_merge", name: "Merge lanes", speed: "70–100", targetReps: 6 },
      { id: "s2_stMed", name: "Straight drive - medium speed", speed: "60–80", targetReps: 4 },
      { id: "s2_stArt", name: "Straight drive - arterial road / 100-110", speed: "80–110", targetReps: 4 },
      { id: "s2_rbRight", name: "Right turn at roundabout", speed: "Varies", targetReps: 4 },
      { id: "s2_rbStraight", name: "Straight through at roundabout", speed: "Varies", targetReps: 4 },
      { id: "s2_extra1", name: "Extra complex task / variation 1", speed: "Custom", targetReps: 5 },
      { id: "s2_extra2", name: "Extra complex task / variation 2", speed: "Custom", targetReps: 5 },
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
