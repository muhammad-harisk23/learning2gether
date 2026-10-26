import { expect, test } from "./fixtures";

test("requires affirmative policy agreement before product access and exposes policy links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "A clear start." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toHaveCount(0);

  await page.getByRole("button", { name: "Review Privacy & Data" }).click();
  await expect(page.getByRole("heading", { name: "Privacy & Data." })).toBeVisible();
  await expect(page.getByRole("link", { name: "YouTube's Terms of Service" })).toHaveAttribute("href", "https://www.youtube.com/t/terms");
  await expect(page.getByRole("link", { name: "Google Privacy Policy" })).toHaveAttribute("href", "https://policies.google.com/privacy");

  await page.getByRole("button", { name: "Agree and continue" }).click();
  await expect(page.getByRole("heading", { name: "You found a good lesson. Then the distractions started." })).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem("k12learn2gether.policy-consent.v1"))).resolves.toBe("accepted");
});
