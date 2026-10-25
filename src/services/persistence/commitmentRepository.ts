import type { CommitmentRecordV1 } from "../../domain/commitment";
import { decodeCommitment, parseStoredCommitment } from "./commitmentCodec";

export const COMMITMENT_KEY = "k12learn2gether.commitment";

export type LoadResult =
  | { status: "empty" }
  | { status: "valid"; record: CommitmentRecordV1 }
  | { status: "corrupt" | "unsupported-version" | "unavailable" };

export type WriteStatus = "saved" | "not-saved" | "unverified" | "stale";
export type WriteResult = { status: WriteStatus; record?: CommitmentRecordV1 };

export class CommitmentRepository {
  private expectedRaw: string | null | undefined;
  private confirmedRecord: CommitmentRecordV1 | null = null;
  private blocked: "unverified" | "stale" | null = null;

  constructor(private readonly storage: () => Storage = () => window.localStorage) {}

  load(): LoadResult {
    let raw: string | null;
    try {
      raw = this.storage().getItem(COMMITMENT_KEY);
    } catch {
      return { status: "unavailable" };
    }

    if (raw === null) {
      this.expectedRaw = null;
      this.confirmedRecord = null;
      return { status: "empty" };
    }

    const decoded = parseStoredCommitment(raw);
    if (decoded.status !== "valid") {
      this.blocked = "unverified";
      return { status: decoded.status };
    }

    this.expectedRaw = raw;
    this.confirmedRecord = decoded.record;
    this.blocked = null;
    return { status: "valid", record: decoded.record };
  }

  getLastConfirmed(): CommitmentRecordV1 | null {
    return this.confirmedRecord;
  }

  save(record: CommitmentRecordV1): WriteResult {
    if (this.blocked || this.expectedRaw === undefined) {
      return { status: this.blocked ?? "unverified" };
    }

    const expectedRevision = this.confirmedRecord ? this.confirmedRecord.revision + 1 : 1;
    if (!decodeCommitment(record) || record.revision !== expectedRevision) {
      return { status: "not-saved" };
    }

    const attemptedRaw = JSON.stringify(record);
    let store: Storage;
    let currentRaw: string | null;
    try {
      store = this.storage();
      currentRaw = store.getItem(COMMITMENT_KEY);
    } catch {
      this.blocked = "unverified";
      return { status: "unverified" };
    }

    if (currentRaw !== this.expectedRaw) {
      this.blocked = "stale";
      return { status: "stale" };
    }

    try {
      store.setItem(COMMITMENT_KEY, attemptedRaw);
    } catch {
      return this.reconcileAttempt(store, attemptedRaw, record);
    }

    try {
      const readBack = store.getItem(COMMITMENT_KEY);
      if (readBack === attemptedRaw && parseStoredCommitment(readBack).status === "valid") {
        this.expectedRaw = attemptedRaw;
        this.confirmedRecord = record;
        return { status: "saved", record };
      }
    } catch {
      // The write may already have changed storage. Reconcile before claiming a result.
    }

    return this.reconcileAttempt(store, attemptedRaw, record);
  }

  private reconcileAttempt(
    store: Storage,
    attemptedRaw: string,
    attemptedRecord: CommitmentRecordV1,
  ): WriteResult {
    let actual: string | null;
    try {
      actual = store.getItem(COMMITMENT_KEY);
    } catch {
      this.blocked = "unverified";
      return { status: "unverified" };
    }

    if (actual === attemptedRaw && parseStoredCommitment(actual).status === "valid") {
      this.expectedRaw = actual;
      this.confirmedRecord = attemptedRecord;
      return { status: "saved", record: attemptedRecord };
    }
    if (actual === this.expectedRaw) {
      return { status: "not-saved" };
    }
    if (actual !== null && parseStoredCommitment(actual).status === "valid") {
      this.blocked = "stale";
      return { status: "stale" };
    }

    this.blocked = "unverified";
    return { status: "unverified" };
  }

  watch(onChange: (status: "stale" | "unverified") => void): () => void {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== COMMITMENT_KEY && event.key !== null) return;
      if (this.expectedRaw === undefined) return;
      let actual: string | null;
      try {
        actual = this.storage().getItem(COMMITMENT_KEY);
      } catch {
        this.blocked = "unverified";
        onChange("unverified");
        return;
      }
      if (actual !== this.expectedRaw) {
        this.blocked = "stale";
        onChange("stale");
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }
}
