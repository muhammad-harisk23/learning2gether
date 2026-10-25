// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlayerAdapter } from "../../src/services/youtube/playerAdapter";
import { YT_STATE, type YouTubePlayer, type YouTubePlayerOptions } from "../../src/services/youtube/iframeApi";

let fake: FakePlayer;
class FakePlayer implements YouTubePlayer {
  static last: FakePlayer;
  readonly iframe = document.createElement("iframe");
  playlist = ["dQw4w9WgXcQ", "M7lc1UVf-VE"];
  activeIndex = 0;
  activeVideoId = "dQw4w9WgXcQ";
  readonly cueVideoById = vi.fn();
  readonly cuePlaylist = vi.fn();
  readonly playVideo = vi.fn();
  readonly playVideoAt = vi.fn();
  readonly pauseVideo = vi.fn();
  readonly seekTo = vi.fn();
  readonly destroy = vi.fn();
  getCurrentTime = () => 12.5;
  getPlaylist = () => this.playlist;
  getPlaylistIndex = () => this.activeIndex;
  getVideoData = () => ({ video_id: this.activeVideoId, title: "A real test video" });
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
    expect(await candidate).toMatchObject({ status: "accepted", lesson: { videoId: "dQw4w9WgXcQ" } });
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
  it("cues a real playlist, returns its ordered IDs, and fails honestly without entries", async () => {
    const { adapter, candidate } = await mount();
    const loading = adapter.cueCandidate({ playlistId: "PL1234567890ABCDEF", canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890ABCDEF" });
    // mount() has already started a single-video candidate; use a fresh host for playlist setup below.
    await expect(loading).rejects.toThrow("Player already initialized");
    adapter.destroy();
    await candidate;

    const host = document.createElement("div"); document.body.appendChild(host);
    const playlistAdapter = new PlayerAdapter(host, { onState: vi.fn(), onError: vi.fn(), onAutoplayBlocked: vi.fn() }, apiLoader);
    const playlistPromise = playlistAdapter.cueCandidate({ playlistId: "PL1234567890ABCDEF", canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890ABCDEF" });
    await Promise.resolve();
    fake.ready();
    expect(fake.cuePlaylist).toHaveBeenCalledWith({ list: "PL1234567890ABCDEF", listType: "playlist", index: 0 });
    fake.state(YT_STATE.cued);
    expect(await playlistPromise).toMatchObject({ status: "accepted", lesson: { videoId: "dQw4w9WgXcQ", playlistVideoIds: ["dQw4w9WgXcQ", "M7lc1UVf-VE"] } });
    playlistAdapter.playVideoAt(1);
    expect(fake.playVideoAt).toHaveBeenCalledWith(1);
    playlistAdapter.destroy();

    const emptyHost = document.createElement("div"); document.body.appendChild(emptyHost);
    const emptyAdapter = new PlayerAdapter(emptyHost, { onState: vi.fn(), onError: vi.fn(), onAutoplayBlocked: vi.fn() }, apiLoader);
    const emptyPromise = emptyAdapter.cueCandidate({ playlistId: "PL1234567890ABCDEF", canonicalUrl: "https://www.youtube.com/playlist?list=PL1234567890ABCDEF" });
    await Promise.resolve();
    fake.ready(); fake.playlist = []; fake.state(YT_STATE.cued);
    expect(await emptyPromise).toMatchObject({ status: "error", message: expect.stringContaining("did not return") });
    emptyAdapter.destroy();
  });
  it("restores a watch URL to its requested video within the actual playlist", async () => {
    const host = document.createElement("div"); document.body.appendChild(host);
    const adapter = new PlayerAdapter(host, { onState: vi.fn(), onError: vi.fn(), onAutoplayBlocked: vi.fn() }, apiLoader);
    const candidate = adapter.cueCandidate({
      videoId: "M7lc1UVf-VE",
      playlistId: "PL1234567890ABCDEF",
      canonicalUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE&list=PL1234567890ABCDEF",
    });
    await Promise.resolve();
    fake.ready(); fake.state(YT_STATE.cued);
    expect(fake.cuePlaylist).toHaveBeenLastCalledWith({ list: "PL1234567890ABCDEF", listType: "playlist", index: 1 });
    fake.activeIndex = 1; fake.activeVideoId = "M7lc1UVf-VE"; fake.state(YT_STATE.cued);
    expect(await candidate).toMatchObject({ status: "accepted", lesson: { videoId: "M7lc1UVf-VE", playlistIndex: 1 } });
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
