import { loadYouTubeApi, YT_STATE, type YouTubeApi, type YouTubePlayer } from "./iframeApi";
import { canonicalYouTubeUrl, type ConfirmedYouTubeLesson, type YouTubeLesson } from "../../domain/youtubeUrl";

export type PlayerState = "unstarted" | "cued" | "playing" | "paused" | "buffering" | "ended";
export type CandidateResult = { status: "accepted"; lesson: ConfirmedYouTubeLesson } | { status: "error" | "timeout" | "cancelled"; message: string };
export interface CurrentVideo {
  videoId: string;
  title?: string;
  playlistIndex?: number;
  playlistVideoIds?: string[];
}

export function playerErrorMessage(code: number): string {
  switch (code) {
    case 2: return "YouTube rejected this video ID. Check the lesson URL.";
    case 5: return "This video cannot play in the HTML5 player. Try another lesson.";
    case 100: return "This video is unavailable or private. Try another lesson.";
    case 101:
    case 150: return "This video does not allow embedded playback. Try another lesson.";
    case 153: return "YouTube could not verify the playback request. Retry or choose another lesson.";
    default: return "YouTube could not play this lesson. Retry or choose another lesson.";
  }
}

function normalizeState(state: number): PlayerState | null {
  switch (state) {
    case YT_STATE.unstarted: return "unstarted";
    case YT_STATE.cued: return "cued";
    case YT_STATE.playing: return "playing";
    case YT_STATE.paused: return "paused";
    case YT_STATE.buffering: return "buffering";
    case YT_STATE.ended: return "ended";
    default: return null;
  }
}

export interface PlayerCallbacks {
  onState(state: PlayerState): void;
  onError(message: string): void;
  onAutoplayBlocked(): void;
  onCurrentVideo?(video: CurrentVideo): void;
}

export class PlayerAdapter {
  private player: YouTubePlayer | null = null;
  private destroyed = false;
  private timeout: number | null = null;
  private resolveCandidate: ((result: CandidateResult) => void) | null = null;
  private candidateAccepted = false;
  private playlistRepositioned = false;
  private state: PlayerState = "unstarted";

  constructor(
    private readonly host: HTMLElement,
    private readonly callbacks: PlayerCallbacks,
    private readonly apiLoader: () => Promise<YouTubeApi> = loadYouTubeApi,
  ) {}

  async cueCandidate(input: string | YouTubeLesson): Promise<CandidateResult> {
    if (this.destroyed) return { status: "cancelled", message: "Loading cancelled." };
    if (this.resolveCandidate || this.player) throw new Error("Player already initialized");
    const lesson: YouTubeLesson = typeof input === "string" ? {
      videoId: input,
      canonicalUrl: `https://www.youtube.com/watch?v=${input}`,
    } : input;
    if (!lesson.videoId && !lesson.playlistId) return { status: "error", message: "The lesson URL has no video or playlist ID." };
    try {
      const api = await this.apiLoader();
      if (this.destroyed) return { status: "cancelled", message: "Loading cancelled." };
      return await new Promise<CandidateResult>((resolve) => {
        this.resolveCandidate = resolve;
        const mount = document.createElement("div");
        this.host.appendChild(mount);
        this.player = new api.Player(mount, {
          width: "100%",
          height: "100%",
          playerVars: { controls: 1, origin: window.location.origin, playsinline: 1 },
          events: {
            onReady: ({ target }) => {
              if (this.destroyed) return;
              if (lesson.playlistId) {
                target.cuePlaylist({ list: lesson.playlistId, listType: "playlist", index: lesson.playlistIndex ?? 0 });
              } else if (lesson.videoId) {
                target.cueVideoById(lesson.videoId);
              }
              this.timeout = window.setTimeout(() => this.resolveOnce({
                status: "timeout",
                message: "Couldn’t confirm this video loaded. Retry or cancel.",
              }), 20000);
            },
            onStateChange: ({ data }) => {
              if (this.destroyed) return;
              const state = normalizeState(data);
              if (!state) return;
              this.state = state;
              this.callbacks.onState(state);
              const video = this.readCurrentVideo();
              if (!this.candidateAccepted && (state === "cued" || state === "playing")) {
                if (!video) return;
                if (lesson.playlistId && !video.playlistVideoIds?.length) {
                  this.resolveOnce({ status: "error", message: "YouTube confirmed a video but did not return this playlist’s entries. The saved commitment was left unchanged; try a direct video link." });
                  return;
                }
                if (lesson.playlistId && lesson.videoId && video.playlistVideoIds) {
                  const requestedIndex = video.playlistVideoIds.indexOf(lesson.videoId);
                  if (requestedIndex < 0) {
                    this.resolveOnce({ status: "error", message: "The selected video is not in this playlist. The saved commitment was left unchanged." });
                    return;
                  }
                  if (!this.playlistRepositioned && video.playlistIndex !== requestedIndex) {
                    this.playlistRepositioned = true;
                    this.player?.cuePlaylist({ list: lesson.playlistId, listType: "playlist", index: requestedIndex });
                    return;
                  }
                  if (video.videoId !== lesson.videoId) return;
                }
                this.candidateAccepted = true;
                this.resolveOnce({ status: "accepted", lesson: {
                  ...lesson,
                  videoId: video.videoId,
                  canonicalUrl: canonicalYouTubeUrl(video.videoId, lesson.playlistId),
                  ...(video.playlistIndex !== undefined ? { playlistIndex: video.playlistIndex } : {}),
                  ...(video.playlistVideoIds ? { playlistVideoIds: video.playlistVideoIds } : {}),
                  ...(video.title ? { title: video.title } : {}),
                } });
              }
              if (this.candidateAccepted && video) this.callbacks.onCurrentVideo?.(video);
            },
            onError: ({ data }) => {
              if (this.destroyed) return;
              const message = playerErrorMessage(data);
              this.callbacks.onError(message);
              this.resolveOnce({ status: "error", message });
            },
            onAutoplayBlocked: () => {
              if (!this.destroyed) this.callbacks.onAutoplayBlocked();
            },
          },
        });
      });
    } catch {
      return { status: "error", message: "YouTube could not be reached. Check your connection and retry." };
    }
  }

  private resolveOnce(result: CandidateResult): void {
    if (!this.resolveCandidate) return;
    if (this.timeout !== null) window.clearTimeout(this.timeout);
    this.timeout = null;
    const resolve = this.resolveCandidate;
    this.resolveCandidate = null;
    resolve(result);
  }

  play(): void { if (!this.destroyed) this.player?.playVideo(); }
  pause(): void { if (!this.destroyed) this.player?.pauseVideo(); }
  seekTo(ms: number): void { if (!this.destroyed) this.player?.seekTo(ms / 1000, true); }
  getPositionMs(): number | null {
    if (this.destroyed || !this.player) return null;
    const seconds = this.player.getCurrentTime();
    return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : null;
  }
  getIframe(): HTMLIFrameElement | null {
    return this.destroyed ? null : this.player?.getIframe() ?? null;
  }
  getState(): PlayerState { return this.state; }
  getPlaylistVideoIds(): string[] { return this.player?.getPlaylist?.() ?? []; }
  playVideoAt(index: number): void {
    const ids = this.getPlaylistVideoIds();
    if (!this.destroyed && Number.isInteger(index) && index >= 0 && index < ids.length) this.player?.playVideoAt(index);
  }

  private readCurrentVideo(): CurrentVideo | null {
    const player = this.player;
    const videoId = player?.getVideoData?.().video_id;
    if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) return null;
    const playlistVideoIds = player?.getPlaylist?.() ?? [];
    const playlistIndex = playlistVideoIds.length ? player?.getPlaylistIndex?.() : undefined;
    return {
      videoId,
      ...(player?.getVideoData?.().title ? { title: player.getVideoData().title } : {}),
      ...(playlistIndex !== undefined && playlistIndex >= 0 ? { playlistIndex } : {}),
      ...(playlistVideoIds.length ? { playlistVideoIds } : {}),
    };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.resolveOnce({ status: "cancelled", message: "Loading cancelled." });
    this.player?.destroy();
    this.player = null;
    this.host.replaceChildren();
  }
}
