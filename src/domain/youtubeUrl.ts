export interface YouTubeLesson {
  videoId?: string;
  canonicalUrl: string;
  playlistId?: string;
  playlistVideoIds?: string[];
  playlistIndex?: number;
  title?: string;
}

export interface ConfirmedYouTubeLesson extends YouTubeLesson {
  videoId: string;
}

export type YouTubeUrlResult =
  | { ok: true; lesson: YouTubeLesson }
  | { ok: false; message: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const PLAYLIST_ID = /^[A-Za-z0-9_-]{10,80}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function canonicalYouTubeUrl(videoId: string, playlistId?: string): string {
  if (playlistId && videoId) return `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`;
  if (playlistId) return `https://www.youtube.com/playlist?list=${playlistId}`;
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function parseYouTubeUrl(input: string): YouTubeUrlResult {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, message: "Paste a complete YouTube video link." };
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) {
    return { ok: false, message: "Use a secure YouTube video link." };
  }

  let videoId: string | null = null;
  let playlistId: string | null = null;
  const isYoutubeHost = YOUTUBE_HOSTS.has(url.hostname);
  const playlistOnly = isYoutubeHost && url.pathname === "/playlist";
  const parts = url.pathname.split("/").filter(Boolean);
  const listValues = url.searchParams.getAll("list");
  if (listValues.length === 1 && PLAYLIST_ID.test(listValues[0])) playlistId = listValues[0];
  if (listValues.length > 1 || (listValues.length === 1 && !playlistId)) {
    return { ok: false, message: "Use a valid YouTube playlist link." };
  }

  if (url.hostname === "youtu.be" && parts.length === 1) {
    videoId = parts[0];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) {
      videoId = url.searchParams.get("v");
    } else if (playlistOnly) {
      // Playlist-only links intentionally have no video ID; the player resolves its first real item.
    } else if (parts.length === 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      videoId = parts[1];
    }
  }

  if ((videoId && !VIDEO_ID.test(videoId)) || (!videoId && !playlistId) || (!videoId && !playlistOnly)) {
    return { ok: false, message: playlistId ? "Use a valid video or playlist link." : "Use a link to one supported YouTube video or playlist." };
  }

  const confirmedVideoId = videoId && VIDEO_ID.test(videoId) ? videoId : undefined;
  return {
    ok: true,
    lesson: {
      ...(confirmedVideoId ? { videoId: confirmedVideoId } : {}),
      ...(playlistId ? { playlistId } : {}),
      canonicalUrl: canonicalYouTubeUrl(confirmedVideoId ?? "", playlistId ?? undefined),
    },
  };
}
