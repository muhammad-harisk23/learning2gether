import { test as base, expect, type Page } from "@playwright/test";

async function installDataApiMock(page: Page): Promise<void> {
  await page.route("https://www.googleapis.com/youtube/v3/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/playlistItems")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          items: [
            { contentDetails: { videoId: "dQw4w9WgXcQ" } },
            { contentDetails: { videoId: "M7lc1UVf-VE" } },
          ],
        }),
      });
      return;
    }
    if (url.pathname.endsWith("/videos")) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({
          items: (url.searchParams.get("id") ?? "").split(",").filter(Boolean)
            .map((id) => ({ id, status: { madeForKids: false } })),
        }),
      });
      return;
    }
    await route.fulfill({ status: 404, headers: { "Access-Control-Allow-Origin": "*" }, body: "Not found" });
  });
}

export const test = base.extend({
  page: async ({ page }, use) => {
    await installDataApiMock(page);
    await use(page);
  },
});

export { expect, type Page };
