import { expect, test } from "@playwright/test";

test("early real YouTube embed accepts a candidate and saves it before study", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You found a good lesson. Then the distractions started.");
  await page.getByRole("button", { name: /Add a learning resource/ }).first().click();
  await page.getByLabel("YouTube lesson or playlist URL").fill("https://youtube.com.evil.example/watch?v=M7lc1UVf-VE");
  await page.getByLabel("Name this resource").fill("YouTube player basics");
  await page.getByLabel("Subject or category").fill("Technology");
  await page.getByLabel(/What do you want to understand/).fill("Learn how the YouTube player works");
  await page.getByRole("button", { name: "Add to my library" }).click();
  await expect(page.getByText("Use a link to one supported YouTube video or playlist.")).toBeVisible();
  await expect(page.locator(".player-host iframe")).toHaveCount(0);

  await page.getByLabel("YouTube lesson or playlist URL").fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page.getByRole("button", { name: "Add to my library" }).click();

  await expect(page.locator(".player-host iframe")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Checking that this YouTube lesson can load…")).toBeHidden({ timeout: 45_000 });
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("k12learn2gether.library.v1");
    if (!raw) return null;
    const library = JSON.parse(raw);
    return library.items.find((item: any) => item.id === library.selectedItemId)?.commitment.lesson.videoId ?? null;
  })).toBe("M7lc1UVf-VE");
  await expect(page.getByRole("heading", { name: "YouTube player basics" })).toBeVisible();
  const playerState = page.locator(".study-side .side-line").first().locator("strong");
  await expect(playerState).toHaveText("playing", { timeout: 45_000 });
  await page.locator(".player-host iframe").click();
  await expect(playerState).toHaveText("paused", { timeout: 15_000 });
  const iframeFocusSignals = await page.evaluate(() => ({
    visibility: document.visibilityState,
    hasFocus: document.hasFocus(),
    iframeActive: document.activeElement === document.querySelector(".player-host iframe"),
  }));
  console.log(`[real iframe focus] ${JSON.stringify(iframeFocusSignals)}`);
});
