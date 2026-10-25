import type { CommitmentRecordV1 } from "../../domain/commitment";
import { parseObjective } from "../../domain/commitment";
import { parseGoalMinutes } from "../../domain/focusGoal";
import { canonicalYouTubeUrl } from "../../domain/youtubeUrl";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function decodeCommitment(value: unknown): CommitmentRecordV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.lesson)) {
    return null;
  }

  const { lesson } = value;
  if (
    typeof lesson.videoId !== "string" ||
    !VIDEO_ID.test(lesson.videoId) ||
    (lesson.playlistId !== undefined && (typeof lesson.playlistId !== "string" || !/^[A-Za-z0-9_-]{10,80}$/.test(lesson.playlistId))) ||
    lesson.canonicalUrl !== canonicalYouTubeUrl(lesson.videoId, typeof lesson.playlistId === "string" ? lesson.playlistId : undefined) ||
    (lesson.playlistVideoIds !== undefined && (!Array.isArray(lesson.playlistVideoIds) || lesson.playlistVideoIds.length < 1 || lesson.playlistVideoIds.length > 500 || !lesson.playlistVideoIds.every((id) => typeof id === "string" && VIDEO_ID.test(id)))) ||
    (lesson.playlistIndex !== undefined && (!Number.isSafeInteger(lesson.playlistIndex) || Number(lesson.playlistIndex) < 0 || !Array.isArray(lesson.playlistVideoIds) || Number(lesson.playlistIndex) >= lesson.playlistVideoIds.length || lesson.playlistVideoIds[Number(lesson.playlistIndex)] !== lesson.videoId)) ||
    (lesson.title !== undefined && (typeof lesson.title !== "string" || lesson.title.length > 200)) ||
    typeof value.objective !== "string" ||
    parseObjective(value.objective) !== value.objective ||
    typeof value.goalMinutes !== "number" ||
    !parseGoalMinutes(value.goalMinutes).ok ||
    typeof value.revision !== "number" ||
    !Number.isSafeInteger(value.revision) ||
    value.revision < 1 ||
    typeof value.lastConfirmedPositionMs !== "number" ||
    !Number.isFinite(value.lastConfirmedPositionMs) ||
    value.lastConfirmedPositionMs < 0 ||
    typeof value.cumulativeRecordedFocusedMs !== "number" ||
    !Number.isFinite(value.cumulativeRecordedFocusedMs) ||
    value.cumulativeRecordedFocusedMs < 0 ||
    !["unfinished", "completed"].includes(String(value.lessonStatus)) ||
    !["not-started", "active", "interrupted", "finished"].includes(String(value.sessionStatus)) ||
    !isTimestamp(value.createdAt) ||
    !isTimestamp(value.updatedAt)
  ) {
    return null;
  }

  return value as unknown as CommitmentRecordV1;
}

export function parseStoredCommitment(raw: string):
  | { status: "valid"; record: CommitmentRecordV1 }
  | { status: "corrupt" | "unsupported-version" } {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { status: "corrupt" };
  }

  if (isRecord(value) && value.schemaVersion !== 1) {
    return { status: "unsupported-version" };
  }

  const record = decodeCommitment(value);
  return record ? { status: "valid", record } : { status: "corrupt" };
}
