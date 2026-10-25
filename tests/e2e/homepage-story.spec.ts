import { expect, test } from "@playwright/test";

test("homepage explains the real problem and the illustrative journey", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You found a good lesson. Then the distractions started.");
  await expect(page.getByText(/helps students stay with the teacher and lesson they chose/i)).toBeVisible();
  await expect(page.getByText("ILLUSTRATIVE FLOW · NO SEARCH OR ACTIVITY IS LIVE")).toBeVisible();
  await expect(page.getByText("Class 10 Physics — Current Electricity")).toBeAttached();
  await expect(page.getByText("Another recommendation")).toBeAttached();

  for (const tool of ["YouTube", "Playlists", "Generic timers", "Blockers", "Separate notes and trackers"]) {
    await expect(page.locator(".tool-gaps")).toContainText(tool);
  }
  await expect(page.locator("#how-it-works .workflow-list")).toContainText("eligibility rules");
  await expect(page.locator("#how-it-works .workflow-list")).toContainText("Focus Cup");
});

test("primary navigation reaches Home sections, My Learning, and Privacy & Data", async ({ page }) => {
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await navigation.getByRole("link", { name: "The problem" }).click();
  await expect(page).toHaveURL(/#problem$/);
  await expect(page.locator("#problem")).toBeInViewport();

  await navigation.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.locator("#how-it-works")).toBeInViewport();

  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.getByText(/No lesson is saved in this browser yet/i)).toBeVisible();

  await page.getByRole("link", { name: "Privacy & Data" }).click();
  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.getByText("k12learn2gether.commitment")).toBeVisible();
  await expect(page.getByText(/exact site origin/i)).toBeVisible();
  await expect(page.getByText(/YouTube\/Google may receive requests/i)).toBeVisible();
  await expect(page.getByText(/no app backend, account system, analytics integration/i)).toBeVisible();
  await expect(page.getByText(/there is no in-app delete control/i)).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You found a good lesson. Then the distractions started.");
});

test("navigation adapts to desktop and narrow viewports without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: testInfo.outputPath("homepage-desktop.png"), animations: "allow" });
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-desktop.png"), animations: "allow" });
  await page.locator(".journey-stage").evaluate((element) => {
    for (const animation of element.getAnimations()) animation.currentTime = 12_000;
  });
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-workspace-stage.png"), animations: "allow" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  for (const label of ["Home", "The problem", "How it works", "My Learning", "Privacy & Data"]) {
    await expect(navigation.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(page.locator(".hero").getByRole("button", { name: /Start with one lesson/ })).toBeVisible();
  const emphasizedHeadlineLines = await page.locator(".hero h1 em").evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    return Array.from(range.getClientRects(), ({ left, right }) => ({ left, right }));
  });
  expect(emphasizedHeadlineLines.length).toBeGreaterThan(0);
  for (const line of emphasizedHeadlineLines) {
    expect(line.left).toBeGreaterThanOrEqual(0);
    expect(line.right).toBeLessThanOrEqual(390);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => document.documentElement.clientWidth)).toBe(390);
  await page.screenshot({ path: testInfo.outputPath("homepage-mobile.png"), animations: "allow" });
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-mobile.png"), animations: "allow" });
  await navigation.getByRole("link", { name: "Privacy & Data" }).click();
  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("privacy-mobile.png") });
});

test("reduced motion presents the full story as a readable static sequence", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const animatedSteps = page.locator(".journey-search, .journey-choices, .journey-distractions, .journey-workspace");
  await expect(animatedSteps).toHaveCount(4);
  for (const step of await animatedSteps.all()) {
    await expect(step).toHaveCSS("animation-name", "none");
    await expect(step).toHaveCSS("opacity", "1");
  }
  await expect(page.getByText("ILLUSTRATIVE FLOW · NO SEARCH OR ACTIVITY IS LIVE")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-reduced-motion.png") });
});
