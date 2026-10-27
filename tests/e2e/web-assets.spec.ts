import { test, expect } from "@playwright/test";

test("홈은 원본 대신 축소 이미지와 필요한 글꼴 구간만 받는다", async ({
  page,
}, info) => {
  await page.goto("/");
  const first = page.locator(".club-sample-art img").first();
  await expect(first).toBeVisible();
  const result = await page.evaluate(async () => {
    await document.fonts.ready;
    const image = document.querySelector<HTMLImageElement>(
      ".club-sample-art img",
    )!;
    const url = new URL(image.currentSrc);
    const response = await fetch(url);
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const fonts = performance
      .getEntriesByType("resource")
      .filter(
        (entry) =>
          entry.name.includes(".woff2") &&
          !entry.name.includes("/__nextjs_font/"),
      ) as PerformanceResourceTiming[];
    return {
      requestedWidth: Number(url.searchParams.get("w")),
      receivedWidth: bitmap.width,
      imageBytes: blob.size,
      fonts: fonts.map((font) => ({
        path: new URL(font.name).pathname,
        bytes: font.encodedBodySize,
      })),
    };
  });
  expect(result.receivedWidth).toBe(result.requestedWidth);
  expect(result.imageBytes).toBeLessThan(30_000);
  expect(result.fonts).toHaveLength(1);
  expect(result.fonts[0].path).toMatch(/^\/fonts\/subsets\/pretendard-0-/);
  expect(result.fonts[0].bytes).toBeLessThan(180_000);
  await info.attach("홈 자산 측정", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
});
