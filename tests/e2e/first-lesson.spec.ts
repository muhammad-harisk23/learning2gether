import { expect, test } from "@playwright/test";

test("early real YouTube embed accepts a candidate and saves it before study", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("playlist");
  await page.getByRole("button", { name: /Start finishing what you learn/ }).first().click();
  await page.getByLabel("YouTube lesson URL").fill("https://youtube.com.evil.example/watch?v=M7lc1UVf-VE");
  await page.getByLabel(/What do you want to understand/).fill("Learn how the YouTube player works");
  await page.getByRole("button", { name: "Start focused study" }).click();
  await expect(page.getByText("Use a link to one supported YouTube video.")).toBeVisible();
  await expect(page.locator(".player-host iframe")).toHaveCount(0);

  await page.getByLabel("YouTube lesson URL").fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page.getByRole("button", { name: "Start focused study" }).click();

  await expect(page.locator(".player-host iframe")).toBeVisible({ timeout: 45_000 });
  await expect(page.getByText("Checking that this YouTube lesson can load…")).toBeHidden({ timeout: 45_000 });
  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem("k12learn2gether.commitment");
    return raw ? JSON.parse(raw).lesson.videoId : null;
  })).toBe("M7lc1UVf-VE");
  await expect(page.getByRole("heading", { name: "Learn how the YouTube player works" })).toBeVisible();
});
