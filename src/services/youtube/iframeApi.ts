export const YT_STATE = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5,
} as const;

export interface YouTubePlayer {
  cueVideoById(videoId: string): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  destroy(): void;
  getIframe(): HTMLIFrameElement;
}

export interface YouTubePlayerOptions {
  videoId?: string;
  width?: string;
  height?: string;
  playerVars: { controls: 1; origin: string; playsinline: 1 };
  events: {
    onReady(event: { target: YouTubePlayer }): void;
    onStateChange(event: { data: number; target: YouTubePlayer }): void;
    onError(event: { data: number; target: YouTubePlayer }): void;
    onAutoplayBlocked(event: { target: YouTubePlayer }): void;
  };
}

export interface YouTubeApi {
  Player: new (element: HTMLElement, options: YouTubePlayerOptions) => YouTubePlayer;
}

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loader: Promise<YouTubeApi> | null = null;

export function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loader) return loader;

  loader = new Promise<YouTubeApi>((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;
    let completed = false;
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(new Error("YouTube did not respond.")), 20000);

    function finish(error?: Error) {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previousCallback;
      if (error || !window.YT?.Player) {
        loader = null;
        reject(error ?? new Error("YouTube API was unavailable."));
      } else {
        resolve(window.YT);
      }
    }

    window.onYouTubeIframeAPIReady = () => {
      previousCallback?.();
      finish();
    };
    script.src = "https://www.youtube.com/iframe_api";
    script.async = true;
    script.onerror = () => finish(new Error("YouTube could not be reached."));
    document.head.appendChild(script);
  });
  return loader;
}
