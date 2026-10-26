import { decodeCommitment } from "./commitmentCodec";
import { LIBRARY_SCHEMA_VERSION, MAX_ACTIVITY_DAYS, MAX_LIBRARY_ITEMS, type LibraryItem, type LibraryStateV1 } from "../../domain/library";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function decodeItem(value: unknown): LibraryItem | null {
  if (!isRecord(value) || typeof value.id !== "string" || value.id.length < 1 || value.id.length > 200 ||
      typeof value.title !== "string" || value.title.trim() !== value.title || value.title.length < 1 || value.title.length > 120 ||
      typeof value.subject !== "string" || value.subject.trim() !== value.subject || value.subject.length < 1 || value.subject.length > 60 ||
      !["video", "playlist"].includes(String(value.sourceType)) ||
      (value.lastStudiedAt !== undefined && (typeof value.lastStudiedAt !== "string" || !Number.isFinite(Date.parse(value.lastStudiedAt))))) return null;
  const commitment = decodeCommitment(value.commitment);
  if (!commitment || (value.sourceType === "playlist") !== !!commitment.lesson.playlistId) return null;
  return { ...value, commitment } as unknown as LibraryItem;
}

export function decodeLibrary(value: unknown): LibraryStateV1 | null {
  if (!isRecord(value) || value.schemaVersion !== LIBRARY_SCHEMA_VERSION ||
      !Number.isSafeInteger(value.revision) || Number(value.revision) < 1 ||
      !Array.isArray(value.items) || value.items.length > MAX_LIBRARY_ITEMS ||
      !Array.isArray(value.activity) || value.activity.length > MAX_ACTIVITY_DAYS ||
      !(value.selectedItemId === null || typeof value.selectedItemId === "string")) return null;

  const items = value.items.map(decodeItem);
  if (items.some((item) => item === null)) return null;
  const itemList = items as LibraryItem[];
  const ids = new Set(itemList.map((item) => item.id));
  if (ids.size !== itemList.length || (itemList.length > 0 && value.selectedItemId === null) ||
      (value.selectedItemId !== null && !ids.has(value.selectedItemId))) return null;

  const dates = new Set<string>();
  for (const bucket of value.activity) {
    if (!isRecord(bucket) || !validDateKey(bucket.localDate) || dates.has(bucket.localDate) ||
        typeof bucket.eligibleMs !== "number" || !Number.isSafeInteger(bucket.eligibleMs) || bucket.eligibleMs < 0) return null;
    dates.add(bucket.localDate);
  }
  return { ...value, items: itemList } as unknown as LibraryStateV1;
}

export function parseStoredLibrary(raw: string):
  | { status: "valid"; state: LibraryStateV1 }
  | { status: "corrupt" | "unsupported-version" } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "corrupt" };
  }
  if (isRecord(value) && value.schemaVersion !== LIBRARY_SCHEMA_VERSION) return { status: "unsupported-version" };
  const state = decodeLibrary(value);
  return state ? { status: "valid", state } : { status: "corrupt" };
}
