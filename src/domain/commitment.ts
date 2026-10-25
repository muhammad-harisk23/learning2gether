import type { ConfirmedYouTubeLesson } from "./youtubeUrl";
import { DEFAULT_FOCUS_VESSEL, type FocusVesselStyle } from "./focusVessel";

export type LessonStatus = "unfinished" | "completed";
export type SessionStatus = "not-started" | "active" | "interrupted" | "finished";

export interface CommitmentRecordV1 {
  schemaVersion: 1;
  revision: number;
  lesson: ConfirmedYouTubeLesson;
  objective: string;
  goalMinutes: number;
  vesselStyle?: FocusVesselStyle;
  lastConfirmedPositionMs: number;
  cumulativeRecordedFocusedMs: number;
  lessonStatus: LessonStatus;
  sessionStatus: SessionStatus;
  createdAt: string;
  updatedAt: string;
}

export function parseObjective(value: string): string | null {
  const objective = value.trim().replace(/\s+/g, " ");
  return objective.length >= 1 && objective.length <= 180 ? objective : null;
}

export function newCommitment(
  lesson: ConfirmedYouTubeLesson,
  objective: string,
  goalMinutes: number,
  now = new Date(),
): CommitmentRecordV1 {
  const timestamp = now.toISOString();
  return {
    schemaVersion: 1,
    revision: 1,
    lesson,
    objective,
    goalMinutes,
    vesselStyle: DEFAULT_FOCUS_VESSEL,
    lastConfirmedPositionMs: 0,
    cumulativeRecordedFocusedMs: 0,
    lessonStatus: "unfinished",
    sessionStatus: "active",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}
