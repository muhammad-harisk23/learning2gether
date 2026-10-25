// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerAdapter } from "../../src/services/youtube/playerAdapter";
import { YT_STATE, type YouTubePlayer, type YouTubePlayerOptions } from "../../src/services/youtube/iframeApi";

let fake: FakePlayer;
class FakePlayer implements YouTubePlayer {
  static last: FakePlayer;
  readonly iframe = document.createElement("iframe");
  readonly cueVideoById = vi.fn();
  readonly playVideo = vi.fn();
  readonly pauseVideo = vi.fn();
  readonly seekTo = vi.fn();
  readonly destroy = vi.fn();
  getCurrentTime = () => 12.5;
  getIframe = () => this.iframe;
  constructor(_mount: HTMLElement, readonly options: YouTubePlayerOptions) { FakePlayer.last = this; fake = this; }
  ready() { this.options.events.onReady({ target: this }); }
  state(value: number) { this.options.events.onStateChange({ target: this, data: value }); }
  error(value: number) { this.options.events.onError({ target: this, data: value }); }
  blocked() { this.options.events.onAutoplayBlocked({ target: this }); }
}

const apiLoader = async () => ({ Player: FakePlayer });
async function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const callbacks = { onState: vi.fn(), onError: vi.fn(), onAutoplayBlocked: vi.fn() };
  const adapter = new PlayerAdapter(host, callbacks, apiLoader);
  const candidate = adapter.cueCandidate("dQw4w9WgXcQ");
  await Promise.resolve();
  return { adapter, candidate, host, callbacks };
}

describe("YouTube player adapter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => { vi.useRealTimers(); document.body.replaceChildren(); });
  it("distinguishes API readiness from candidate-specific cue confirmation", async () => {
    const { adapter, candidate, callbacks } = await mount();
    expect(fake.options.playerVars.origin).toBe(window.location.origin);
    fake.ready();
    expect(fake.cueVideoById).toHaveBeenCalledWith("dQw4w9WgXcQ");
    fake.blocked();
    expect(callbacks.onAutoplayBlocked).toHaveBeenCalledOnce();
    fake.state(YT_STATE.cued);
    expect(await candidate).toEqual({ status: "accepted" });
    adapter.play();
    expect(fake.playVideo).toHaveBeenCalledOnce();
    expect(adapter.getPositionMs()).toBe(12500);
    adapter.destroy(); adapter.destroy();
    expect(fake.destroy).toHaveBeenCalledOnce();
    fake.state(YT_STATE.playing);
    expect(callbacks.onState).toHaveBeenCalledTimes(1);
  });
  it("reports an unembeddable candidate without accepting it", async () => {
    const { adapter, candidate } = await mount();
    fake.ready(); fake.error(150);
    expect(await candidate).toMatchObject({ status: "error", message: expect.stringContaining("embedded playback") });
    adapter.destroy();
  });
  it("times out only after cue and cancels cleanly", async () => {
    const { adapter, candidate } = await mount();
    fake.ready();
    vi.advanceTimersByTime(20000);
    expect(await candidate).toMatchObject({ status: "timeout" });
    adapter.destroy();
    const second = await mount();
    second.adapter.destroy();
    expect(await second.candidate).toMatchObject({ status: "cancelled" });
  });
});
