import { goalPercent } from "./focusGoal";
import { currentStudyStreak, itemStatus, periodActivityMs, type ActivityPeriod, type LibraryStateV1 } from "./library";
import { DEFAULT_FOCUS_VESSEL, type FocusVesselStyle } from "./focusVessel";

export interface ShareProgressData {
  recordedFocusMs: number;
  focusGoalMinutes: number;
  goalPercent: number;
  goalReached: boolean;
  todayMs: number;
  weekMs: number;
  monthMs: number;
  yearMs: number;
  lifetimeMs: number;
  streakDays: number;
  resourcesInProgress: number;
  lessonsMarkedComplete: number;
  vesselStyle: FocusVesselStyle;
  subject?: string;
  resourceTitle?: string;
}

/** Selects only existing persisted library values; date totals stay limited to known activity buckets. */
export function selectShareProgress(
  library: LibraryStateV1,
  resourceId: string | null | undefined = library.selectedItemId,
  now = new Date(),
): ShareProgressData {
  const resource = library.items.find((item) => item.id === resourceId) ?? null;
  const recordedFocusMs = resource?.commitment.cumulativeRecordedFocusedMs ?? 0;
  const focusGoalMinutes = resource?.commitment.goalMinutes ?? 25;
  const lifetimeMs = library.items.reduce((total, item) => total + item.commitment.cumulativeRecordedFocusedMs, 0);
  const period = (name: ActivityPeriod) => periodActivityMs(library.activity, name, now);

  return {
    recordedFocusMs,
    focusGoalMinutes,
    goalPercent: goalPercent(recordedFocusMs, focusGoalMinutes),
    goalReached: recordedFocusMs >= focusGoalMinutes * 60_000,
    todayMs: period("day"),
    weekMs: period("week"),
    monthMs: period("month"),
    yearMs: period("year"),
    lifetimeMs,
    streakDays: currentStudyStreak(library.activity, now),
    resourcesInProgress: library.items.filter((item) => itemStatus(item) === "in-progress").length,
    lessonsMarkedComplete: library.items.filter((item) => item.commitment.lessonStatus === "completed").length,
    vesselStyle: resource?.commitment.vesselStyle ?? DEFAULT_FOCUS_VESSEL,
    ...(resource ? { subject: resource.subject, resourceTitle: resource.title } : {}),
  };
}
