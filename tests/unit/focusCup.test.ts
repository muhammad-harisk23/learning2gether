// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusCup } from "../../src/ui/FocusCup";
import { FOCUS_VESSELS, type FocusVesselStyle } from "../../src/domain/focusVessel";

describe("FocusCup completion feedback", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;
  let previousMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaOverridden = false;

  function preferReducedMotion(): void {
    if (!matchMediaOverridden) previousMatchMedia = window.matchMedia;
    matchMediaOverridden = true;
    Object.defineProperty(window, "matchMedia", { configurable: true, value: () => ({ matches: true }) });
  }

  afterEach(() => {
    if (root) act(() => root!.unmount());
    root = undefined;
    host?.remove();
    host = undefined;
    vi.useRealTimers();
    if (previousMatchMedia) Object.defineProperty(window, "matchMedia", { configurable: true, value: previousMatchMedia });
    else delete (window as Partial<Window>).matchMedia;
    previousMatchMedia = undefined;
    matchMediaOverridden = false;
  });

  function renderCup(recordedMs: number, goalMinutes: number, vesselStyle: FocusVesselStyle = "glass", recording = false) {
    preferReducedMotion();
    if (!host) {
      host = document.createElement("div");
      document.body.append(host);
      root = createRoot(host);
    }
    act(() => root!.render(createElement(FocusCup, { recordedMs, goalMinutes, vesselStyle, recording, activityLabel: recording ? "Recording focus" : undefined })));
    return host.querySelector(".focus-cup")!;
  }

  it("celebrates only on a below-goal recorded-time transition and settles once despite more checkpoints", () => {
    vi.useFakeTimers();
    expect(renderCup(0, 25).getAttribute("data-celebrating")).toBe("false");
    expect(renderCup(24 * 60_000, 25).getAttribute("data-celebrating")).toBe("false");
    expect(renderCup(25 * 60_000, 25).getAttribute("data-celebrating")).toBe("true");
    expect(renderCup(25 * 60_000 + 5_000, 25, "coffee").getAttribute("data-celebrating")).toBe("true");
    act(() => vi.advanceTimersByTime(1300));
    expect(host!.querySelector(".focus-cup")?.getAttribute("data-celebrating")).toBe("false");
    expect(renderCup(25 * 60_000 + 10_000, 25).getAttribute("data-celebrating")).toBe("false");
  });

  it("does not celebrate a goal edit or mounting an already-complete saved record", () => {
    vi.useFakeTimers();
    expect(renderCup(24 * 60_000, 25).getAttribute("data-celebrating")).toBe("false");
    expect(renderCup(24 * 60_000, 24).getAttribute("data-celebrating")).toBe("false");
    act(() => root!.unmount());
    root = undefined;
    host!.remove();
    host = undefined;
    expect(renderCup(30 * 60_000, 25).getAttribute("data-celebrating")).toBe("false");
  });

  it("labels the cup with eligible recorded minutes and the capped goal percentage", () => {
    const cup = renderCup(12 * 60_000, 40);
    expect(cup.querySelector("svg")?.getAttribute("aria-label")).toContain("Focus goal progress: 12 of 40 minutes, 30 percent.");
    const overGoal = renderCup(50 * 60_000, 40);
    expect(overGoal.querySelector("svg")?.getAttribute("aria-label")).toContain("Focus goal progress: 50 of 40 minutes, 100 percent. Goal reached.");
  });

  it("renders exact 0, half, full, and capped over-goal fill across all vessels", () => {
    for (const vessel of FOCUS_VESSELS) {
      for (const [minutes, expected] of [[0, 0], [30, 50], [60, 100], [75, 100]] as const) {
        const cup = renderCup(minutes * 60_000, 60, vessel.id);
        expect(cup.getAttribute("data-vessel")).toBe(vessel.id);
        expect(cup.getAttribute("data-fill-percent")).toBe(String(expected));
        expect(cup.querySelector(".cup-liquid")).not.toBeNull();
      }
      const overGoal = renderCup(75 * 60_000, 60, vessel.id);
      expect(overGoal.querySelector(".cup-time")?.textContent).toBe("75 min focused");
      expect(Number(overGoal.querySelector(".cup-liquid")?.getAttribute("height"))).toBeGreaterThan(0);
    }
  });

  it("shows current recording state without using the animation as the only signal", () => {
    const cup = renderCup(3 * 60_000, 25, "mug", true);
    expect(cup.textContent).toContain("Recording focus");
    expect(cup.querySelector("svg")?.getAttribute("aria-label")).toBe("Focus goal progress: 3 of 25 minutes, 12 percent.");
  });
});
