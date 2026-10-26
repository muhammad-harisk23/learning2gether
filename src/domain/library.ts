import type { CommitmentRecordV1 } from "./commitment";
import { goalPercent } from "./focusGoal";

export const LIBRARY_SCHEMA_VERSION = 1 as const;
export const MAX_LIBRARY_ITEMS = 200;
export const MAX_ACTIVITY_DAYS = 400;
/** A local calendar date qualifies after ten minutes of persisted eligible focus. */
export const STREAK_QUALIFYING_MS = 10 * 60_000;

export interface LibraryItem {
  id: string;
  title: string;
  subject: string;
  sourceType: "video" | "playlist";
  commitment: CommitmentRecordV1;
  /** Set only when an eligible focus delta is successfully persisted. */
  lastStudiedAt?: string;
}

export interface DailyActivityBucket {
  localDate: string;
  eligibleMs: number;
}

export interface LibraryStateV1 {
  schemaVersion: typeof LIBRARY_SCHEMA_VERSION;
  revision: number;
  selectedItemId: string | null;
  items: LibraryItem[];
  /** Bounded date history. Old cumulative commitment totals remain the lifetime source. */
  activity: DailyActivityBucket[];
}

export type ActivityPeriod = "day" | "week" | "month" | "year";

export function emptyLibrary(): LibraryStateV1 {
  return { schemaVersion: LIBRARY_SCHEMA_VERSION, revision: 0, selectedItemId: null, items: [], activity: [] };
}

export function libraryItemId(lesson: CommitmentRecordV1["lesson"]): string {
  return lesson.playlistId ? `playlist:${lesson.playlistId}` : `video:${lesson.videoId}`;
}

export function legacyLibraryItem(record: CommitmentRecordV1): LibraryItem {
  return {
    id: libraryItemId(record.lesson),
    title: record.lesson.title?.trim() || record.objective,
    subject: "Uncategorized",
    sourceType: record.lesson.playlistId ? "playlist" : "video",
    commitment: record,
  };
}

export function itemProgress(item: LibraryItem): number {
  return goalPercent(item.commitment.cumulativeRecordedFocusedMs, item.commitment.goalMinutes);
}

export function itemStatus(item: LibraryItem): "not-started" | "in-progress" | "completed" {
  if (item.commitment.lessonStatus === "completed") return "completed";
  if (item.lastStudiedAt || item.commitment.cumulativeRecordedFocusedMs > 0 || item.commitment.lastConfirmedPositionMs > 0) return "in-progress";
  return "not-started";
}

function timestampOrder(value?: string): number {
  return value ? Date.parse(value) || 0 : 0;
}

export function sortLibraryItems(items: readonly LibraryItem[]): LibraryItem[] {
  return items.map((item, index) => ({ item, index })).sort((a, b) => {
    const statusOrder = { "in-progress": 0, "not-started": 1, completed: 2 } as const;
    const statusDifference = statusOrder[itemStatus(a.item)] - statusOrder[itemStatus(b.item)];
    if (statusDifference !== 0) return statusDifference;
    const timeDifference = itemStatus(a.item) === "in-progress"
      ? timestampOrder(b.item.lastStudiedAt) - timestampOrder(a.item.lastStudiedAt)
      : timestampOrder(b.item.commitment.createdAt) - timestampOrder(a.item.commitment.createdAt);
    return timeDifference || a.index - b.index;
  }).map(({ item }) => item);
}

export function selectContinueItem(items: readonly LibraryItem[]): LibraryItem | null {
  return sortLibraryItems(items).find((item) => item.commitment.lessonStatus === "unfinished") ?? null;
}

export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return localDateKey(date);
}

export function activityPeriodStart(period: ActivityPeriod, now: Date): string {
  const today = localDateKey(now);
  if (period === "day") return today;
  if (period === "week") {
    const weekday = now.getDay();
    return shiftDateKey(today, -(weekday === 0 ? 6 : weekday - 1));
  }
  if (period === "month") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  return `${now.getFullYear()}-01-01`;
}

export function periodActivityMs(activity: readonly DailyActivityBucket[], period: ActivityPeriod, now: Date): number {
  const start = activityPeriodStart(period, now);
  const end = localDateKey(now);
  return activity.reduce((total, bucket) => bucket.localDate >= start && bucket.localDate <= end ? total + bucket.eligibleMs : total, 0);
}

export function currentStudyStreak(activity: readonly DailyActivityBucket[], now: Date): number {
  const qualifyingDays = new Set(activity.filter((bucket) => bucket.eligibleMs >= STREAK_QUALIFYING_MS).map((bucket) => bucket.localDate));
  const today = localDateKey(now);
  const firstDay = qualifyingDays.has(today) ? today : shiftDateKey(today, -1);
  if (!qualifyingDays.has(firstDay)) return 0;

  let streak = 0;
  let day = firstDay;
  while (qualifyingDays.has(day) && streak < MAX_ACTIVITY_DAYS) {
    streak += 1;
    day = shiftDateKey(day, -1);
  }
  return streak;
}
