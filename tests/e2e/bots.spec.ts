import { test, expect, type Page } from "@playwright/test";
async function create(page: Page, key: string) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "우리 테이블 만들기", exact: true })
    .click();
  await page.getByLabel("내 이름", { exact: false }).fill("봇과 연습");
  await page.getByLabel("함께할 게임", { exact: true }).selectOption(key);
  await page
    .getByLabel("테이블 이름", { exact: true })
    .fill(`혼자 연습 ${key}`);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "테이블 만들기", exact: true })
    .click();
  await expect(page.getByText("연결됨", { exact: true })).toBeVisible();
}
test("one person adds and removes a bot, plays a visible turn, then reconnects", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await create(page, "star-trails");
  await page
    .getByRole("button", { name: /연습 봇 추가/ })
    .first()
    .click();
  await expect(page.locator(".occupied-seat")).toHaveCount(2);
  await expect(
    page.getByText("연습 봇 · 중간 난이도", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /내보내기/ }).click();
  await expect(page.locator(".occupied-seat")).toHaveCount(1);
  await page
    .getByRole("button", { name: /연습 봇 추가/ })
    .first()
    .click();
  await expect(page.locator(".occupied-seat")).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: info.outputPath("bot-lobby-390.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "준비됐어요", exact: true }).click();
  await page.getByRole("button", { name: "탐험 시작", exact: true }).click();
  const discard = page.getByRole("button", { name: "버리기", exact: true });
  await expect(discard).toBeVisible();
  await page.locator(".hand .playing-card").first().click();
  await discard.click();
  await page.getByRole("button", { name: "덱에서 뽑기", exact: true }).click();
  await expect(discard).toBeVisible({ timeout: 12000 });
  await page.reload();
  await expect(page.locator(".hand .playing-card")).toHaveCount(8);
  await expect(page.locator(".game-aside-title h2")).toHaveText("별길 탐험");
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
    )
    .toBeLessThanOrEqual(1);
  await page.screenshot({
    path: info.outputPath("organic-suits-bot-game-390.png"),
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("one human and three workshop bots complete a full round", async ({
  page,
}, info) => {
  await create(page, "workshop");
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: /연습 봇 추가/ })
      .first()
      .click();
    await expect(page.locator(".occupied-seat")).toHaveCount(i + 2);
  }
  await page.getByRole("button", { name: "준비됐어요", exact: true }).click();
  await page.getByRole("button", { name: "게임 시작", exact: true }).click();
  for (const color of ["white", "blue", "green"])
    await page.locator(`.bank-tokens .token-${color}`).click();
  await page
    .getByRole("button", { name: "선택한 빛 가져오기", exact: true })
    .click();
  await expect(page.locator(".multi-board-heading")).toContainText(
    "생각하고 있어요",
  );
  await expect(page.locator(".multi-board-heading")).toContainText(
    "내 차례예요",
    { timeout: 20000 },
  );
  await page.reload();
  await expect(page.locator(".multi-board-heading")).toContainText(
    "내 차례예요",
  );
  await page.screenshot({
    path: info.outputPath("workshop-three-bots.png"),
    fullPage: true,
  });
});
