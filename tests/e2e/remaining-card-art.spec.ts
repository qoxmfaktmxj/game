import { test, expect } from "@playwright/test";
for (const [game, count] of Object.entries({
  workshop: 100,
  council: 36,
  signal: 42,
  garden: 53,
})) {
  test(`${game}: every illustration loads and gallery fits mobile`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("response", (response) => {
      if (response.url().includes("/_next/image?") && !response.ok())
        errors.push(`image response ${response.status()}`);
    });
    await page.goto(`/cards/${game}`);
    if (game === "workshop") {
      await expect(
        page.getByRole("heading", { name: "와일드 스플렌더", exact: true }),
      ).toBeVisible();
      await expect(page.locator(".card-gallery-section")).toHaveCount(4);
    }
    const images = page.locator(".other-card-gallery .game-card-art img");
    await expect(images).toHaveCount(count);
    for (const img of await images.all()) {
      await img.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          img.evaluate((element) => {
            const image = element as HTMLImageElement;
            return image.complete && image.naturalWidth > 0;
          }),
        )
        .toBe(true);
    }
    await page
      .locator(".card-gallery-section")
      .first()
      .evaluate((element) => element.scrollIntoView());
    await page.screenshot({ path: info.outputPath(`${game}-art-desktop.png`) });
    for (const width of [390, 360]) {
      await page.setViewportSize({ width, height: 844 });
      await images.first().scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await page.screenshot({
        path: info.outputPath(`${game}-art-${width}.png`),
      });
    }
    expect(errors).toEqual([]);
  });
}
