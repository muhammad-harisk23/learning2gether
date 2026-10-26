import { describe, expect, it, vi } from "vitest";
import { parseYouTubeUrl } from "../../src/domain/youtubeUrl";
import { preflightYouTubeResource, YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE } from "../../src/services/youtube/compliance";

const videoId = "8Ul0hKaOiV4";
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

function eligibleItem(id: string) {
  return { id, status: { privacyStatus: "public", embeddable: true, madeForKids: false } };
}

describe("YouTube Made For Kids preflight", () => {
  it("preserves the exact case-sensitive ID from a youtu.be URL", () => {
    expect(lesson(`https://youtu.be/${videoId}`)).toMatchObject({
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    });
  });

  it("allows a public, embeddable video only when status.madeForKids is explicitly false", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => jsonResponse({ items: [eligibleItem(videoId)] }));
    const result = await preflightYouTubeResource(lesson(`https://youtu.be/${videoId}`), {
      apiKey: "test-key", fetcher, now,
    });
    expect(result).toEqual({
      status: "eligible",
      videoIds: [videoId],
      fetchedAt: "2026-10-26T12:00:00.000Z",
      diagnostics: [{
        endpoint: `https://www.googleapis.com/youtube/v3/videos?part=id%2Cstatus&id=${videoId}`,
        httpStatus: 200,
        itemReturned: true,
        returnedItemId: videoId,
        privacyStatus: "public",
        embeddable: true,
        madeForKids: false,
      }],
    });
    expect(fetcher).toHaveBeenCalledOnce();
    const request = new URL(String(fetcher.mock.calls[0][0]));
    expect(request.origin + request.pathname).toBe("https://www.googleapis.com/youtube/v3/videos");
    expect(request.searchParams.get("part")).toBe("id,status");
    expect(request.searchParams.get("id")).toBe(videoId);
    expect(request.searchParams.get("key")).toBe("test-key");
    expect(fetcher.mock.calls[0][1]).toEqual({ cache: "no-store" });
  });

  it("uses the same exact-ID request path as the existing accepted video fixture", async () => {
    const workingVideoId = "dQw4w9WgXcQ";
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const request = new URL(String(input));
      return jsonResponse({ items: [eligibleItem(request.searchParams.get("id") ?? "")] });
    });
    const workingResult = await preflightYouTubeResource(
      lesson(`https://www.youtube.com/watch?v=${workingVideoId}`),
      { apiKey: "test-key", fetcher, now },
    );
    const reportedResult = await preflightYouTubeResource(
      lesson(`https://youtu.be/${videoId}`),
      { apiKey: "test-key", fetcher, now },
    );

    expect(workingResult).toMatchObject({ status: "eligible", videoIds: [workingVideoId] });
    expect(reportedResult).toMatchObject({ status: "eligible", videoIds: [videoId] });
    const requests = fetcher.mock.calls.map(([input]) => new URL(String(input)));
    expect(requests.map((request) => [request.searchParams.get("part"), request.searchParams.get("id")]))
      .toEqual([["id,status", workingVideoId], ["id,status", videoId]]);
  });

  it("blocks a Made For Kids video", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [{ id: videoId, status: { embeddable: true, madeForKids: true } }] }));
    await expect(preflightYouTubeResource(lesson(`https://youtu.be/${videoId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toMatchObject({ status: "blocked", reason: "made-for-kids", message: YOUTUBE_ELIGIBILITY_BLOCKED_MESSAGE });
  });

  it("blocks an unknown Made For Kids status", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [{ id: videoId, status: { embeddable: true } }] }));
    await expect(preflightYouTubeResource(lesson(`https://youtu.be/${videoId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toMatchObject({ status: "blocked", reason: "missing-made-for-kids" });
  });

  it("blocks a non-embeddable video and a video without embeddable status", async () => {
    for (const [body, reason] of [
      [{ items: [{ id: videoId, status: { embeddable: false, madeForKids: false } }] }, "not-embeddable"],
      [{ items: [{ id: videoId, status: { madeForKids: false } }] }, "missing-embeddable"],
    ] as const) {
      const fetcher = vi.fn(async () => jsonResponse(body));
      await expect(preflightYouTubeResource(lesson(`https://youtu.be/${videoId}`), {
        apiKey: "test-key", fetcher,
      })).resolves.toMatchObject({ status: "blocked", reason });
    }
  });

  it("reports an empty API response as unknown and blocked", async () => {
    const fetcher = vi.fn(async () => jsonResponse({ items: [] }));
    await expect(preflightYouTubeResource(lesson(`https://youtu.be/${videoId}`), {
      apiKey: "test-key", fetcher,
    })).resolves.toMatchObject({
      status: "blocked",
      reason: "empty-items",
      diagnostic: { itemReturned: false, httpStatus: 200 },
    });
  });

  it("distinguishes API configuration, referrer, quota, and network failures", async () => {
    const apiFailure = (reason: string, status = 403) => vi.fn(async () => new Response(JSON.stringify({
      error: { errors: [{ reason }] },
    }), { status, headers: { "Content-Type": "application/json" } }));
    const url = lesson(`https://youtu.be/${videoId}`);
    for (const [fetcher, reason] of [
      [apiFailure("accessNotConfigured"), "api-disabled"],
      [apiFailure("ipRefererBlocked"), "http-referrer-rejected"],
      [apiFailure("quotaExceeded"), "quota-exceeded"],
    ] as const) {
      await expect(preflightYouTubeResource(url, { apiKey: "test-key", fetcher }))
        .resolves.toMatchObject({ status: "blocked", reason });
    }
    const offline = vi.fn(async () => { throw new Error("offline"); });
    await expect(preflightYouTubeResource(url, { apiKey: "test-key", fetcher: offline }))
      .resolves.toMatchObject({ status: "blocked", reason: "network-error" });
  });

  it("blocks a failed request and does not request without an API key", async () => {
    const rejected = vi.fn(async () => { throw new Error("offline"); });
    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "test-key", fetcher: rejected,
    })).resolves.toMatchObject({ status: "blocked" });

    const notCalled = vi.fn();
    await expect(preflightYouTubeResource(lesson(`https://www.youtube.com/watch?v=${videoId}`), {
      apiKey: "", fetcher: notCalled,
    })).resolves.toMatchObject({ status: "blocked", reason: "missing-api-key" });
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
      return jsonResponse({ items: url.searchParams.get("id")!.split(",").map((id) => eligibleItem(id)) });
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
      return jsonResponse({ items: [{ id: videoId, status: { embeddable: true, madeForKids } }] });
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
      return jsonResponse({ items: [eligibleItem("M7lc1UVf-VE")] });
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
      return jsonResponse({ items: url.searchParams.get("id")!.split(",").map((id) => eligibleItem(id)) });
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
