import { describe, expect, it } from "vitest";
import { parseGoalMinutes, goalProgress } from "../../src/domain/focusGoal";
import { parseObjective } from "../../src/domain/commitment";
import { parseYouTubeUrl } from "../../src/domain/youtubeUrl";

describe("lesson URL validation", () => {
  const id = "dQw4w9WgXcQ";
  it.each([
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&list=ignored`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}`,
  ])("accepts and canonicalizes %s", (url) => {
    expect(parseYouTubeUrl(url)).toEqual({ ok: true, lesson: { videoId: id, canonicalUrl: `https://www.youtube.com/watch?v=${id}` } });
  });
  it.each([
    `http://youtube.com/watch?v=${id}`,
    `https://youtube.com.evil.example/watch?v=${id}`,
    `https://person@youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&v=${id}`,
    `https://youtube.com/playlist?list=${id}`,
    "javascript:alert(1)",
    "https://youtu.be/too-short",
    "https://youtube.com/watch?v=bad",
  ])("rejects %s", (url) => expect(parseYouTubeUrl(url).ok).toBe(false));
});

describe("commitment input rules", () => {
  it.each(["5", "25", "240"])("accepts %s minutes", (input) => expect(parseGoalMinutes(input).ok).toBe(true));
  it.each(["4", "241", "5.5", "1e2", "", "Infinity", "-5"])("rejects %s minutes", (input) => expect(parseGoalMinutes(input).ok).toBe(false));
  it("normalizes short objectives and caps progress visually", () => {
    expect(parseObjective("  Solve   equations  ")).toBe("Solve equations");
    expect(parseObjective(" ")).toBeNull();
    expect(parseObjective("x".repeat(181))).toBeNull();
    expect(goalProgress(35 * 60_000, 25)).toEqual({ fill: 1, remainingMs: 0 });
  });
});
