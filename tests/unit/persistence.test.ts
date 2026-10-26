import { describe, expect, it } from "vitest";
import { newCommitment } from "../../src/domain/commitment";
import { DEFAULT_FOCUS_VESSEL } from "../../src/domain/focusVessel";
import { parseStoredCommitment } from "../../src/services/persistence/commitmentCodec";
import { COMMITMENT_KEY, CommitmentRepository } from "../../src/services/persistence/commitmentRepository";

const record = () => newCommitment({ videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, "Understand the lesson", 25);

class MemoryStorage implements Storage {
  private entries = new Map<string, string>();
  get length() { return this.entries.size; }
  clear() { this.entries.clear(); }
  key(index: number) { return [...this.entries.keys()][index] ?? null; }
  getItem(key: string) { return this.entries.get(key) ?? null; }
  removeItem(key: string) { this.entries.delete(key); }
  setItem(key: string, value: string) { this.entries.set(key, value); }
}

describe("versioned local commitment", () => {
  it("defaults new records to glass and accepts legacy version 1 records without a vessel preference", () => {
    const current = record();
    expect(current.vesselStyle).toBe(DEFAULT_FOCUS_VESSEL);
    const { vesselStyle: _omitted, ...legacy } = current;
    expect(parseStoredCommitment(JSON.stringify(legacy))).toEqual({ status: "valid", record: legacy });
    expect(parseStoredCommitment(JSON.stringify({ ...current, vesselStyle: "unknown" })).status).toBe("corrupt");
  });
  it("expires a stale playback checkpoint without expiring learner-provided resource data", () => {
    const original = record();
    const now = Date.now();
    const stale = {
      ...original,
      objective: "Review the learner's chosen topic",
      goalMinutes: 45,
      lastConfirmedPositionMs: 12_000,
      checkpointRecordedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(),
      lesson: {
        videoId: "M7lc1UVf-VE",
        playlistId: "PL1234567890ABCDEF",
        canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890ABCDEF",
      },
    };

    const parsed = parseStoredCommitment(JSON.stringify(stale));
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") return;
    expect(parsed.record).toMatchObject({
      objective: "Review the learner's chosen topic",
      goalMinutes: 45,
      lesson: {
        playlistId: "PL1234567890ABCDEF",
        canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890ABCDEF",
      },
      lastConfirmedPositionMs: 0,
    });
    expect(parsed.record.lesson).not.toHaveProperty("videoId");
    expect(parsed.record).not.toHaveProperty("checkpointRecordedAt");
  });
  it("retains a video ID in the learner-supplied URL after its checkpoint expires", () => {
    const original = record();
    const stale = {
      ...original,
      lastConfirmedPositionMs: 12_000,
      checkpointRecordedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const parsed = parseStoredCommitment(JSON.stringify(stale));
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") return;
    expect(parsed.record.lesson.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed.record.lastConfirmedPositionMs).toBe(0);
    expect(parsed.record).not.toHaveProperty("checkpointRecordedAt");
  });
  it("retains a fresh player checkpoint", () => {
    const original = record();
    const current = {
      ...original,
      lastConfirmedPositionMs: 12_000,
      checkpointRecordedAt: new Date().toISOString(),
    };

    expect(parseStoredCommitment(JSON.stringify(current))).toMatchObject({
      status: "valid",
      record: { lastConfirmedPositionMs: 12_000, checkpointRecordedAt: current.checkpointRecordedAt },
    });
  });
  it("discards an invalid checkpoint timestamp without invalidating the resource", () => {
    const current = {
      ...record(),
      lastConfirmedPositionMs: 12_000,
      checkpointRecordedAt: "not-a-timestamp",
    };

    const parsed = parseStoredCommitment(JSON.stringify(current));
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") return;
    expect(parsed.record.lesson.videoId).toBe("dQw4w9WgXcQ");
    expect(parsed.record.lastConfirmedPositionMs).toBe(0);
    expect(parsed.record).not.toHaveProperty("checkpointRecordedAt");
  });
  it("confirms each supported vessel through the existing validated write path", () => {
    const storage = new MemoryStorage();
    const repository = new CommitmentRepository(() => storage);
    repository.load();
    const initial = record();
    expect(repository.save(initial).status).toBe("saved");
    for (const style of ["glass", "coffee", "mug", "bottle"] as const) {
      const previous = repository.getLastConfirmed()!;
      expect(repository.save({ ...previous, vesselStyle: style, revision: previous.revision + 1 }).status).toBe("saved");
      expect(repository.getLastConfirmed()).toMatchObject({ vesselStyle: style, cumulativeRecordedFocusedMs: initial.cumulativeRecordedFocusedMs, lastConfirmedPositionMs: initial.lastConfirmedPositionMs });
    }
  });
  it("validates the initial record and confirms a save by exact read-back", () => {
    const storage = new MemoryStorage();
    const repository = new CommitmentRepository(() => storage);
    expect(repository.load()).toEqual({ status: "empty" });
    expect(repository.save(record()).status).toBe("saved");
    expect(repository.getLastConfirmed()?.revision).toBe(1);
    expect(parseStoredCommitment(storage.getItem(COMMITMENT_KEY)!)).toMatchObject({ status: "valid" });
  });
  it("rejects invalid records and preserves corrupt raw data", () => {
    const storage = new MemoryStorage();
    const invalid = { ...record(), goalMinutes: 2 };
    const repository = new CommitmentRepository(() => storage);
    repository.load();
    expect(repository.save(invalid).status).toBe("not-saved");
    storage.setItem(COMMITMENT_KEY, "{broken");
    const reader = new CommitmentRepository(() => storage);
    expect(reader.load()).toEqual({ status: "corrupt" });
    expect(reader.save(record()).status).toBe("unverified");
    expect(storage.getItem(COMMITMENT_KEY)).toBe("{broken");
  });
  it("detects a changed raw record before writing", () => {
    const storage = new MemoryStorage();
    const first = new CommitmentRepository(() => storage);
    const second = new CommitmentRepository(() => storage);
    first.load(); second.load();
    expect(first.save(record()).status).toBe("saved");
    expect(second.save(record()).status).toBe("stale");
  });
  it("does not claim a save after a thrown write with unchanged storage", () => {
    const storage = new MemoryStorage();
    storage.setItem = () => { throw new Error("quota"); };
    const repository = new CommitmentRepository(() => storage);
    repository.load();
    expect(repository.save(record()).status).toBe("not-saved");
  });
  it("reports unverified when a returned write cannot be read back", () => {
    const storage = new MemoryStorage();
    const saved = record();
    const originalGet = storage.getItem.bind(storage);
    let reads = 0;
    storage.getItem = (key) => { reads++; if (reads >= 3) throw new Error("blocked"); return originalGet(key); };
    const repository = new CommitmentRepository(() => storage);
    repository.load();
    expect(repository.save(saved).status).toBe("unverified");
    expect(repository.getLastConfirmed()).toBeNull();
    expect(originalGet(COMMITMENT_KEY)).toBe(JSON.stringify(saved));
  });
});
