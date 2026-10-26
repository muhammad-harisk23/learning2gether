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
  await page.getByRole("button", { name: /Add a learning resource/ }).first().click();
  await page.getByLabel("YouTube lesson or playlist URL").fill(url);
  await page.getByLabel("Name this resource").fill("Saved lesson");
  await page.getByLabel("Subject or category").fill("General");
  await page.getByLabel(/What do you want to understand/).fill("Understand the lesson and finish the example");
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect(page.getByText("Checking that this YouTube lesson can load…")).toBeHidden();
}

async function readLibrary(page: Page): Promise<any> {
  return page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!));
}

async function readActiveCommitment(page: Page): Promise<any> {
  return page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
    return library.items.find((item: any) => item.id === library.selectedItemId).commitment;
  });
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
  await expect.poll(async () => (await readActiveCommitment(page)).cumulativeRecordedFocusedMs).toBeGreaterThan(0);
  const beforeSelection = (await readActiveCommitment(page)).cumulativeRecordedFocusedMs;
  const beforeCommitment = await readActiveCommitment(page);
  await page.locator(".playlist-item").nth(1).click();
  await expect.poll(async () => (await readActiveCommitment(page)).lesson.videoId).toBe(secondVideo);
  await expect.poll(async () => (await readActiveCommitment(page)).lesson.playlistIndex).toBe(1);
  const afterCommitment = await readActiveCommitment(page);
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
  await expect.poll(async () => (await readActiveCommitment(page)).sessionStatus).toBe("active");
  await expect.poll(async () => (await readActiveCommitment(page)).cumulativeRecordedFocusedMs).toBeGreaterThan(0);
  await expect.poll(async () => Number(await page.locator(".focus-cup").getAttribute("data-recorded-ms"))).toBeGreaterThan(0);
  await expect(page.locator(".focus-cup")).toContainText("Recording focus");
  await expect.poll(async () => Number(await page.locator(".cup-liquid").getAttribute("height"))).toBeGreaterThan(0);
  const beforeHidden = await timer.innerText();
  const playCallsBefore = await page.evaluate(() => (window as any).__playCalls);
  await page.evaluate(() => {
    (window as any).__focusVisibility = "hidden";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(() => page.evaluate(() => (window as any).__pauseCalls)).toBeGreaterThan(0);
  await expect(page.locator(".focus-cup")).toContainText("Paused");
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
  const recordedBeforeGoalChange = (await readActiveCommitment(page)).cumulativeRecordedFocusedMs;
  await page.getByLabel(/Change goal/).fill("30");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect.poll(async () => (await readActiveCommitment(page)).goalMinutes).toBe(30);
  expect((await readActiveCommitment(page)).cumulativeRecordedFocusedMs).toBe(recordedBeforeGoalChange);
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
  await expect(page.locator(".hero-actions").getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.locator(".hero-actions").getByRole("button", { name: /Continue Learning/ }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCount);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.locator(".continue-card").getByRole("button", { name: /Start learning|Continue Learning/ })).toBeVisible();
  await page.locator(".library-card").getByRole("button", { name: /Start learning|Continue|Open saved resource/ }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__playCalls)).toBe(playCount);
  await expect(page.getByRole("button", { name: /Play \/ Resume/ })).toBeVisible();
});

test("shared navigation can leave the workspace for Privacy & Data without losing the commitment", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect.poll(async () => (await readActiveCommitment(page)).revision).toBeGreaterThan(0);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "Privacy & Data" }).click();

  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.getByText(/exact site origin/i)).toBeVisible();
  await expect(page.getByRole("link", { name: "My Learning" })).toBeVisible();
  expect((await readActiveCommitment(page)).lesson.videoId).toBe(firstVideo);
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.locator(".continue-card").getByRole("button", { name: /Start learning|Continue Learning/ })).toBeVisible();
  expect((await readActiveCommitment(page)).lesson.videoId).toBe(firstVideo);
});

test("Finish session remains distinct from confirmed completion", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await page.locator(".session-actions summary").click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect.poll(async () => (await readActiveCommitment(page)).sessionStatus).toBe("finished");
  await expect.poll(async () => (await readActiveCommitment(page)).lessonStatus).toBe("unfinished");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Mark lesson complete/ }).click();
  await expect.poll(async () => (await readActiveCommitment(page)).lessonStatus).toBe("completed");
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
    const value = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
    const selected = value.items.find((item: any) => item.id === value.selectedItemId);
    value.revision += 1;
    selected.commitment.revision += 1;
    selected.commitment.goalMinutes = 30;
    selected.commitment.updatedAt = new Date().toISOString();
    return JSON.stringify(value);
  });
  await otherTab.evaluate((raw) => localStorage.setItem("k12learn2gether.library.v1", raw), changed);
  await expect(page.getByRole("alert")).toContainText(/changed in another tab/i);
  const pausedValue = await timer.innerText();
  await page.waitForTimeout(1800);
  await expect(timer).toHaveText(pausedValue);
  await page.getByLabel(/Change goal/).fill("35");
  await expect(page.getByRole("button", { name: "Save goal" })).toBeDisabled();
  expect((await readActiveCommitment(otherTab)).goalMinutes).toBe(30);
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

test("a failed new candidate preserves the library, then a verified resource is added alongside it", async ({ page }) => {
  await installFakeYouTube(page);
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => (await readActiveCommitment(page)).cumulativeRecordedFocusedMs).toBeGreaterThan(0);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  const savedBeforeReplacement = await readLibrary(page);
  const replacementId = "abcdefghijk";
  await page.getByRole("button", { name: "Add to library" }).click();
  await page.getByLabel("YouTube lesson or playlist URL").fill(`https://www.youtube.com/watch?v=${replacementId}`);
  await page.getByLabel("Name this resource").fill("Another lesson");
  await page.getByLabel("Subject or category").fill("Science");
  await page.getByLabel(/What do you want to understand/).fill("Try a replacement lesson");
  await page.evaluate((id) => { (window as any).__unavailableVideoId = id; }, replacementId);
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.getByText(/unavailable or private/i)).toBeVisible();
  expect(await readLibrary(page)).toEqual(savedBeforeReplacement);

  await page.evaluate(() => { (window as any).__unavailableVideoId = null; });
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(async () => (await readActiveCommitment(page)).lesson.videoId).toBe(replacementId);
  await expect.poll(async () => (await readActiveCommitment(page)).cumulativeRecordedFocusedMs).toBe(0);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.locator(".library-card")).toHaveCount(2);
});

test("desktop workspace fits the viewport and keeps essential controls visible at both target sizes", async ({ page }, testInfo) => {
  await installFakeYouTube(page);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await beginStudy(page, `https://www.youtube.com/playlist?list=${playlistId}`);
    await expect(page.locator(".focus-cup")).toHaveClass(/caption-visible/);
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
  const saved = await readLibrary(page);
  await page.reload();
  await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toBeVisible();
  await expect(page.locator(".hero").getByRole("button", { name: "Add a learning resource" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("saved-return-home-1440x900.png") });
  await expect(page.getByRole("heading", { name: "My Learning." })).toHaveCount(0);
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  expect(await readLibrary(page)).toEqual(saved);
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
  const before = await readActiveCommitment(page);
  for (const [style, label] of [["coffee", "Coffee cup"], ["mug", "Mug"], ["bottle", "Bottle"], ["glass", "Glass"]]) {
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect.poll(async () => (await readActiveCommitment(page)).vesselStyle).toBe(style);
    await expect(page.locator(".focus-cup")).toHaveAttribute("data-celebrating", "false");
    expect(await page.evaluate(() => {
      const library = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
      const value = library.items.find((item: any) => item.id === library.selectedItemId).commitment;
      return { lesson: value.lesson, goalMinutes: value.goalMinutes, cumulativeRecordedFocusedMs: value.cumulativeRecordedFocusedMs, lastConfirmedPositionMs: value.lastConfirmedPositionMs, lessonStatus: value.lessonStatus };
    })).toEqual({ lesson: before.lesson, goalMinutes: before.goalMinutes, cumulativeRecordedFocusedMs: before.cumulativeRecordedFocusedMs, lastConfirmedPositionMs: before.lastConfirmedPositionMs, lessonStatus: before.lessonStatus });
  }
  await page.locator(".study-nav .wordmark").click();
  await page.getByRole("navigation", { name: "Primary navigation" }).getByRole("link", { name: "My Learning" }).click();
  await page.locator(".library-card").getByRole("button", { name: /Start learning|Continue|Open saved resource/ }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-vessel", "glass");
  await page.reload();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.getByRole("button", { name: /Continue Learning/ }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-vessel", "glass");
});

test("Focus Cup goal changes do not create a completion event and reduced motion removes overflow motion", async ({ page }) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await beginStudy(page, `https://www.youtube.com/watch?v=${firstVideo}`);
  await page.getByLabel("Change goal").fill("5");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.locator(".focus-cup")).toHaveAttribute("data-celebrating", "false");
  await expect(page.locator(".cup-illustration")).toHaveAttribute("aria-label", /5 min/);
  await expect(page.locator(".focus-cup")).toHaveClass(/fill-visible/);
  await expect(page.locator(".focus-cup")).toHaveClass(/caption-visible/);
  await expect(page.locator(".cup-overflow")).toHaveCSS("display", "none");
  await expect(page.locator(".cup-liquid")).toHaveCSS("transition-duration", "0s");
});

test("theme preference is keyboard accessible, persists separately, and applies across the study journey", async ({ page }, testInfo) => {
  await installFakeYouTube(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const theme = page.getByRole("group", { name: "Color theme" });
  const light = theme.getByRole("button", { name: "Light", exact: true });
  const dark = theme.getByRole("button", { name: "Dark", exact: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(light).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".hero-actions .button-ink").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(23, 24, 19)");
  expect(await page.locator(".hero-actions .button-ink").evaluate((node) => getComputedStyle(node).color)).toBe("rgb(250, 249, 245)");
  await page.screenshot({ path: testInfo.outputPath("theme-light-home-desktop.png") });

  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(dark).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#1D201D");
  expect(await page.locator(".hero-actions .button-ink").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(23, 24, 19)");
  expect(await page.locator(".hero-actions .button-ink").evaluate((node) => getComputedStyle(node).color)).toBe("rgb(243, 241, 232)");
  expect(await page.locator(".hero-art").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(75, 57, 66)");
  await page.screenshot({ path: testInfo.outputPath("theme-dark-home-desktop.png") });

  await page.getByRole("link", { name: "Privacy & Data" }).click();
  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.screenshot({ path: testInfo.outputPath("theme-dark-privacy-desktop.png") });
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.locator(".hero-actions").getByRole("button", { name: /Add a learning resource/ }).click();
  await expect(page.getByLabel("YouTube lesson or playlist URL")).toBeVisible();
  expect(await page.locator(".setup-form textarea").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(41, 45, 41)");
  await page.screenshot({ path: testInfo.outputPath("theme-dark-setup-desktop.png") });

  await page.getByLabel("YouTube lesson or playlist URL").fill(`https://www.youtube.com/watch?v=${firstVideo}`);
  await page.getByLabel("Name this resource").fill("Theme lesson");
  await page.getByLabel("Subject or category").fill("Design");
  await page.getByLabel(/What do you want to understand/).fill("Understand the lesson and finish the example");
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect(page.getByText(/Checking that this YouTube lesson can load/)).toBeHidden();
  await expect(page.locator(".focus-cup")).toBeVisible();
  await expect(page.locator(".site-header")).toBeInViewport();
  await expect(theme).toBeInViewport();
  await expect(theme.getByRole("button", { name: "Dark", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: /Play \/ Resume/ })).toBeEnabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: /Play \/ Resume/ })).toBeEnabled();
  await page.locator(".session-actions summary").click();
  await page.getByRole("button", { name: "Finish session" }).click();
  await expect.poll(async () => (await readActiveCommitment(page)).sessionStatus).toBe("finished");
  const savedCommitment = await readLibrary(page);
  await page.screenshot({ path: testInfo.outputPath("theme-dark-workspace-desktop.png") });

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("theme-dark-workspace-mobile.png") });
  await light.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("group", { name: "Color theme" }).getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await readLibrary(page)).toEqual(savedCommitment);
  await page.screenshot({ path: testInfo.outputPath("theme-light-workspace-mobile.png") });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: testInfo.outputPath("theme-light-workspace-desktop.png") });
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await expect(page.getByRole("group", { name: "Color theme" }).getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.locator(".library-card")).toBeVisible();
  const learningCommitment = await readLibrary(page);
  await dark.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(await page.locator(".library-card").evaluate((node) => getComputedStyle(node).backgroundColor)).toBe("rgb(41, 45, 41)");
  expect(await readLibrary(page)).toEqual(learningCommitment);
  await page.screenshot({ path: testInfo.outputPath("theme-dark-learning-desktop.png") });
});

test("invalid theme storage safely boots in Light mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("k12learn2gether.theme", "system-dark"));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("group", { name: "Color theme" }).getByRole("button", { name: "Light", exact: true })).toHaveAttribute("aria-pressed", "true");
});

test("theme stays usable for this visit when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() { throw new DOMException("Storage is blocked", "SecurityError"); },
    });
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("group", { name: "Color theme" }).getByRole("button", { name: "Dark", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.getByRole("status")).toContainText("Theme applies for this visit only");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
