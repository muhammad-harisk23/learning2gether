import { expect, test, type Page } from "@playwright/test";

const libraryKey = "k12learn2gether.library.v1";

async function installPlayer(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as any).YT = {
      Player: class {
        options: any;
        iframe: HTMLIFrameElement;
        videoId = "dQw4w9WgXcQ";
        state = -1;
        constructor(element: HTMLElement, options: any) {
          this.options = options;
          this.iframe = document.createElement("iframe");
          this.iframe.title = "YouTube video player";
          element.appendChild(this.iframe);
          setTimeout(() => options.events.onReady({ target: this }), 0);
        }
        emit(state: number) { this.state = state; this.options.events.onStateChange({ target: this, data: state }); }
        cueVideoById(id: string) { this.videoId = id; setTimeout(() => this.emit(5), 10); }
        cuePlaylist() { setTimeout(() => this.emit(5), 10); }
        playVideo() { setTimeout(() => this.emit(1), 10); }
        pauseVideo() { setTimeout(() => this.emit(2), 10); }
        seekTo() {}
        getCurrentTime() { return 0; }
        getPlaylist() { return []; }
        getPlaylistIndex() { return -1; }
        getVideoData() { return { video_id: this.videoId, title: `Confirmed ${this.videoId}` }; }
        getIframe() { return this.iframe; }
        destroy() { this.iframe.remove(); }
      },
    };
  });
}

test("empty library can add multiple resources, reopen one, and retain independent progress", async ({ page }) => {
  await installPlayer(page);
  await page.goto("/");
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByText(/Your library is empty/i)).toBeVisible();

  await page.getByRole("button", { name: "Add your first lesson" }).click();
  await page.getByLabel("YouTube lesson or playlist URL").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  await page.getByLabel("Name this resource").fill("Electricity basics");
  await page.getByLabel("Subject or category").fill("Physics");
  await page.getByLabel(/What do you want to understand/).fill("Understand current and voltage");
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect(page.getByText(/Checking that this YouTube lesson can load/)).toBeHidden();
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!).items[0].commitment.cumulativeRecordedFocusedMs)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => page.evaluate(() => {
    const value = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
    return value.items[0].commitment.cumulativeRecordedFocusedMs;
  })).toBeGreaterThan(0);
  const firstProgress = await page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!).items[0].commitment.cumulativeRecordedFocusedMs);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();

  await page.getByRole("link", { name: "My Learning" }).click();
  await page.getByRole("button", { name: "Add to library" }).click();
  await page.getByLabel("YouTube lesson or playlist URL").fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page.getByLabel("Name this resource").fill("Waves and sound");
  await page.getByLabel("Subject or category").fill("Science");
  await page.getByLabel(/What do you want to understand/).fill("Understand wave frequency");
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect.poll(async () => (await page.locator(".timer-box strong").innerText()).trim()).not.toBe("0:00");
  await expect.poll(async () => page.evaluate(() => JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!).items[1].commitment.cumulativeRecordedFocusedMs)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await page.getByRole("link", { name: "My Learning" }).click();

  await expect(page.locator(".library-card")).toHaveCount(2);
  await expect(page.locator(".library-card").filter({ hasText: "Electricity basics" })).toContainText("Physics");
  await expect(page.locator(".library-card").filter({ hasText: "Waves and sound" })).toContainText("Science");
  expect(await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
    return library.items.find((item: any) => item.id === "video:dQw4w9WgXcQ").commitment.cumulativeRecordedFocusedMs;
  })).toBe(firstProgress);
  expect(await page.evaluate(() => {
    const library = JSON.parse(localStorage.getItem("k12learn2gether.library.v1")!);
    return library.items.find((item: any) => item.id === "video:M7lc1UVf-VE").commitment.cumulativeRecordedFocusedMs;
  })).toBeGreaterThan(0);

  await page.locator(".library-card").filter({ hasText: "Electricity basics" }).getByRole("button", { name: "Continue" }).click();
  await expect(page.locator(".player-host iframe")).toBeVisible();
  await expect(page.locator(".study-side h2")).toHaveText("Electricity basics");
  await page.reload();
  await expect(page.getByRole("button", { name: /Continue Learning/ })).toBeVisible();
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.locator(".library-card")).toHaveCount(2);
});

test("a valid legacy commitment migrates once and keeps the original record", async ({ page }) => {
  const legacy = {
    schemaVersion: 1,
    revision: 7,
    lesson: { videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Saved title" },
    objective: "Understand the saved example",
    goalMinutes: 25,
    vesselStyle: "mug",
    lastConfirmedPositionMs: 12_000,
    cumulativeRecordedFocusedMs: 90_000,
    lessonStatus: "unfinished",
    sessionStatus: "finished",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:05:00.000Z",
  };
  const legacyRaw = JSON.stringify(legacy);
  await page.addInitScript((raw) => localStorage.setItem("k12learn2gether.commitment", raw), legacyRaw);
  await page.goto("/");
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.locator(".library-card")).toContainText("Saved title");
  const migrated = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), libraryKey);
  expect(migrated.items).toHaveLength(1);
  expect(migrated.items[0]).toMatchObject({
    id: "video:dQw4w9WgXcQ",
    subject: "Uncategorized",
    commitment: { revision: 7, vesselStyle: "mug", cumulativeRecordedFocusedMs: 90_000, lastConfirmedPositionMs: 12_000 },
  });
  expect(await page.evaluate(() => localStorage.getItem("k12learn2gether.commitment"))).toBe(legacyRaw);
  await page.reload();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).items.length, libraryKey)).toBe(1);
});

test("dashboard and workspace share truthful progress cards and preserve vessel choices", async ({ page }, testInfo) => {
  await installPlayer(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.addInitScript(() => {
    (window as any).__sharedFile = null;
    Object.defineProperty(navigator, "canShare", { configurable: true, value: ({ files }: { files?: File[] }) => !!files?.length && files[0].type === "image/png" });
    Object.defineProperty(navigator, "share", { configurable: true, value: async ({ files }: { files?: File[] }) => {
      const file = files?.[0];
      (window as any).__sharedFile = file ? { name: file.name, type: file.type, size: file.size } : null;
    } });
  });
  await page.addInitScript((key) => {
    const today = new Date();
    const localDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    localStorage.setItem(key, JSON.stringify({
      schemaVersion: 1,
      revision: 1,
      selectedItemId: "video:dQw4w9WgXcQ",
      items: [{
        id: "video:dQw4w9WgXcQ",
        title: "Electricity basics",
        subject: "Physics",
        sourceType: "video",
        lastStudiedAt: "2026-10-26T12:00:00.000Z",
        commitment: {
          schemaVersion: 1,
          revision: 7,
          lesson: { videoId: "dQw4w9WgXcQ", canonicalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Electricity basics" },
          objective: "Understand current and voltage",
          goalMinutes: 10,
          vesselStyle: "mug",
          lastConfirmedPositionMs: 72_000,
          cumulativeRecordedFocusedMs: 15 * 60_000,
          lessonStatus: "unfinished",
          sessionStatus: "finished",
          createdAt: "2026-10-26T11:00:00.000Z",
          updatedAt: "2026-10-26T12:00:00.000Z",
        },
      }],
      activity: [{ localDate, eligibleMs: 6 * 60_000 }],
    }));
  }, libraryKey);
  await page.goto("/");
  await page.getByRole("link", { name: "My Learning" }).click();

  await expect(page.locator(".streak-card")).toHaveAttribute("data-qualified", "false");
  await expect(page.locator(".streak-today")).toContainText("6 min / 10 min");
  await expect(page.locator(".streak-progress")).toHaveAttribute("max", "600000");
  await expect(page.locator(".continue-card")).toContainText("Physics");
  await expect(page.locator(".continue-card")).toContainText("Focus goal progress · 100%");
  await expect(page.locator(".continue-card")).toContainText("Saved position · 1:12");
  await expect(page.locator(".continue-card .focus-cup")).toBeVisible();
  await expect(page.locator(".continue-card .focus-cup")).toHaveClass(/caption-visible/);
  await expect(page.locator(".library-card")).toBeVisible();
  await expect(page.getByText(/revision\s+\d+/i)).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("my-learning-desktop.png"), animations: "disabled" });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: testInfo.outputPath("my-learning-tablet.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("my-learning-mobile.png"), animations: "disabled" });
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.getByRole("button", { name: /Share progress/ }).click();
  const dialog = page.getByRole("dialog", { name: "Share your progress" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("group", { name: "Share card type" }).getByRole("button", { name: "Daily focus" }).click();
  await expect(dialog.getByRole("group", { name: "Share card type" }).getByRole("button", { name: "Daily focus" })).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".share-preview img")).toHaveAttribute("alt", /6 min recorded/);
  await expect(dialog.getByRole("button", { name: "Share image" })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("share-daily-desktop.png"), animations: "disabled" });
  await dialog.getByRole("button", { name: "Learning recap" }).click();
  await expect(dialog.locator(".share-preview img")).toHaveAttribute("alt", /Learning recap/);
  await dialog.getByLabel("Include subject and resource title").check();
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.screenshot({ path: testInfo.outputPath("share-recap-tablet.png"), animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole("button", { name: "Download PNG" })).toBeInViewport();
  await expect(dialog.getByRole("button", { name: "Share image" })).toBeInViewport();
  await page.screenshot({ path: testInfo.outputPath("share-recap-mobile.png"), animations: "disabled" });
  const downloadPromise = page.waitForEvent("download");
  await dialog.getByRole("button", { name: "Download PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("k12learn2gether-focus-progress.png");
  await dialog.getByRole("button", { name: "Share image" }).click();
  await expect.poll(() => page.evaluate(() => (window as any).__sharedFile?.type)).toBe("image/png");
  expect(await page.evaluate(() => (window as any).__sharedFile?.size)).toBeGreaterThan(1000);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: /Continue Learning/ }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".save-state")).toHaveText("Saved locally");
  await expect(page.locator(".save-state")).not.toContainText(/revision/i);
  await page.locator(".study-nav").getByRole("button", { name: /Back to Home/ }).click();
  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: /Share progress/ }).click();
  const goalDialog = page.getByRole("dialog", { name: "Share your progress" });
  await expect(goalDialog.getByRole("button", { name: "Goal reached" })).toHaveAttribute("aria-pressed", "true");
  await expect(goalDialog.locator(".share-preview img")).toHaveAttribute("alt", /Focus goal reached. 15 minutes focused/);
  await expect(goalDialog.locator(".share-preview img")).toHaveAttribute("src", /data:image\/svg\+xml/);
  await page.screenshot({ path: testInfo.outputPath("share-goal-reached.png"), animations: "disabled" });
  await page.keyboard.press("Escape");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: undefined });
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
  });
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "My Learning" }).click();
  await page.getByRole("button", { name: /Share progress/ }).click();
  const fallbackDialog = page.getByRole("dialog", { name: "Share your progress" });
  await expect(fallbackDialog.getByRole("button", { name: "Share image" })).toHaveCount(0);
  await expect(fallbackDialog.getByText(/Download the PNG, then share it/)).toBeVisible();
  await expect(fallbackDialog.getByRole("button", { name: "Download PNG" })).toBeVisible();
});
