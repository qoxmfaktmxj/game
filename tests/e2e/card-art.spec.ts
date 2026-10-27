import { test, expect } from "@playwright/test";

test("50 selected animal illustrations remain distinct and readable on mobile", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().includes("/_next/image?") && !response.ok())
      errors.push(`image ${response.status()}: ${response.url()}`);
  });
  await page.goto("/cards");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "한 장 더 가까이.",
  );
  const illustrations = page.locator(".card-gallery-grid img.card-art");
  await expect(illustrations).toHaveCount(50);
  const sources = await illustrations.evaluateAll((images) =>
    images.map((image) => image.getAttribute("src")),
  );
  expect(new Set(sources).size).toBe(50);
  expect(decodeURIComponent(sources[8]!)).toMatch(
    /aurora-10-v5-[a-f0-9]+\.webp/,
  );
  for (const name of ["멍이", "냥이", "물개", "수달", "랑이"]) {
    await expect(
      page.getByRole("heading", { level: 2, name, exact: true }),
    ).toBeVisible();
  }
  await expect(page.locator(".card-gallery-grid .support-card")).toHaveCount(5);
  await expect(
    page.locator(".card-gallery-grid .support-card .card-corner").first(),
  ).toHaveText("×2");
  for (const image of await illustrations.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate((element) => {
          const img = element as HTMLImageElement;
          return img.complete && img.naturalWidth > 0;
        }),
      )
      .toBe(true);
  }
  await page.locator("#aurora").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("card-gallery-desktop.png") });
  for (const width of [390, 360]) {
    await page.setViewportSize({ width, height: 844 });
    await page.locator("#ember h2").scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
      )
      .toBeLessThanOrEqual(1);
    const card = page.locator("#ember .playing-card").first();
    const rank = card.locator(".card-corner").first();
    await expect(rank).toBeVisible();
    expect(
      await rank.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize),
      ),
    ).toBeGreaterThanOrEqual(24);
    await expect
      .poll(() =>
        card
          .locator("img")
          .evaluate((element) => (element as HTMLImageElement).complete),
      )
      .toBe(true);
    await page.screenshot({
      path: info.outputPath(`card-gallery-${width}.png`),
    });
  }
  expect(errors).toEqual([]);
});
