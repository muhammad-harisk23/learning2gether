import { describe, expect, it } from "vitest";
import { newCommitment } from "../../src/domain/commitment";
import { parseStoredCommitment } from "../../src/services/persistence/commitmentCodec";
import { COMMITMENT_KEY, CommitmentRepository } from "../../src/services/persistence/commitmentRepository";

const record = () => newCommitment({ videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, "Understand the lesson", 25, new Date("2026-01-01T00:00:00Z"));

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
    const originalGet = storage.getItem.bind(storage);
    let reads = 0;
    storage.getItem = (key) => { reads++; if (reads >= 3) throw new Error("blocked"); return originalGet(key); };
    const repository = new CommitmentRepository(() => storage);
    repository.load();
    expect(repository.save(record()).status).toBe("unverified");
    expect(repository.getLastConfirmed()).toBeNull();
    expect(originalGet(COMMITMENT_KEY)).toBe(JSON.stringify(record()));
  });
});
