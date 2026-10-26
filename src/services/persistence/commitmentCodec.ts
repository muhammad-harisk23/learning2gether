import type { CommitmentRecordV1 } from "../../domain/commitment";
import { parseObjective } from "../../domain/commitment";
import { parseGoalMinutes } from "../../domain/focusGoal";
import { parseYouTubeUrl } from "../../domain/youtubeUrl";
import { isFocusVesselStyle } from "../../domain/focusVessel";

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_DATA_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isCanonicalSourceLesson(lesson: Record<string, unknown>, sourceVideoId: unknown): boolean {
  if (typeof lesson.canonicalUrl !== "string") return false;
  const source = parseYouTubeUrl(lesson.canonicalUrl);
  if (!source.ok || source.lesson.canonicalUrl !== lesson.canonicalUrl) return false;
  if (sourceVideoId !== undefined &&
      (typeof sourceVideoId !== "string" || !VIDEO_ID.test(sourceVideoId) || source.lesson.videoId !== sourceVideoId)) {
    return false;
  }
  if (typeof lesson.playlistId === "string") {
    return source.lesson.playlistId === lesson.playlistId;
  }
  return source.lesson.videoId === lesson.videoId;
}

export function decodeCommitment(value: unknown): CommitmentRecordV1 | null {
  if (!isRecord(value) || value.schemaVersion !== 1 || !isRecord(value.lesson)) {
    return null;
  }

  const { lesson } = value;
  if (
    (lesson.videoId !== undefined && (typeof lesson.videoId !== "string" || !VIDEO_ID.test(lesson.videoId))) ||
    (!lesson.videoId && typeof lesson.playlistId !== "string") ||
    (lesson.playlistId !== undefined && (typeof lesson.playlistId !== "string" || !/^[A-Za-z0-9_-]{10,80}$/.test(lesson.playlistId))) ||
    typeof lesson.canonicalUrl !== "string" ||
    !isCanonicalSourceLesson(lesson, value.sourceVideoId) ||
    (lesson.playlistVideoIds !== undefined && (!Array.isArray(lesson.playlistVideoIds) || lesson.playlistVideoIds.length < 1 || lesson.playlistVideoIds.length > 500 || !lesson.playlistVideoIds.every((id) => typeof id === "string" && VIDEO_ID.test(id)))) ||
    (lesson.playlistIndex !== undefined && (!Number.isSafeInteger(lesson.playlistIndex) || Number(lesson.playlistIndex) < 0 || !Array.isArray(lesson.playlistVideoIds) || Number(lesson.playlistIndex) >= lesson.playlistVideoIds.length || lesson.playlistVideoIds[Number(lesson.playlistIndex)] !== lesson.videoId)) ||
    (lesson.title !== undefined && (typeof lesson.title !== "string" || lesson.title.length > 200)) ||
    typeof value.objective !== "string" ||
    parseObjective(value.objective) !== value.objective ||
    typeof value.goalMinutes !== "number" ||
    !parseGoalMinutes(value.goalMinutes).ok ||
    (value.vesselStyle !== undefined && !isFocusVesselStyle(value.vesselStyle)) ||
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

  const {
    checkpointRecordedAt: _checkpointRecordedAt,
    ...storedValue
  } = value;
  const { title: _title, playlistVideoIds: _playlistVideoIds, playlistIndex: _playlistIndex, ...storedLesson } = lesson;
  const checkpointRecordedAt = value.checkpointRecordedAt;
  const checkpointAge = typeof checkpointRecordedAt === "string"
    ? Date.now() - Date.parse(checkpointRecordedAt)
    : Number.POSITIVE_INFINITY;
  const checkpointIsFresh = checkpointAge >= 0 && checkpointAge < YOUTUBE_DATA_MAX_AGE_MS;
  const sourceLesson = parseYouTubeUrl(lesson.canonicalUrl);
  const sourceVideoId = typeof value.sourceVideoId === "string"
    ? value.sourceVideoId
    : !storedLesson.playlistId && sourceLesson.ok
      ? sourceLesson.lesson.videoId
      : undefined;
  const retainedVideoId = checkpointIsFresh ? storedLesson.videoId : sourceVideoId;
  const retainedLesson = { ...storedLesson };
  if (retainedVideoId) retainedLesson.videoId = retainedVideoId;
  else delete retainedLesson.videoId;
  return {
    ...storedValue,
    lesson: retainedLesson,
    lastConfirmedPositionMs: checkpointIsFresh ? value.lastConfirmedPositionMs : 0,
    ...(checkpointIsFresh && typeof checkpointRecordedAt === "string" ? { checkpointRecordedAt } : {}),
  } as unknown as CommitmentRecordV1;
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
