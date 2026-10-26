export type GoalResult =
  | { ok: true; minutes: number }
  | { ok: false; message: string };

export function parseGoalMinutes(input: string | number): GoalResult {
  const value = String(input).trim();
  if (!/^\d+$/.test(value)) {
    return { ok: false, message: "Enter a whole number of minutes." };
  }

  const minutes = Number(value);
  if (!Number.isSafeInteger(minutes) || minutes < 5 || minutes > 240) {
    return { ok: false, message: "Choose between 5 and 240 minutes." };
  }

  return { ok: true, minutes };
}

export function goalProgress(recordedMs: number, goalMinutes: number) {
  const goalMs = goalMinutes * 60_000;
  return {
    fill: Math.min(Math.max(recordedMs / goalMs, 0), 1),
    remainingMs: Math.max(goalMs - recordedMs, 0),
  };
}

/** Whole-number display percentage derived from the same capped goal ratio used by the vessel. */
export function goalPercent(recordedMs: number, goalMinutes: number): number {
  return Math.floor(goalProgress(recordedMs, goalMinutes).fill * 100);
}
