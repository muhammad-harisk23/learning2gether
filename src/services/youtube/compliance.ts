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
  httpStatus: number;
  endpoint: string;
};

export type YouTubePreflightFailureReason =
  | "missing-api-key"
  | "invalid-video-id"
  | "invalid-api-key"
  | "api-disabled"
  | "http-referrer-rejected"
  | "quota-exceeded"
  | "http-error"
  | "network-error"
  | "empty-items"
  | "missing-item"
  | "made-for-kids"
  | "missing-made-for-kids"
  | "not-embeddable"
  | "missing-embeddable"
  | "unexpected-response";

export interface YouTubePreflightDiagnostic {
  endpoint?: string;
  httpStatus?: number;
  itemReturned?: boolean;
  returnedItemId?: string;
  privacyStatus?: string;
  embeddable?: boolean;
  madeForKids?: boolean;
}

export type YouTubePreflightResult =
  | { status: "eligible"; videoIds: string[]; fetchedAt: string; diagnostics: YouTubePreflightDiagnostic[] }
  | {
      status: "blocked";
      message: string;
      reason: YouTubePreflightFailureReason;
      diagnostic?: YouTubePreflightDiagnostic;
    };

export interface YouTubeComplianceOptions {
  apiKey?: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}

class PreflightError extends Error {
  constructor(
    readonly reason: YouTubePreflightFailureReason,
    readonly diagnostic?: YouTubePreflightDiagnostic,
  ) {
    super(reason);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function redactedEndpoint(url: URL): string {
  const safeUrl = new URL(url);
  safeUrl.searchParams.delete("key");
  return safeUrl.toString();
}

function apiFailureReason(status: number, body: unknown): YouTubePreflightFailureReason {
  const error = isRecord(body) && isRecord(body.error) ? body.error : undefined;
  const details = error && Array.isArray(error.errors) ? error.errors : [];
  const reasons = details.flatMap((detail) =>
    isRecord(detail) && typeof detail.reason === "string" ? [detail.reason.toLowerCase().replace(/[^a-z]/g, "")] : [],
  );
  const message = error && typeof error.message === "string" ? error.message.toLowerCase() : "";

  if (reasons.some((reason) => ["accessnotconfigured", "servicedisabled"].includes(reason))) return "api-disabled";
  if (reasons.some((reason) => ["iprefererblocked", "apikeyhttprefererblocked"].includes(reason)) ||
      (message.includes("referer") && (message.includes("blocked") || message.includes("not allowed")))) {
    return "http-referrer-rejected";
  }
  if (reasons.some((reason) =>
    ["quotaexceeded", "dailylimitexceeded", "ratelimitexceeded", "userratelimitexceeded"].includes(reason),
  )) return "quota-exceeded";
  if (status === 401 || reasons.includes("keyinvalid")) return "invalid-api-key";
  return "http-error";
}

async function requestJson(url: URL, fetcher: typeof fetch): Promise<DataApiResponse> {
  const endpoint = redactedEndpoint(url);
  const diagnostic: YouTubePreflightDiagnostic = { endpoint };
  let response: Response;
  try {
    response = await fetcher(url, { cache: "no-store" });
  } catch {
    throw new PreflightError("network-error", diagnostic);
  }
  diagnostic.httpStatus = response.status;
  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw new PreflightError(apiFailureReason(response.status, body), diagnostic);
  }

  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new PreflightError("unexpected-response", diagnostic);
  }
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw new PreflightError("unexpected-response", diagnostic);
  }
  return {
    items: value.items,
    httpStatus: response.status,
    endpoint,
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
        throw new PreflightError("unexpected-response", { endpoint: response.endpoint, httpStatus: response.httpStatus });
      }
      videoIds.push(item.contentDetails.videoId);
      if (videoIds.length > MAX_PLAYLIST_ITEMS) {
        throw new PreflightError("unexpected-response", { endpoint: response.endpoint, httpStatus: response.httpStatus });
      }
    }

    if (response.nextPageToken === undefined) return videoIds;
    if (typeof response.nextPageToken !== "string" || response.nextPageToken.length === 0 ||
        pageTokens.has(response.nextPageToken)) {
      throw new PreflightError("unexpected-response", { endpoint: response.endpoint, httpStatus: response.httpStatus });
    }
    pageTokens.add(response.nextPageToken);
    pageToken = response.nextPageToken;
  }

  throw new PreflightError("unexpected-response");
}

function itemDiagnostic(
  response: DataApiResponse,
  itemReturned: boolean,
  item?: Record<string, unknown>,
): YouTubePreflightDiagnostic {
  const status = item && isRecord(item.status) ? item.status : undefined;
  return {
    endpoint: response.endpoint,
    httpStatus: response.httpStatus,
    itemReturned,
    ...(item && typeof item.id === "string" ? { returnedItemId: item.id } : {}),
    ...(status && typeof status.privacyStatus === "string" ? { privacyStatus: status.privacyStatus } : {}),
    ...(status && typeof status.embeddable === "boolean" ? { embeddable: status.embeddable } : {}),
    ...(status && typeof status.madeForKids === "boolean" ? { madeForKids: status.madeForKids } : {}),
  };
}

async function verifyVideos(
  videoIds: readonly string[],
  apiKey: string,
  fetcher: typeof fetch,
): Promise<YouTubePreflightDiagnostic[]> {
  if (videoIds.length === 0) throw new PreflightError("invalid-video-id");
  const diagnostics: YouTubePreflightDiagnostic[] = [];

  for (let offset = 0; offset < videoIds.length; offset += VIDEO_BATCH_SIZE) {
    const batch = videoIds.slice(offset, offset + VIDEO_BATCH_SIZE);
    const url = new URL(`${API_BASE}/videos`);
    url.search = new URLSearchParams({
      part: "id,status",
      id: batch.join(","),
      key: apiKey,
    }).toString();
    const response = await requestJson(url, fetcher);
    if (response.items.length === 0) {
      throw new PreflightError("empty-items", {
        endpoint: response.endpoint, httpStatus: response.httpStatus, itemReturned: false,
      });
    }
    const items = new Map<string, Record<string, unknown>>();
    for (const value of response.items) {
      if (!isRecord(value) || typeof value.id !== "string") {
        throw new PreflightError("unexpected-response", itemDiagnostic(response, true, isRecord(value) ? value : undefined));
      }
      if (!batch.includes(value.id) || items.has(value.id)) {
        throw new PreflightError("unexpected-response", itemDiagnostic(response, true, value));
      }
      if (value.status === undefined) {
        throw new PreflightError("missing-made-for-kids", itemDiagnostic(response, true, value));
      }
      if (!isRecord(value.status)) {
        throw new PreflightError("unexpected-response", itemDiagnostic(response, true, value));
      }
      items.set(value.id, value);
    }

    for (const id of batch) {
      const item = items.get(id);
      if (!item) {
        throw new PreflightError("missing-item", {
          endpoint: response.endpoint, httpStatus: response.httpStatus, itemReturned: false,
        });
      }
      const diagnostic = itemDiagnostic(response, true, item);
      if (!isRecord(item.status)) throw new PreflightError("unexpected-response", diagnostic);
      const status = item.status;
      if (typeof status.madeForKids !== "boolean") {
        throw new PreflightError("missing-made-for-kids", diagnostic);
      }
      if (typeof status.embeddable !== "boolean") {
        throw new PreflightError("missing-embeddable", diagnostic);
      }
      if (status.madeForKids === true) throw new PreflightError("made-for-kids", diagnostic);
      if (status.embeddable === false) throw new PreflightError("not-embeddable", diagnostic);
      if (status.madeForKids !== false || status.embeddable !== true) {
        throw new PreflightError("unexpected-response", diagnostic);
      }
      diagnostics.push(diagnostic);
    }
  }
  return diagnostics;
}

export async function preflightYouTubeResource(
  lesson: YouTubeLesson,
  options: YouTubeComplianceOptions = {},
): Promise<YouTubePreflightResult> {
  const apiKey = options.apiKey ?? import.meta.env.VITE_YOUTUBE_API_KEY;
  if (!apiKey?.trim()) {
    return { status: "blocked", message: INELIGIBLE_MESSAGE, reason: "missing-api-key" };
  }

  try {
    const fetcher = options.fetcher ?? fetch;
    const videoIds = lesson.playlistId
      ? await readPlaylistVideoIds(lesson.playlistId, apiKey.trim(), fetcher)
      : lesson.videoId && VIDEO_ID.test(lesson.videoId)
        ? [lesson.videoId]
        : [];

    if (lesson.playlistId && lesson.videoId && !videoIds.includes(lesson.videoId)) {
      throw new PreflightError("missing-item");
    }
    const diagnostics = await verifyVideos(videoIds, apiKey.trim(), fetcher);
    return {
      status: "eligible",
      videoIds,
      fetchedAt: (options.now ?? (() => new Date()))().toISOString(),
      diagnostics,
    };
  } catch (error) {
    const failure = error instanceof PreflightError ? error : new PreflightError("unexpected-response");
    return {
      status: "blocked",
      message: INELIGIBLE_MESSAGE,
      reason: failure.reason,
      ...(failure.diagnostic ? { diagnostic: failure.diagnostic } : {}),
    };
  }
}

export const YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE = INELIGIBLE_MESSAGE;
