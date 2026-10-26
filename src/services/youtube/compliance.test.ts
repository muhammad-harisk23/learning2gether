import { describe, expect, it, vi } from "vitest";
import { parseYouTubeUrl } from "../../domain/youtubeUrl";
import { preflightYouTubeResource, YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE } from "./compliance";

const videoId = "dQw4w9WgXcQ";
const playlistId = "PL1234567890ABCDEF";
const now = () => new Date("2026-10-26T12:00:00.000Z");

function lesson(url: string) {
  const parsed = parseYouTubeUrl(url);
  if (!parsed.ok) throw new Error(parsed.message);
  return parsed.lesson;
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
}

describe("YouTube Made For Kids preflight", () => {
  it("allows a single video only when status.madeForKids is explicitly false", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ items: [{ id: videoId, status: { madeForKids: false } }] }));
    const result = await preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "test-key", fetcher, now,
    });
    expect(result).toEqual({ status: "eligible", videoIds: [videoId], fetchedAt: "2026-10-26T12:00:00.000Z" });
    expect(fetcher).toHaveBeenCalledOnce();
    expect(String(fetcher.mock.calls[0][0])).toContain("part=id%2Cstatus");
    expect(fetcher.mock.calls[0][1]).toEqual({ cache: "no-store" });
  });

  it("blocks a Made For Kids video", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [{ id: videoId, status: { madeForKids: true } }] }));
    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toEqual({ status: "blocked", message: YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE });
  });

  it("blocks a missing status or missing video response", async () => {
    for (const body of [
      { items: [{ id: videoId, status: {} }] },
      { items: [] },
      { items: [{ id: videoId, status: { madeForKids: false } }, { id: videoId, status: { madeForKids: true } }] },
    ]) {
      const fetcher = vi.fn(async () => jsonResponse(body));
      await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
        apiKey: "test-key", fetcher,
      })).resolves.toMatchObject({ status: "blocked" });
    }
  });

  it("blocks a failed request and does not request without an API key", async () => {
    const rejected = vi.fn(async () => { throw new Error("offline"); });
    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "test-key", fetcher: rejected,
    })).resolves.toMatchObject({ status: "blocked" });

    const notCalled = vi.fn();
    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "", fetcher: notCalled,
    })).resolves.toMatchObject({ status: "blocked" });
    expect(notCalled).not.toHaveBeenCalled();
  });

  it("checks every paginated playlist item before allowing the playlist", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlistItems")) {
        return url.searchParams.has("pageToken")
          ? jsonResponse({ items: [{ contentDetails: { videoId: "M7lc1UVf-VE" } }] })
          : jsonResponse({ items: [{ contentDetails: { videoId } }], nextPageToken: "next" });
      }
      return jsonResponse({ items: url.searchParams.get("id")!.split(",").map((id) => ({ id, status: { madeForKids: false } })) });
    });

    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/playlist?list=${playlistId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toMatchObject({ status: "eligible", videoIds: [videoId, "M7lc1UVf-VE"] });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(String(fetcher.mock.calls[1][0])).toContain("pageToken=next");
  });

  it("blocks a playlist containing an MFK, unknown, or unresolved item", async () => {
    const makeFetcher = (madeForKids: unknown, unresolved = false) => vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlistItems")) {
        return jsonResponse({ items: [{ contentDetails: unresolved ? {} : { videoId } }] });
      }
      return jsonResponse({ items: [{ id: videoId, status: { madeForKids } }] });
    });

    for (const fetcher of [makeFetcher(true), makeFetcher(undefined), makeFetcher(false, true)]) {
      await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/playlist?list=${playlistId}`), {
        apiKey: "test-key", fetcher,
      })).resolves.toMatchObject({ status: "blocked" });
    }
  });

  it("blocks a learner-selected video that is not in the verified playlist", async () => {
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlistItems")) {
        return jsonResponse({ items: [{ contentDetails: { videoId: "M7lc1UVf-VE" } }] });
      }
      return jsonResponse({ items: [{ id: "M7lc1UVf-VE", status: { madeForKids: false } }] });
    });
    await expect(preflightYouTubeResource(
      lesson(`https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`),
      { apiKey: "test-key", fetcher },
    )).resolves.toMatchObject({ status: "blocked" });
  });

  it("batches playlist status requests in groups of 50", async () => {
    const ids = Array.from({ length: 51 }, (_, index) => `v${String(index).padStart(10, "0")}`);
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/playlistItems")) {
        return jsonResponse({
          items: (url.searchParams.has("pageToken") ? ids.slice(50) : ids.slice(0, 50))
            .map((id) => ({ contentDetails: { videoId: id } })),
          ...(url.searchParams.has("pageToken") ? {} : { nextPageToken: "next" }),
        });
      }
      return jsonResponse({ items: url.searchParams.get("id")!.split(",").map((id) => ({ id, status: { madeForKids: false } })) });
    });

    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/playlist?list=${playlistId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toMatchObject({ status: "eligible" });
    expect(fetcher).toHaveBeenCalledTimes(4);
    const videoRequests = fetcher.mock.calls
      .map(([input]) => new URL(String(input)))
      .filter((url) => url.pathname.endsWith("/videos"));
    expect(videoRequests).toHaveLength(2);
    expect(videoRequests.map((url) => url.searchParams.get("id")!.split(",").length)).toEqual([50, 1]);
  });
});
