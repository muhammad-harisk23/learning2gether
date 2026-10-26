import type { YouTubeLesson } from "../../domain/youtubeUrl";

const API_BASE = "https://www.googleapis.com/youtube/v3";
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;
const MAX_PAGE_COUNT = 100;
const MAX_PLAYLIST_ITEMS = 5000;
const VIDEO_BATCH_SIZE = 50;
const INELIGIBLE_MESSAGE = "This YouTube resource cannot be opened in Focus Mode because its playback eligibility could not be verified.";

type DataApiResponse = {
  items: unknown[];
  nextPageToken?: unknown;
};

export type YouTubePreflightResult =
  | { status: "eligible"; videoIds: string[]; fetchedAt: string }
  | { status: "blocked"; message: string };

export interface YouTubeComplianceOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function requestJson(url: URL, fetcher: typeof fetch): Promise<DataApiResponse> {
  const response = await fetcher(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube Data API returned ${response.status}.`);
  const value: unknown = await response.json();
  if (!isRecord(value) || !Array.isArray(value.items)) throw new Error("YouTube Data API response was incomplete.");
  return {
    items: value.items,
    ...(value.nextPageToken !== undefined ? { nextPageToken: value.nextPageToken } : {}),
  };
}

async function readPlaylistVideoIds(
  playlistId: string,
  apiKey: string,
  fetcher: typeof fetch,
): Promise<string[]> {
  const videoIds: string[] = [];
  const pageTokens = new Set<string>();
  let pageToken: string | undefined;

  for (let pageCount = 0; pageCount < MAX_PAGE_COUNT; pageCount += 1) {
    const url = new URL(`${API_BASE}/playlistItems`);
    url.search = new URLSearchParams({
      part: "contentDetails",
      playlistId,
      maxResults: "50",
      key: apiKey,
      ...(pageToken ? { pageToken } : {}),
    }).toString();
    const response = await requestJson(url, fetcher);
    for (const item of response.items) {
      if (!isRecord(item) || !isRecord(item.contentDetails) ||
          typeof item.contentDetails.videoId !== "string" || !VIDEO_ID.test(item.contentDetails.videoId)) {
        throw new Error("Playlist contains an unresolved video.");
      }
      videoIds.push(item.contentDetails.videoId);
      if (videoIds.length > MAX_PLAYLIST_ITEMS) throw new Error("Playlist is too large to verify.");
    }

    if (response.nextPageToken === undefined) return videoIds;
    if (typeof response.nextPageToken !== "string" || response.nextPageToken.length === 0 ||
        pageTokens.has(response.nextPageToken)) {
      throw new Error("Playlist pagination was incomplete.");
    }
    pageTokens.add(response.nextPageToken);
    pageToken = response.nextPageToken;
  }

  throw new Error("Playlist pagination exceeded the verification limit.");
}

async function verifyVideos(
  videoIds: readonly string[],
  apiKey: string,
  fetcher: typeof fetch,
): Promise<void> {
  if (videoIds.length === 0) throw new Error("No playable videos were resolved.");

  for (let offset = 0; offset < videoIds.length; offset += VIDEO_BATCH_SIZE) {
    const batch = videoIds.slice(offset, offset + VIDEO_BATCH_SIZE);
    const url = new URL(`${API_BASE}/videos`);
    url.search = new URLSearchParams({
      part: "id,status",
      id: batch.join(","),
      key: apiKey,
    }).toString();
    const response = await requestJson(url, fetcher);
    const statuses = new Map<string, boolean>();
    for (const item of response.items) {
      if (!isRecord(item) || typeof item.id !== "string" || !isRecord(item.status) ||
          typeof item.status.madeForKids !== "boolean") {
        throw new Error("A video eligibility status was missing.");
      }
      if (!batch.includes(item.id) || statuses.has(item.id)) {
        throw new Error("A video eligibility response was ambiguous.");
      }
      statuses.set(item.id, item.status.madeForKids);
    }
    if (batch.some((id) => statuses.get(id) !== false)) {
      throw new Error("A video is ineligible or its status could not be verified.");
    }
  }
}

export async function preflightYouTubeResource(
  lesson: YouTubeLesson,
  options: YouTubeComplianceOptions = {},
): Promise<YouTubePreflightResult> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey?.trim()) return { status: "blocked", message: INELIGIBLE_MESSAGE };

  try {
    const fetcher = options.fetcher ?? fetch;
    const videoIds = lesson.playlistId
      ? await readPlaylistVideoIds(lesson.playlistId, apiKey.trim(), fetcher)
      : lesson.videoId && VIDEO_ID.test(lesson.videoId)
        ? [lesson.videoId]
        : [];

    if (lesson.playlistId && lesson.videoId && !videoIds.includes(lesson.videoId)) {
      throw new Error("The selected video is not in the supplied playlist.");
    }
    await verifyVideos(videoIds, apiKey.trim(), fetcher);
    return { status: "eligible", videoIds, fetchedAt: (options.now ?? (() => new Date()))().toISOString() };
  } catch {
    return { status: "blocked", message: INELIGIBLE_MESSAGE };
  }
}

export const YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE = INELIGIBLE_MESSAGE;
