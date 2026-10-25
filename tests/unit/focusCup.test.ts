// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FocusCup } from "../../src/ui/FocusCup";

describe("FocusCup completion feedback", () => {
  let root: Root | undefined;
  let host: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root!.unmount());
    root = undefined;
    host?.remove();
    host = undefined;
    vi.useRealTimers();
  });

  function renderCup(recordedMs: number, goalMinutes: number, vesselStyle: "glass" | "coffee" = "glass") {
    if (!host) {
      host = document.createElement("div");
      document.body.append(host);
      root = createRoot(host);
    }
    act(() => root!.render(createElement(FocusCup, { recordedMs, goalMinutes, vesselStyle })));
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
});
