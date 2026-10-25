import type { CommitmentRecordV1 } from "../../domain/commitment";
import { emptyLibrary, legacyLibraryItem, localDateKey, MAX_ACTIVITY_DAYS, MAX_LIBRARY_ITEMS, type LibraryItem, type LibraryStateV1 } from "../../domain/library";
import { CommitmentRepository } from "./commitmentRepository";
import { decodeLibrary, parseStoredLibrary } from "./libraryCodec";

export const LIBRARY_KEY = "k12learn2gether.library.v1";

export type LibraryLoadResult =
  | { status: "empty"; state: LibraryStateV1 }
  | { status: "valid"; state: LibraryStateV1 }
  | { status: "corrupt" | "unsupported-version" | "unavailable" | "migration-failed" };
export type LibraryWriteStatus = "saved" | "duplicate" | "not-saved" | "unverified" | "stale";
export type LibraryWriteResult = { status: "saved"; state: LibraryStateV1; item?: LibraryItem } | { status: Exclude<LibraryWriteStatus, "saved"> };

export class LibraryRepository {
  private expectedRaw: string | null | undefined;
  private state: LibraryStateV1 | null = null;
  private blocked: "unverified" | "stale" | null = null;

  constructor(private readonly storage: () => Storage = () => window.localStorage) {}

  load(legacyRepository = new CommitmentRepository(this.storage)): LibraryLoadResult {
    let raw: string | null;
    try {
      raw = this.storage().getItem(LIBRARY_KEY);
    } catch {
      return { status: "unavailable" };
    }

    if (raw !== null) {
      const parsed = parseStoredLibrary(raw);
      if (parsed.status !== "valid") return { status: parsed.status };
      this.expectedRaw = raw;
      this.state = parsed.state;
      this.blocked = null;
      return { status: "valid", state: parsed.state };
    }

    this.expectedRaw = null;
    this.state = emptyLibrary();
    this.blocked = null;
    const old = legacyRepository.load();
    if (old.status === "empty") return { status: "empty", state: this.state };
    if (old.status !== "valid") return { status: old.status };

    const migrated: LibraryStateV1 = {
      ...emptyLibrary(),
      revision: 1,
      selectedItemId: legacyLibraryItem(old.record).id,
      items: [legacyLibraryItem(old.record)],
    };
    const write = this.write(migrated, 1);
    if (write.status !== "saved") return { status: "migration-failed" };
    return { status: "valid", state: write.state };
  }

  getState(): LibraryStateV1 | null {
    return this.state;
  }

  addItem(item: LibraryItem): LibraryWriteResult {
    const current = this.state;
    if (!current || this.blocked || this.expectedRaw === undefined) return { status: this.blocked ?? "unverified" };
    const existing = current.items.find((candidate) => candidate.id === item.id);
    if (existing) return { status: "duplicate" };
    if (current.items.length >= MAX_LIBRARY_ITEMS || !decodeLibrary({ ...current, revision: current.revision + 1, items: [...current.items, item], selectedItemId: item.id })) {
      return { status: "not-saved" };
    }
    const next = { ...current, revision: current.revision + 1, selectedItemId: item.id, items: [...current.items, item] };
    const result = this.write(next, current.revision + 1);
    return result.status === "saved" ? { ...result, item } : result;
  }

  selectItem(id: string): LibraryWriteResult {
    const current = this.state;
    if (!current || this.blocked || this.expectedRaw === undefined) return { status: this.blocked ?? "unverified" };
    if (!current.items.some((item) => item.id === id)) return { status: "not-saved" };
    if (current.selectedItemId === id) return { status: "saved", state: current, item: current.items.find((item) => item.id === id) };
    const next = { ...current, revision: current.revision + 1, selectedItemId: id };
    const result = this.write(next, current.revision + 1);
    return result.status === "saved" ? { ...result, item: result.state.items.find((item) => item.id === id) } : result;
  }

  updateCommitment(itemId: string, record: CommitmentRecordV1, now = new Date()): LibraryWriteResult {
    const current = this.state;
    if (!current || this.blocked || this.expectedRaw === undefined) return { status: this.blocked ?? "unverified" };
    const prior = current.items.find((item) => item.id === itemId);
    if (!prior || record.revision !== prior.commitment.revision + 1) return { status: "not-saved" };
    const activityDelta = record.cumulativeRecordedFocusedMs - prior.commitment.cumulativeRecordedFocusedMs;
    if (activityDelta < 0 || !decodeLibrary({
      ...current,
      revision: current.revision + 1,
      items: current.items.map((item) => item.id === itemId ? { ...item, commitment: record } : item),
    })) return { status: "not-saved" };

    const dateKey = localDateKey(now);
    const activity = activityDelta > 0
      ? addActivity(current.activity, dateKey, activityDelta, now)
      : current.activity;
    const updatedItem: LibraryItem = {
      ...prior,
      commitment: record,
      ...(activityDelta > 0 ? { lastStudiedAt: now.toISOString() } : {}),
    };
    const next: LibraryStateV1 = {
      ...current,
      revision: current.revision + 1,
      selectedItemId: itemId,
      items: current.items.map((item) => item.id === itemId ? updatedItem : item),
      activity,
    };
    const result = this.write(next, current.revision + 1);
    return result.status === "saved" ? { ...result, item: updatedItem } : result;
  }

  watch(onChange: (status: "stale" | "unverified") => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== LIBRARY_KEY && event.key !== null) return;
      if (this.expectedRaw === undefined) return;
      try {
        if (this.storage().getItem(LIBRARY_KEY) !== this.expectedRaw) {
          this.blocked = "stale";
          onChange("stale");
        }
      } catch {
        this.blocked = "unverified";
        onChange("unverified");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }

  private write(next: LibraryStateV1, expectedRevision: number): LibraryWriteResult {
    if (this.blocked || this.expectedRaw === undefined || !decodeLibrary(next) || next.revision !== expectedRevision) {
      return { status: this.blocked ?? "not-saved" };
    }
    let storage: Storage;
    let actual: string | null;
    try {
      storage = this.storage();
      actual = storage.getItem(LIBRARY_KEY);
    } catch {
      this.blocked = "unverified";
      return { status: "unverified" };
    }
    if (actual !== this.expectedRaw) {
      this.blocked = "stale";
      return { status: "stale" };
    }

    const attempted = JSON.stringify(next);
    try {
      storage.setItem(LIBRARY_KEY, attempted);
    } catch {
      return this.reconcile(storage, attempted, next);
    }
    try {
      if (storage.getItem(LIBRARY_KEY) === attempted && parseStoredLibrary(attempted).status === "valid") {
        this.expectedRaw = attempted;
        this.state = next;
        return { status: "saved", state: next };
      }
    } catch {
      // Reconcile below before claiming that the synchronous write succeeded.
    }
    return this.reconcile(storage, attempted, next);
  }

  private reconcile(storage: Storage, attempted: string, next: LibraryStateV1): LibraryWriteResult {
    let actual: string | null;
    try {
      actual = storage.getItem(LIBRARY_KEY);
    } catch {
      this.blocked = "unverified";
      return { status: "unverified" };
    }
    if (actual === attempted && parseStoredLibrary(actual).status === "valid") {
      this.expectedRaw = actual;
      this.state = next;
      return { status: "saved", state: next };
    }
    if (actual === this.expectedRaw) return { status: "not-saved" };
    if (actual !== null && parseStoredLibrary(actual).status === "valid") {
      this.blocked = "stale";
      return { status: "stale" };
    }
    this.blocked = "unverified";
    return { status: "unverified" };
  }
}

function addActivity(
  buckets: LibraryStateV1["activity"],
  localDate: string,
  deltaMs: number,
  now: Date,
): LibraryStateV1["activity"] {
  const combined = buckets.map((bucket) => ({ ...bucket }));
  const existing = combined.find((bucket) => bucket.localDate === localDate);
  if (existing) existing.eligibleMs += Math.floor(deltaMs);
  else combined.push({ localDate, eligibleMs: Math.floor(deltaMs) });
  const oldest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (MAX_ACTIVITY_DAYS - 1));
  const oldestKey = localDateKey(oldest);
  return combined.filter((bucket) => bucket.localDate >= oldestKey && bucket.localDate <= localDate)
    .sort((a, b) => a.localDate.localeCompare(b.localDate));
}
