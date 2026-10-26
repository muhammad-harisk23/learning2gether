import { describe, expect, it } from "vitest";
import { newCommitment } from "../../src/domain/commitment";
import { currentStudyStreak, itemProgress, itemStatus, libraryItemId, periodActivityMs, STREAK_QUALIFYING_MS, type LibraryItem } from "../../src/domain/library";
import { COMMITMENT_KEY } from "../../src/services/persistence/commitmentRepository";
import { LIBRARY_KEY, LibraryRepository } from "../../src/services/persistence/libraryRepository";
import { parseStoredLibrary } from "../../src/services/persistence/libraryCodec";

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();
  get length() { return this.entries.size; }
  clear() { this.entries.clear(); }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  removeItem(key: string) { this.entries.delete(key); }
  setItem(key: string, value: string) { this.entries.set(key, value); }
}

const lesson = (id: string) => ({ videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}`, title: `Lesson ${id}` });
const record = (id: string, at = new Date("2026-01-01T00:00:00.000Z")) => newCommitment(lesson(id), `Understand ${id}`, 25, at);
const item = (id: string): LibraryItem => ({ id: libraryItemId(lesson(id)), title: `Topic ${id}`, subject: "Physics", sourceType: "video", commitment: record(id) });

describe("personal learning library", () => {
  it("migrates a valid legacy record and removes its YouTube metadata and legacy copy", () => {
    const storage = new MemoryStorage();
    const old = record("dQw4w9WgXcQ");
    storage.setItem(COMMITMENT_KEY, JSON.stringify(old));
    const repository = new LibraryRepository(() => storage);
    const loaded = repository.load();
    expect(loaded.status).toBe("valid");
    if (loaded.status !== "valid") return;
    expect(loaded.state.items).toHaveLength(1);
    expect(loaded.state.items[0]).toMatchObject({ id: "video:dQw4w9WgXcQ", title: old.objective, subject: "Uncategorized", commitment: { objective: old.objective, lesson: { videoId: old.lesson.videoId } } });
    expect(loaded.state.items[0].commitment.lesson).not.toHaveProperty("title");
    expect(loaded.state.selectedItemId).toBe("video:dQw4w9WgXcQ");
    expect(storage.getItem(COMMITMENT_KEY)).toBeNull();
    expect(storage.getItem(LIBRARY_KEY)).not.toContain("Lesson dQw4w9WgXcQ");
    expect(new LibraryRepository(() => storage).load()).toMatchObject({ status: "valid", state: loaded.state });
  });

  it("removes previously persisted player title, playlist order, and index during library load", () => {
    const storage = new MemoryStorage();
    const saved = item("dQw4w9WgXcQ");
    saved.sourceType = "playlist";
    saved.id = "playlist:PL1234567890";
    saved.commitment.lesson = {
      ...saved.commitment.lesson,
      playlistId: "PL1234567890",
      canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890",
      playlistVideoIds: ["dQw4w9WgXcQ", "M7lc1UVf-VE"],
      playlistIndex: 0,
      title: "Returned title",
    };
    const legacyState = {
      schemaVersion: 1,
      revision: 4,
      selectedItemId: saved.id,
      items: [saved],
      activity: [],
    };
    storage.setItem(LIBRARY_KEY, JSON.stringify(legacyState));

    const loaded = new LibraryRepository(() => storage).load();
    expect(loaded.status).toBe("valid");
    const persisted = storage.getItem(LIBRARY_KEY)!;
    expect(persisted).not.toContain("Returned title");
    expect(persisted).not.toContain("playlistVideoIds");
    expect(persisted).not.toContain("playlistIndex");
  });

  it("retains a playlist resource and learner data while expiring its player-selected video ID", () => {
    const storage = new MemoryStorage();
    const saved = item("M7lc1UVf-VE");
    saved.sourceType = "playlist";
    saved.id = "playlist:PL1234567890";
    saved.title = "Learner's resource";
    saved.subject = "Physics";
    saved.commitment = {
      ...saved.commitment,
      objective: "Study the selected lesson",
      goalMinutes: 45,
      lastConfirmedPositionMs: 15_000,
      checkpointRecordedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      lesson: {
        videoId: "M7lc1UVf-VE",
        playlistId: "PL1234567890",
        canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890",
      },
    };
    storage.setItem(LIBRARY_KEY, JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      selectedItemId: saved.id,
      items: [saved],
      activity: [],
    }));

    const loaded = new LibraryRepository(() => storage).load();
    expect(loaded.status).toBe("valid");
    if (loaded.status !== "valid") return;
    expect(loaded.state.items).toHaveLength(1);
    expect(loaded.state.items[0]).toMatchObject({
      title: "Learner's resource",
      subject: "Physics",
      commitment: {
        objective: "Study the selected lesson",
        goalMinutes: 45,
        lesson: {
          playlistId: "PL1234567890",
          canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890",
        },
        lastConfirmedPositionMs: 0,
      },
    });
    expect(loaded.state.items[0].commitment.lesson).not.toHaveProperty("videoId");
    expect(loaded.state.items[0].commitment).not.toHaveProperty("checkpointRecordedAt");
  });

  it("preserves a video ID explicitly parsed from the learner's playlist URL", () => {
    const storage = new MemoryStorage();
    const saved = item("M7lc1UVf-VE");
    saved.sourceType = "playlist";
    saved.id = "playlist:PL1234567890";
    saved.commitment = {
      ...saved.commitment,
      sourceVideoId: "dQw4w9WgXcQ",
      checkpointRecordedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
      lesson: {
        videoId: "M7lc1UVf-VE",
        playlistId: "PL1234567890",
        canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890",
      },
    };
    storage.setItem(LIBRARY_KEY, JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      selectedItemId: saved.id,
      items: [saved],
      activity: [],
    }));

    const loaded = new LibraryRepository(() => storage).load();
    expect(loaded.status).toBe("valid");
    if (loaded.status !== "valid") return;
    expect(loaded.state.items[0].commitment.sourceVideoId).toBe("dQw4w9WgXcQ");
    expect(loaded.state.items[0].commitment.lesson.videoId).toBe("dQw4w9WgXcQ");
    expect(loaded.state.items[0].commitment.lastConfirmedPositionMs).toBe(0);
  });

  it("stores multiple resources and keeps progress isolated per item", () => {
    const storage = new MemoryStorage();
    const repository = new LibraryRepository(() => storage);
    repository.load();
    const first = item("dQw4w9WgXcQ");
    const second = item("M7lc1UVf-VE");
    expect(repository.addItem(first).status).toBe("saved");
    expect(repository.addItem(second).status).toBe("saved");
    expect(repository.addItem(second).status).toBe("duplicate");
    const updated = { ...first.commitment, revision: 2, cumulativeRecordedFocusedMs: 120_000, updatedAt: "2026-01-02T12:00:00.000Z" };
    const result = repository.updateCommitment(first.id, updated, new Date("2026-01-02T12:00:00.000Z"));
    expect(result.status).toBe("saved");
    const state = repository.getState()!;
    expect(state.items.find((entry) => entry.id === first.id)?.commitment.cumulativeRecordedFocusedMs).toBe(120_000);
    expect(state.items.find((entry) => entry.id === second.id)?.commitment.cumulativeRecordedFocusedMs).toBe(0);
    expect(state.activity).toEqual([{ localDate: "2026-01-02", eligibleMs: 120_000 }]);
    expect(state.items.find((entry) => entry.id === first.id)?.lastStudiedAt).toBe("2026-01-02T12:00:00.000Z");

    const nextCheckpoint = { ...updated, revision: 3, cumulativeRecordedFocusedMs: 180_000, updatedAt: "2026-01-02T12:00:10.000Z" };
    expect(repository.updateCommitment(first.id, nextCheckpoint, new Date("2026-01-02T12:00:10.000Z")).status).toBe("saved");
    const noActivityChange = { ...nextCheckpoint, revision: 4, goalMinutes: 30, updatedAt: "2026-01-02T12:00:20.000Z" };
    expect(repository.updateCommitment(first.id, noActivityChange, new Date("2026-01-02T12:00:20.000Z")).status).toBe("saved");
    expect(repository.getState()?.activity).toEqual([{ localDate: "2026-01-02", eligibleMs: 180_000 }]);
  });

  it("persists the selected item and validates corrupt or unsupported envelopes", () => {
    const storage = new MemoryStorage();
    const repository = new LibraryRepository(() => storage);
    repository.load();
    const first = item("dQw4w9WgXcQ");
    const second = item("M7lc1UVf-VE");
    repository.addItem(first);
    repository.addItem(second);
    expect(repository.selectItem(first.id).status).toBe("saved");
    expect(repository.getState()?.selectedItemId).toBe(first.id);
    storage.setItem(LIBRARY_KEY, "{broken");
    expect(new LibraryRepository(() => storage).load()).toEqual({ status: "corrupt" });
    storage.setItem(LIBRARY_KEY, JSON.stringify({ schemaVersion: 999 }));
    expect(new LibraryRepository(() => storage).load()).toEqual({ status: "unsupported-version" });
  });

  it("detects another tab changing the envelope before a write", () => {
    const storage = new MemoryStorage();
    const first = new LibraryRepository(() => storage);
    const second = new LibraryRepository(() => storage);
    first.load(); second.load();
    first.addItem(item("dQw4w9WgXcQ"));
    expect(second.addItem(item("M7lc1UVf-VE")).status).toBe("stale");
  });

  it("validates item progress and records date scoped activity and streaks", () => {
    const entry = item("dQw4w9WgXcQ");
    expect(itemProgress(entry)).toBe(0);
    expect(itemStatus(entry)).toBe("not-started");
    expect(STREAK_QUALIFYING_MS).toBe(600_000);
    expect(currentStudyStreak([{ localDate: "2026-03-02", eligibleMs: 599_999 }], new Date(2026, 2, 2, 12))).toBe(0);
    expect(currentStudyStreak([{ localDate: "2026-03-02", eligibleMs: 600_000 }], new Date(2026, 2, 2, 12))).toBe(1);
    const activity = [
      { localDate: "2026-02-26", eligibleMs: 600_000 },
      { localDate: "2026-02-27", eligibleMs: 599_999 },
      { localDate: "2026-02-28", eligibleMs: 600_000 },
      { localDate: "2026-03-01", eligibleMs: 650_000 },
    ];
    expect(currentStudyStreak(activity, new Date(2026, 2, 1, 12))).toBe(2);
    expect(currentStudyStreak(activity, new Date(2026, 2, 2, 12))).toBe(2);
    expect(periodActivityMs(activity, "week", new Date(2026, 2, 1, 12))).toBe(2_449_999);
    expect(periodActivityMs(activity, "month", new Date(2026, 2, 1, 12))).toBe(650_000);
    const yearBoundary = [
      { localDate: "2025-12-31", eligibleMs: 600_000 },
      { localDate: "2026-01-01", eligibleMs: 600_000 },
    ];
    expect(currentStudyStreak(yearBoundary, new Date(2026, 0, 1, 12))).toBe(2);
    expect(periodActivityMs(yearBoundary, "year", new Date(2026, 0, 1, 12))).toBe(600_000);
    expect(parseStoredLibrary(JSON.stringify({ ...JSON.parse("{}"), schemaVersion: 1 })).status).toBe("corrupt");
  });
});
