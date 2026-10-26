import { describe, expect, it } from "vitest";
import { newCommitment } from "../../src/domain/commitment";
import { localDateKey, type LibraryItem, type LibraryStateV1 } from "../../src/domain/library";
import { selectShareProgress } from "../../src/domain/shareProgress";

function makeItem(id: string, options: { recordedMs?: number; goalMinutes?: number; status?: "unfinished" | "completed"; vesselStyle?: "glass" | "coffee" | "mug" | "bottle" } = {}): LibraryItem {
  const lesson = { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, title: `Lesson ${id}` };
  const commitment = {
    ...newCommitment(lesson, `Understand ${id}`, options.goalMinutes ?? 60),
    cumulativeRecordedFocusedMs: options.recordedMs ?? 0,
    lessonStatus: options.status ?? "unfinished",
    vesselStyle: options.vesselStyle ?? "glass",
  };
  return { id: `video:${id}`, title: `Lesson ${id}`, subject: "Physics", sourceType: "video", commitment };
}

describe("share progress selector", () => {
  it("selects goal, lifetime, date totals, streak, and status from persisted library data", () => {
    const now = new Date(2026, 2, 2, 12);
    const today = localDateKey(now);
    const yesterday = localDateKey(new Date(2026, 2, 1, 12));
    const first = makeItem("dQw4w9WgXcQ", { recordedMs: 75 * 60_000, goalMinutes: 60, vesselStyle: "mug" });
    const second = makeItem("M7lc1UVf-VE", { recordedMs: 30 * 60_000, status: "completed" });
    const library: LibraryStateV1 = {
      schemaVersion: 1,
      revision: 4,
      selectedItemId: first.id,
      items: [first, second],
      activity: [
        { localDate: yesterday, eligibleMs: 10 * 60_000 },
        { localDate: today, eligibleMs: 12 * 60_000 },
      ],
    };

    expect(selectShareProgress(library, first.id, now)).toMatchObject({
      recordedFocusMs: 75 * 60_000,
      focusGoalMinutes: 60,
      goalPercent: 100,
      goalReached: true,
      todayMs: 12 * 60_000,
      weekMs: 12 * 60_000,
      monthMs: 22 * 60_000,
      yearMs: 22 * 60_000,
      lifetimeMs: 105 * 60_000,
      streakDays: 2,
      resourcesInProgress: 1,
      lessonsMarkedComplete: 1,
      vesselStyle: "mug",
      subject: "Physics",
      resourceTitle: "Lesson dQw4w9WgXcQ",
    });
  });

  it("uses zero only where persisted data has no recorded value and never invents a resource", () => {
    const library: LibraryStateV1 = { schemaVersion: 1, revision: 1, selectedItemId: null, items: [], activity: [] };
    expect(selectShareProgress(library, null, new Date(2026, 2, 2, 12))).toMatchObject({
      recordedFocusMs: 0,
      goalPercent: 0,
      goalReached: false,
      todayMs: 0,
      weekMs: 0,
      monthMs: 0,
      yearMs: 0,
      lifetimeMs: 0,
      streakDays: 0,
      resourcesInProgress: 0,
      lessonsMarkedComplete: 0,
      vesselStyle: "glass",
    });
  });
});
