import { expect, test, type Page } from "@playwright/test";

const firstVideo = "dQw4w9WgXcQ";
const secondVideo = "M7lc1UVf-VE";
const playlistId = "PL1234567890ABCDEF";

async function installFakeYouTube(page: Page): Promise<void> {
  await page.addInitScript(({ firstVideoId, secondVideoId }) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (window as any).__focusVisibility ?? "visible" });
    document.hasFocus = () => (window as any).__focusHasFocus ?? true;
    (window as any).__focusVisibility = "visible";
    (window as any).__focusHasFocus = true;
    (window as any).__playCalls = 0;
    (window as any).__pauseCalls = 0;
    (window as any).__unavailableVideoId = null;
    (window as any).YT = {
      Player: class {
        options: any;
        iframe: HTMLIFrameElement;
        ids = [firstVideoId, secondVideoId];
        index = 0;
        videoId = firstVideoId;
        isPlaylist = false;
        state = -1;
        constructor(element: HTMLElement, options: any) {
          this.options = options;
          this.iframe = document.createElement("iframe");
          this.iframe.title = "YouTube video player";
          element.appendChild(this.iframe);
          setTimeout(() => options.events.onReady({ target: this }), 0);
        }
        emit(state: number) { this.state = state; this.options.events.onStateChange({ target: this, data: state }); }
        cueVideoById(id: string) {
          this.isPlaylist = false;
          this.videoId = id;
          if ((window as any).__unavailableVideoId === id) {
            setTimeout(() => this.options.events.onError({ target: this, data: 100 }), 10);
            return;
          }
          setTimeout(() => this.emit(5), 10);
        }
        cuePlaylist({ index = 0 }: { index?: number }) { this.isPlaylist = true; this.index = index; this.videoId = this.ids[index] ?? this.ids[0]; setTimeout(() => this.emit(5), 10); }
        playVideo() { (window as any).__playCalls++; setTimeout(() => this.emit(1), 10); }
        playVideoAt(index: number) { this.isPlaylist = true; this.index = index; this.videoId = this.ids[index]; setTimeout(() => this.emit(5), 10); setTimeout(() => this.emit(1), 20); }
        pauseVideo() { (window as any).__pauseCalls++; setTimeout(() => this.emit(2), 10); }
        seekTo() {}
        getCurrentTime() { return 0; }
        getPlaylist() { return this.isPlaylist ? this.ids : []; }
        getPlaylistIndex() { return this.isPlaylist ? this.index : -1; }
        getVideoData() { return { video_id: this.videoId, title: this.videoId === firstVideoId ? "Real first title from the test player" : "Real second title from the test player" }; }
        getIframe() { return this.iframe; }
        destroy() { this.iframe.remove(); }
      },
    };
  }, { firstVideoId: firstVideo, secondVideoId: secondVideo });
}

async function beginStudy(page: Page, url: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("button", { name: /Start with one lesson/ }).first().click();
  await page.getByLabel("YouTube lesson or playlist URL").fill(url);
  await page.getByLabel(/What do you want to understand/).fill("Understand the lesson and finish the example");
  await page.getByRole("button", { name: "Start focused study" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect(page.getByText("Checking that this YouTube lesson can load…")).toBeHidden();
}

test("playlist panel shows real ordered entries, expands, collapses, and selection preserves activity", async ({ page }) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await beginStudy(page, `https://www.youtube.com/playlist?list=${playlistId}`);
  const toggle = page.locator(".playlist-toggle");
  await expect(toggle).toContainText("Playlist · 2 lessons");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const playerBeforeOpen = await page.locator(".player-frame").boundingBox();
  const progressBeforeOpen = await page.locator(".study-side").boundingBox();
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".playlist-item")).toHaveCount(2);
  await expect(page.locator("#playlist-panel")).toHaveCSS("position", "absolute");
  expect(await page.locator(".player-frame").boundingBox()).toEqual(playerBeforeOpen);
  expect(await page.locator(".study-side").boundingBox()).toEqual(progressBeforeOpen);
  await expect(page.locator(".playlist-item").nth(0)).toContainText("Real first title from the test player");
  await expect(page.locator(".playlist-item").nth(1)).toContainText(secondVideo);
  await expect(page.getByText(/exposes a title only for the current video/i)).toBeVisible();
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs)).toBeGreaterThan(0);
  const beforeSelection = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs);
  const beforeCommitment = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!));
  await page.locator(".playlist-item").nth(1).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lesson.videoId)).toBe(secondVideo);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lesson.playlistIndex)).toBe(1);
  const afterCommitment = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!));
  expect(afterCommitment.objective).toBe(beforeCommitment.objective);
  expect(afterCommitment.goalMinutes).toBe(beforeCommitment.goalMinutes);
  expect(afterCommitment.cumulativeRecordedFocusedMs).toBeGreaterThanOrEqual(beforeSelection);
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("#playlist-panel")).toBeHidden();
});

test("bounded focus timer starts from PLAYING, pauses on hidden tab, and does not resume automatically", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  const timer = page.locator(".timer-box strong");
  await expect.poll(async () => (await timer.innerText()).trim()).not.toBe("0:00");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).sessionStatus)).toBe("active");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs)).toBeGreaterThan(0);
  await expect.poll(async () => Number(await page.locator(".cup-liquid").getAttribute("height"))).toBeGreaterThan(0);
  const beforeHidden = await timer.innerText();
  const playCallsBefore = await page.evaluate(() => (window as any).__playCalls);
  await page.evaluate(() => {
    (window as any).__focusVisibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => (window as any).__pauseCalls)).toBeGreaterThan(0);
  const pausedValue = await timer.innerText();
  await page.waitForTimeout(1800);
  await expect(timer).toHaveText(pausedValue);
  await page.evaluate(() => {
    (window as any).__focusVisibility = "visible";
    (window as any).__focusHasFocus = true;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByText(/paused after an interruption/i)).toBeVisible();
  await expect(page.locator(".timer-box strong")).toHaveText(pausedValue);
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCallsBefore);
  const recordedBeforeGoalChange = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs);
  await page.getByLabel(/Change goal/).fill("30");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).goalMinutes)).toBe(30);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs)).toBe(recordedBeforeGoalChange);
  await page.getByRole("button", { name: /Play \/ Resume/ }).click();
  await expect.poll(async () => (await timer.innerText()).trim()).not.toBe(pausedValue.trim());
  expect(beforeHidden.trim()).not.toBe("0:00");
});

test("workspace can return Home and separately open My Learning without autoplay", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  const playCount = await page.evaluate(() => (window as any).__playCalls);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue Learning/ }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCount);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue Learning/ }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCount);
  await expect(page.getByRole("button", { name: /Play \/ Resume/ })).toBeVisible();
});

test("shared navigation can leave the workspace for Privacy & Data without losing the commitment", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).revision)).toBeGreaterThan(0);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Privacy & Data" }).click();

  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.getByText(/exact site origin/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "My Learning" })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lesson.videoId)).toBe(firstVideo);
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lesson.videoId)).toBe(firstVideo);
});

test("Finish session remains distinct from confirmed completion", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await page.locator(".session-actions summary").click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).sessionStatus)).toBe("finished");
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lessonStatus)).toBe("unfinished");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Mark lesson complete/ }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lessonStatus)).toBe("completed");
});

test("an external same-origin update stops activity and blocks stale writes", async ({ page, context }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  const timer = page.locator(".timer-box strong");
  await expect.poll(async () => (await timer.innerText()).trim()).not.toBe("0:00");
  const otherTab = await context.newPage();
  await installFakeYouTube(otherTab);
  await otherTab.goto("/");
  const changed = await page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem("k12learn2gether.commitment")!);
    value.revision += 1;
    value.goalMinutes = 30;
    value.updatedAt = new Date().toISOString();
    return JSON.stringify(value);
  });
  await otherTab.evaluate((raw) => localStorage.setItem("k12learn2gether.commitment", raw), changed);
  await expect(page.getByRole("alert")).toContainText(/changed in another tab/i);
  const pausedValue = await timer.innerText();
  await page.waitForTimeout(1800);
  await expect(timer).toHaveText(pausedValue);
  await page.getByLabel(/Change goal/).fill("35");
  await expect(page.getByRole("button", { name: "Save goal" })).toBeDisabled();
  expect(await otherTab.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).goalMinutes)).toBe(30);
  await otherTab.close();
});

test("a completed commitment cannot resume playback or accrue more activity", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator(".session-actions summary").click();
  await page.getByRole("button", { name: /Mark lesson complete/ }).click();
  const playCount = await page.evaluate(() => (window as any).__playCalls);
  const activity = await page.locator(".timer-box strong").innerText();
  await expect(page.getByRole("button", { name: /Play \/ Resume/ })).toBeDisabled();
  await expect(page.getByText(/marked complete/i)).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCount);
  await page.waitForTimeout(1500);
  await expect(page.locator(".timer-box strong")).toHaveText(activity);
});

test("failed replacement preserves confirmed progress, then a successful replacement starts empty", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs)).toBeGreaterThan(0);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  const savedBeforeReplacement = await page.evaluate(() => localStorage.getItem("k12learn2gether.commitment"));
  const replacementId = "abcdefghijk";
  await page.getByRole("button", { name: "Replace this lesson" }).click();
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("YouTube lesson or playlist URL").fill(`https://www.youtube.com/watch?v=${replacementId}`);
  await page.getByLabel(/What do you want to understand/).fill("Try a replacement lesson");
  await page.evaluate((id) => { (window as any).__unavailableVideoId = id; }, replacementId);
  await page.getByRole("button", { name: "Start focused study" }).click();
  await expect(page.getByText(/unavailable or private/i)).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("k12learn2gether.commitment"))).toBe(savedBeforeReplacement);

  await page.evaluate(() => { (window as any).__unavailableVideoId = null; });
  await page.getByRole("button", { name: "Start focused study" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).lesson.videoId)).toBe(replacementId);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).cumulativeRecordedFocusedMs)).toBe(0);
});

test("desktop workspace fits the viewport and keeps essential controls visible at both target sizes", async ({ page }, testInfo) => {
  await installFakeYouTube(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await beginStudy(page, `https://www.youtube.com/playlist?list=${playlistId}`);
    await expect(page.locator(".study-heading")).toHaveCount(0);
    await expect(page.locator(".session-actions")).not.toHaveAttribute("open", "");
    await page.locator(".session-actions summary").focus();
    await page.keyboard.press("Space");
    await expect(page.locator(".session-actions")).toHaveAttribute("open", "");
    await page.keyboard.press("Space");
    await expect(page.locator(".session-actions")).not.toHaveAttribute("open", "");
    for (const locator of [
      page.locator(".study-nav"), page.locator(".player-frame"), page.getByRole("button", { name: /Play \/ Resume/ }),
      page.locator(".playlist-toggle"), page.locator(".study-side"), page.locator(".timer-box"),
      page.locator(".focus-cup"), page.getByLabel("Change goal"), page.getByRole("button", { name: "Save goal" }),
      page.getByRole("group", { name: "Choose Focus Cup vessel" }), page.locator(".session-actions summary"),
    ]) await expect(locator).toBeInViewport();
    const frameBox = await page.locator(".player-frame").boundingBox();
    const iframeBox = await page.locator(".player-host iframe").boundingBox();
    expect(frameBox!.width / frameBox!.height).toBeCloseTo(16 / 9, 2);
    expect(iframeBox).toEqual(frameBox);
    await expect.poll(() => page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
      viewportHeight: window.innerHeight,
      viewportWidth: window.innerWidth,
    }))).toEqual({ height: viewport.height, width: viewport.width, viewportHeight: viewport.height, viewportWidth: viewport.width });
    await page.screenshot({ path: testInfo.outputPath(`study-workspace-${viewport.width}x${viewport.height}.png`) });
    const playerBox = await page.locator(".player-frame").boundingBox();
    const sideBox = await page.locator(".study-side").boundingBox();
    await page.locator(".playlist-toggle").click();
    await expect(page.locator("#playlist-panel")).toBeInViewport();
    expect(await page.locator(".player-frame").boundingBox()).toEqual(playerBox);
    expect(await page.locator(".study-side").boundingBox()).toEqual(sideBox);
    await expect.poll(() => page.evaluate(() => ({ height: document.documentElement.scrollHeight, width: document.documentElement.scrollWidth })))
      .toEqual({ height: viewport.height, width: viewport.width });
    await page.getByRole("button", { name: /Playlist/ }).click();
    await page.locator(".study-nav .wordmark").click();
    await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toBeVisible();
  }
});

test("saved-return starts on editorial Home with a distinct My Learning destination", async ({ page }, testInfo) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await page.locator(".study-nav .wordmark").click();
  const saved = await page.evaluate(() => localStorage.getItem("k12learn2gether.commitment"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toBeVisible();
  await expect(page.locator(".hero").getByRole("button", { name: "Start with one lesson" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("saved-return-home-1440x900.png") });
  await expect(page.getByRole("heading", { name: "My Learning." })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("k12learn2gether.commitment"))).toBe(saved);
});

test("mobile study workspace scrolls accessibly without clipping the return navigation", async ({ page }, testInfo) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await beginStudy(page, `https://www.youtube.com/playlist?list=${playlistId}`);
  await expect(page.locator(".study-nav")).toBeInViewport();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight)).toBe(true);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.locator(".study-side").scrollIntoViewIfNeeded();
  await expect(page.locator(".study-nav")).toBeInViewport();
  await expect(page.locator(".focus-cup")).toBeInViewport();
  await expect(page.getByLabel("Change goal")).toBeInViewport();
  const sideBox = await page.locator(".study-side").boundingBox();
  expect(sideBox!.x).toBeGreaterThanOrEqual(0);
  expect(sideBox!.x + sideBox!.width).toBeLessThanOrEqual(390);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(page.locator(".study-nav")).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("study-workspace-mobile-390x844.png"), fullPage: true });
});

test("Focus Cup vessel selection persists without changing commitment progress", async ({ page }) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-vessel", "glass");
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!));
  for (const [style, label] of [["coffee", "Coffee cup"], ["mug", "Mug"], ["bottle", "Bottle"], ["glass", "Glass"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.commitment")!).vesselStyle)).toBe(style);
    await expect(page.locator(".focus-cup")).toHaveAttribute("data-celebrating", "false");
    expect(await page.evaluate(() => {
      const value = JSON.parse(localStorage.getItem("k12learn2gether.commitment")!);
      return { lesson: value.lesson, goalMinutes: value.goalMinutes, cumulativeRecordedFocusedMs: value.cumulativeRecordedFocusedMs, lastConfirmedPositionMs: value.lastConfirmedPositionMs, lessonStatus: value.lessonStatus };
    })).toEqual({ lesson: before.lesson, goalMinutes: before.goalMinutes, cumulativeRecordedFocusedMs: before.cumulativeRecordedFocusedMs, lastConfirmedPositionMs: before.lastConfirmedPositionMs, lessonStatus: before.lessonStatus });
  }
  await page.locator(".study-nav .wordmark").click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-vessel", "glass");
  await page.reload();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-vessel", "glass");
});

test("Focus Cup goal changes do not create a completion event and reduced motion removes overflow motion", async ({ page }) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await page.getByLabel("Change goal").fill("5");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-celebrating", "false");
  await expect(page.locator(".cup-illustration")).toHaveAttribute("aria-label", /5 min/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".cup-overflow")).toHaveCSS("display", "none");
  await expect(page.locator(".cup-liquid")).toHaveCSS("transition-duration", "0s");
});
