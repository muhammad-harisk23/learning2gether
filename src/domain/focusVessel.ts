export const FOCUS_VESSELS = [
  { id: "glass", label: "Glass", description: "Transparent drinking glass", liquid: ["#efff8a", "#d9f525", "#a5bb18"] },
  { id: "coffee", label: "Coffee cup", description: "Coffee cup", liquid: ["#b78a65", "#79533a", "#4d3326"] },
  { id: "mug", label: "Mug", description: "Mug", liquid: ["#8fd3d0", "#4d9a9c", "#28696e"] },
  { id: "bottle", label: "Bottle", description: "Bottle", liquid: ["#b9e9df", "#70bdb0", "#438d84"] },
] as const;

export type FocusVesselStyle = (typeof FOCUS_VESSELS)[number]["id"];
export const DEFAULT_FOCUS_VESSEL: FocusVesselStyle = "glass";

export function isFocusVesselStyle(value: unknown): value is FocusVesselStyle {
  return FOCUS_VESSELS.some((vessel) => vessel.id === value);
}

export function focusGoalWasReached(
  previous: { recordedMs: number; goalMinutes: number },
  current: { recordedMs: number; goalMinutes: number },
): boolean {
  if (previous.goalMinutes !== current.goalMinutes || current.recordedMs <= previous.recordedMs) return false;
  const goalMs = current.goalMinutes * 60_000;
  return previous.recordedMs < goalMs && current.recordedMs >= goalMs;
}
