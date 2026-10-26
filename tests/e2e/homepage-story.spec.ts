import { expect, test } from "./fixtures";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("k12learn2gether.policy-consent.v1", "accepted"));
});

test("homepage explains the real problem and the illustrative journey", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You found a good lesson. Then the distractions started.");
  await expect(page.locator(".hero-emphasis")).toHaveText("Stop searching. Keep going.");
  await expect(page.locator(".hero-lede")).toHaveText("Save the lessons and playlists you trust in one personal library. Come back to your saved position and see eligible recorded focus time toward the goal you chose.");
  await expect(page.getByText("ILLUSTRATIVE SCENARIO · NO LIVE SEARCH OR ACTIVITY")).toBeVisible();
  await expect(page.locator(".journey-search .search-field")).toContainText("Current Electricity");
  await expect(page.locator(".journey-choices")).toContainText("Best physics teacher");
  await expect(page.locator(".journey-distractions")).toContainText("Teacher A vs B");
  await expect(page.locator(".journey-outcome")).toContainText("42 min searching.");
  await expect(page.locator(".journey-outcome")).toContainText("NOT TRACKED");
  await expect(page.locator(".journey-workspace")).toContainText("YOUR LEARNING LIBRARY");
  await expect(page.locator(".journey-workspace")).toContainText("Continue where you stopped.");
  await expect(page.locator(".journey-workspace")).toContainText("Eligible focus time");
  await expect(page.getByRole("button", { name: "Replay story" })).toBeVisible();

  for (const tool of ["YouTube", "Playlists", "Generic timers", "Blockers", "Separate notes and trackers"]) {
    await expect(page.locator(".tool-gaps")).toContainText(tool);
  }
  await expect(page.locator("#how-it-works h2")).toHaveText("Bring what you already trust. Then stop searching.");
  await expect(page.locator("#how-it-works .workflow-intro")).toHaveText("Build your learning library from the lessons and playlists you already chose. Come back to them without searching again.");
  await expect(page.locator("#how-it-works .feature-grid")).toContainText("Save what you already trust.");
  await expect(page.locator("#how-it-works .feature-grid")).toContainText("Stay with the lesson.");
  await expect(page.locator("#how-it-works .feature-grid")).toContainText("Pick up exactly where you stopped.");
  await expect(page.locator("#how-it-works .feature-grid")).toContainText("Make your effort visible.");
});

test("primary navigation reaches Home sections, My Learning, and Privacy & Data", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  await navigation.getByRole("link", { name: "The problem" }).click();
  await expect(page).toHaveURL(/#problem$/);
  await expect(page.locator("#problem")).toBeInViewport();

  await navigation.getByRole("link", { name: "How it works" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.locator("#how-it-works")).toBeInViewport();
  const steps = page.locator("#how-it-works .feature-grid article");
  await expect(steps).toHaveCount(4);
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = "auto";
    const top = document.querySelector("#how-it-works")!.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top, behavior: "instant" });
  });
  const howItWorksLayout = await page.evaluate(() => {
    const section = document.querySelector("#how-it-works")!.getBoundingClientRect();
    const cards = [...document.querySelectorAll("#how-it-works .feature-grid article")].map((element) => element.getBoundingClientRect());
    return { sectionHeight: section.height, cards: cards.map(({ top, bottom, left, right }) => ({ top, bottom, left, right })) };
  });
  expect(howItWorksLayout.sectionHeight).toBeLessThanOrEqual(900);
  expect(howItWorksLayout.cards.every((box) => box.top >= 0 && box.bottom <= 900 && box.left >= 0 && box.right <= 1440), JSON.stringify(howItWorksLayout)).toBe(true);

  await page.getByRole("link", { name: "My Learning" }).click();
  await expect(page.getByRole("heading", { name: "My Learning." })).toBeVisible();
  await expect(page.getByText(/Your library is empty/i)).toBeVisible();

  await page.getByRole("link", { name: "Privacy & Data" }).click();
  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.getByText("k12learn2gether.library.v1")).toBeVisible();
  await expect(page.getByText(/exact site origin/i)).toBeVisible();
  await expect(page.getByText(/The player sends data to YouTube\/Google/i)).toBeVisible();
  await expect(page.getByText(/no app backend, account system, analytics integration/i)).toBeVisible();
  await expect(page.getByText(/there is no in-app delete control/i)).toBeVisible();

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You found a good lesson. Then the distractions started.");
});

test("navigation adapts to desktop and narrow viewports without horizontal overflow", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator(".hero-art")).toHaveAttribute("data-story-phase", "playing");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
  await page.screenshot({ path: testInfo.outputPath("homepage-desktop.png"), animations: "allow" });
  const storyMoments = [["search-results", 3_000], ["distractions", 5_000], ["unfinished-goal", 6_700], ["focused-workspace", 9_000]] as const;
  for (const [name, time] of storyMoments) {
    await page.locator(".journey-stage.is-playing").evaluate((element, currentTime) => {
      for (const node of element.querySelectorAll("*")) {
        for (const animation of node.getAnimations()) animation.currentTime = currentTime;
      }
    }, time);
    await page.locator(".hero-art").screenshot({ path: testInfo.outputPath(`journey-${name}.png`), animations: "allow" });
  }
  await page.locator(".journey-stage.is-playing").evaluate((element) => {
    for (const node of element.querySelectorAll("*")) {
      for (const animation of node.getAnimations()) animation.currentTime = 9_000;
    }
  });
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-workspace-stage.png"), animations: "allow" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const navigation = page.getByRole("navigation", { name: "Primary navigation" });
  for (const label of ["Home", "The problem", "How it works", "My Learning", "Privacy & Data"]) {
    await expect(navigation.getByRole("link", { name: label })).toBeVisible();
  }
  await expect(page.locator(".hero").getByRole("button", { name: /Add a learning resource/ })).toBeVisible();
  const emphasizedHeadlineLines = await page.locator(".hero-emphasis em").evaluate((element) => {
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

test("hero copy stays clear of the pink panel across common screen widths", async ({ page }) => {
  for (const width of [1440, 1280, 1024, 900, 768, 761, 760, 520, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const layout = await page.evaluate(() => {
      const copy = document.querySelector(".hero-copy");
      const art = document.querySelector(".hero-art");
      const title = document.querySelector(".hero h1");
      const emphasis = document.querySelector(".hero-emphasis em");
      if (!copy || !art || !title || !emphasis) throw new Error("Hero elements are missing");
      const textRects = (element: Element) => {
        const range = document.createRange();
        range.selectNodeContents(element);
        return Array.from(range.getClientRects(), ({ right }) => right);
      };
      return {
        panelBoundary: window.innerWidth > 760 ? art.getBoundingClientRect().left : window.innerWidth,
        titleRights: textRects(title),
        emphasisRights: textRects(emphasis),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: document.documentElement.clientWidth,
      };
    });
    for (const right of [...layout.titleRights, ...layout.emphasisRights]) {
      expect(right, `hero text should not reach the pink panel at ${width}px`).toBeLessThanOrEqual(layout.panelBoundary);
    }
    expect(layout.documentWidth, `page should not overflow at ${width}px`).toBeLessThanOrEqual(layout.viewportWidth);
  }
});

test("reduced motion presents the story as a readable static sequence", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  await expect(page.locator(".journey-stage")).toHaveCSS("display", "none");
  await expect(page.locator(".journey-static")).toBeVisible();
  await expect(page.locator(".journey-static article")).toHaveCount(3);
  await expect(page.locator(".journey-static")).toContainText("Search replaces study");
  await expect(page.locator(".journey-static")).toContainText("Continue where you stopped");
  await expect(page.getByRole("button", { name: "Replay story" })).toBeHidden();
  await expect(page.getByText("ILLUSTRATIVE SCENARIO · NO LIVE SEARCH OR ACTIVITY")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1280);
  await page.locator(".hero-art").screenshot({ path: testInfo.outputPath("journey-reduced-motion.png") });
});

test("story plays once and can be replayed from the keyboard", async ({ page }) => {
  await page.goto("/");

  const art = page.locator(".hero-art");
  const replay = page.getByRole("button", { name: "Replay story" });
  await expect(art).toHaveAttribute("data-story-phase", "playing");
  await expect(page.locator(".journey-workspace")).toHaveCSS("animation-duration", "10s");
  await expect(page.locator(".journey-workspace")).toHaveCSS("animation-iteration-count", "1");

  await replay.focus();
  await page.keyboard.press("Enter");
  await expect(art).toHaveAttribute("data-story-run", "1");
  await expect(art).toHaveAttribute("data-story-phase", "playing");
  await expect(page.locator(".journey-workspace")).toHaveCSS("animation-iteration-count", "1");

  await page.locator(".journey-workspace").evaluate((element) => {
    element.dispatchEvent(new AnimationEvent("animationend", { bubbles: true, animationName: "journey-workspace" }));
  });
  await expect(art).toHaveAttribute("data-story-phase", "settled");
  await expect(page.locator(".journey-workspace")).toHaveCSS("opacity", "1");
  await expect(page.locator(".journey-search")).toHaveCSS("animation-name", "none");
});
