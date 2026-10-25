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
