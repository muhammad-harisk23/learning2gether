import { describe, expect, it } from "vitest";
import { buildShareCardSvg } from "../../src/ui/shareCardSvg";
import type { ShareProgressData } from "../../src/domain/shareProgress";

const data: ShareProgressData = {
  recordedFocusMs: 83 * 60_000,
  focusGoalMinutes: 60,
  goalPercent: 100,
  goalReached: true,
  todayMs: 42 * 60_000,
  weekMs: 4 * 60 * 60_000 + 18 * 60_000,
  monthMs: 4 * 60 * 60_000 + 18 * 60_000,
  yearMs: 4 * 60 * 60_000 + 18 * 60_000,
  lifetimeMs: 27 * 60 * 60_000 + 42 * 60_000,
  streakDays: 4,
  resourcesInProgress: 3,
  lessonsMarkedComplete: 6,
  vesselStyle: "bottle",
  subject: "Physics",
  resourceTitle: "Current Electricity <script>alert(1)</script>",
};

describe("share card SVG", () => {
  it("exports a static 4:5 card with the selected vessel and capped liquid", () => {
    const svg = buildShareCardSvg(data, "goal");
    expect(svg).toContain('width="1080" height="1350" viewBox="0 0 1080 1350"');
    expect(svg).toContain("I SAID");
    expect(svg).toContain("GOAL REACHED");
    expect(svg).toContain("83");
    expect(svg).toContain("60 MIN.");
    expect(svg).toContain("M91 50 V34");
    expect(svg).toContain('x="55" y="51" width="130" height="131"');
    expect(svg).not.toMatch(/revision|updatedAt|cumulativeRecordedFocusedMs|video:/i);
    expect(svg).not.toContain("@keyframes");
    expect(svg).not.toContain("script>alert");
  });

  it("does not include a private resource title unless the learner opts in", () => {
    expect(buildShareCardSvg(data, "daily")).not.toContain("Current Electricity");
    const included = buildShareCardSvg(data, "daily", true);
    expect(included).toContain("Current Electricity &lt;script&gt;");
    expect(included).not.toContain("<script>");
  });

  it("renders truthful recap metrics and distinguishes the goal cup from today's time", () => {
    const recap = buildShareCardSvg(data, "recap");
    expect(recap).toContain("TODAY · RECORDED");
    expect(recap).toContain("4h 18m");
    expect(recap).toContain("27h 42m");
    expect(recap).toContain("6 lessons marked complete");
    expect(buildShareCardSvg(data, "daily")).toContain("I SHOWED UP.");
    expect(buildShareCardSvg(data, "daily")).toContain("MIN TODAY");
    expect(buildShareCardSvg(data, "daily")).toContain("83 / 60 MIN");
    expect(buildShareCardSvg(data, "daily")).toContain("100% OF MY GOAL");
  });

  it("animates only the live preview and leaves a final static export", () => {
    const preview = buildShareCardSvg(data, "daily", false, true);
    const exportSvg = buildShareCardSvg(data, "daily");
    expect(preview).toContain("@keyframes share-fill");
    expect(preview).toContain("@keyframes share-progress");
    expect(preview).toContain("@media(prefers-reduced-motion:reduce)");
    expect(preview).toContain('class="share-streak"');
    expect(exportSvg).not.toContain("@keyframes");
    expect(exportSvg).not.toContain("share-liquid");
    expect(exportSvg).toContain('width="1080" height="1350" viewBox="0 0 1080 1350"');
  });

  it("keeps a zero-activity card intentional without inventing progress", () => {
    const zero = { ...data, recordedFocusMs: 0, todayMs: 0, goalPercent: 0, goalReached: false, streakDays: 0 };
    const svg = buildShareCardSvg(zero, "daily");
    expect(svg).toContain(">0</text>");
    expect(svg).toContain("0% OF MY GOAL");
    expect(svg).toContain("0 DAY STREAK");
    expect(svg).not.toContain("NaN");
  });
});
