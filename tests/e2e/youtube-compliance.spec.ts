import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("k12learn2gether.policy-consent.v1", "accepted"));
});

test("blocks an MFK video before creating the player and shows the app-owned focus disclosure", async ({ page }) => {
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/youtube/v3/videos")) videoRequests.push(request.url());
  });
  await page.route("https://www.googleapis.com/youtube/v3/videos**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({
        items: (url.searchParams.get("id") ?? "").split(",").filter(Boolean)
          .map((id) => ({ id, status: { madeForKids: true } })),
      }),
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Add a learning resource/ }).first().click();
  await page.getByLabel("YouTube lesson or playlist URL").fill("https://www.youtube.com/watch?v=M7lc1UVf-VE");
  await page.getByLabel("Name this resource").fill("A lesson");
  await page.getByLabel("Subject or category").fill("Science");
  await page.getByLabel(/What do you want to understand/).fill("Learn a topic");
  await page.getByRole("button", { name: "Add to my library" }).click();

  await expect(page.getByRole("alert")).toContainText("playback eligibility could not be verified");
  await expect(page.locator(".player-host iframe")).toHaveCount(0);
  expect(videoRequests.length).toBeGreaterThan(0);
  expect(videoRequests.every((url) => new URL(url).searchParams.get("key") === "playwright-test-key")).toBe(true);
  await expect(page.evaluate(() => localStorage.getItem("k12learn2gether.library.v1"))).resolves.toBeNull();

  await page.getByRole("link", { name: "Privacy & Data" }).click();
  await expect(page.getByText("K12Learn2Gether recorded focus is an app-owned study-session metric. It is not a YouTube metric and does not measure YouTube engagement, verified attention, comprehension, or mastery.", { exact: true })).toBeVisible();
  await expect(page.getByText(/does not resolve that question/i)).toBeVisible();
});
