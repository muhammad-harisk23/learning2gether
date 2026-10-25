export interface YouTubeLesson {
  videoId: string;
  canonicalUrl: string;
}

export type YouTubeUrlResult =
  | { ok: true; lesson: YouTubeLesson }
  | { ok: false; message: string };

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function canonicalYouTubeUrl(videoId: string): string {
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
  const parts = url.pathname.split("/").filter(Boolean);

  if (url.hostname === "youtu.be" && parts.length === 1) {
    videoId = parts[0];
  } else if (YOUTUBE_HOSTS.has(url.hostname)) {
    if (url.pathname === "/watch" && url.searchParams.getAll("v").length === 1) {
      videoId = url.searchParams.get("v");
    } else if (parts.length === 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      videoId = parts[1];
    }
  }

  if (!videoId || !VIDEO_ID.test(videoId)) {
    return { ok: false, message: "Use a link to one supported YouTube video." };
  }

  return {
    ok: true,
    lesson: { videoId, canonicalUrl: canonicalYouTubeUrl(videoId) },
  };
}
