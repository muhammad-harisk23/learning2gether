import { describe, expect, it, vi } from "vitest";
import { FocusController } from "../../src/services/focus/focusController";
import { classifyFocus, type FocusSnapshot, type FocusSignalSource } from "../../src/services/focus/focusSignals";

class FakeFocusSource implements FocusSignalSource {
  value: FocusSnapshot = { visibility: "visible", hasFocus: true, iframeActive: false };
  listener: ((value: FocusSnapshot) => void) | null = null;
  snapshot = () => this.value;
  subscribe = (listener: (value: FocusSnapshot) => void) => {
    this.listener = listener;
    return () => { this.listener = null; };
  };
  set(value: FocusSnapshot) { this.value = value; this.listener?.(value); }
}

function fixture() {
  const source = new FakeFocusSource();
  let now = 0;
  let tick: (() => void) | null = null;
  const add = vi.fn();
  const pause = vi.fn();
  const checkpoint = vi.fn();
  const setTimer = ((callback: () => void) => { tick = callback; return 1; }) as typeof window.setInterval;
  const clearTimer = vi.fn() as unknown as typeof window.clearInterval;
  const controller = new FocusController({
    source,
    now: () => now,
    setIntervalFn: setTimer,
    clearIntervalFn: clearTimer,
    callbacks: { onState: vi.fn(), onPauseRequested: pause, onActivity: add, onCheckpoint: checkpoint },
  });
  return {
    source, controller, add, pause, checkpoint, clearTimer,
    start() { controller.start(); },
    sample(ms = 500) { now += ms; tick?.(); },
  };
}

describe("conservative focus accounting", () => {
  it("credits only bounded samples after actual playing begins", () => {
    const f = fixture();
    f.start();
    f.controller.setSessionActive(true);
    f.controller.setPlayerState("cued");
    f.sample(1000);
    expect(f.add).not.toHaveBeenCalled();
    f.controller.setPlayerState("playing");
    f.sample(500); // establishes a fresh baseline
    f.sample(500);
    expect(f.add).toHaveBeenCalledExactlyOnceWith(500);
    f.sample(2000); // stale callback interval is discarded
    f.sample(500);
    expect(f.add).toHaveBeenCalledTimes(2);
    f.controller.dispose();
  });

  it("does not count paused, buffering, duplicate, or delayed samples", () => {
    const f = fixture();
    f.start();
    f.controller.setSessionActive(true);
    f.controller.setPlayerState("playing");
    f.sample(); // baseline
    f.controller.setPlayerState("playing"); // duplicate state is inert
    f.sample();
    f.controller.setPlayerState("buffering");
    f.sample(5000);
    f.controller.setPlayerState("playing");
    f.sample(); // baseline after recovery
    f.sample(1501);
    expect(f.add).toHaveBeenCalledTimes(1);
    expect(f.add).toHaveBeenCalledWith(500);
    f.controller.setPlayerState("paused");
    f.sample();
    expect(f.add).toHaveBeenCalledTimes(1);
    f.controller.dispose();
  });

  it("stops and requests pause on hidden or confirmed focus loss", () => {
    const f = fixture();
    f.start();
    f.controller.setSessionActive(true);
    f.controller.setPlayerState("playing");
    f.sample();
    f.source.set({ visibility: "hidden", hasFocus: false, iframeActive: false });
    expect(f.pause).toHaveBeenCalledWith("hidden");
    f.sample(500);
    expect(f.add).not.toHaveBeenCalled();
    f.source.set({ visibility: "visible", hasFocus: false, iframeActive: false });
    expect(f.pause).toHaveBeenCalledWith("confirmed-lost");
    f.controller.dispose();
  });

  it("treats focused iframe ambiguity conservatively without falsely pausing", () => {
    expect(classifyFocus({ visibility: "visible", hasFocus: false, iframeActive: true })).toBe("ambiguous-iframe");
    const f = fixture();
    f.start();
    f.controller.setSessionActive(true);
    f.controller.setPlayerState("playing");
    f.sample();
    f.source.set({ visibility: "visible", hasFocus: false, iframeActive: true });
    f.sample();
    expect(f.add).not.toHaveBeenCalled();
    expect(f.pause).not.toHaveBeenCalled();
    f.controller.dispose();
  });

  it("uses one idempotent scheduler and disposes it", () => {
    const f = fixture();
    f.start(); f.start();
    f.controller.dispose(); f.controller.dispose();
    expect(f.clearTimer).toHaveBeenCalledOnce();
  });
  it("checkpoints observed eligible activity at five-second boundaries", () => {
    const f = fixture();
    f.start();
    f.controller.setSessionActive(true);
    f.controller.setPlayerState("playing");
    f.sample(); // baseline
    for (let index = 0; index < 10; index++) f.sample(500);
    expect(f.add).toHaveBeenCalledTimes(10);
    expect(f.checkpoint).toHaveBeenCalledOnce(); // five-second observed sample boundary
    f.controller.dispose();
  });
});
