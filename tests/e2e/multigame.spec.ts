import {
  test,
  expect,
  type Browser,
  type Page,
  type BrowserContext,
  type TestInfo,
} from "@playwright/test";
type Players = { pages: Page[]; contexts: BrowserContext[] };
async function setup(
  browser: Browser,
  baseURL: string | undefined,
  key: string,
  count: number,
): Promise<Players> {
  const contexts: BrowserContext[] = [],
    pages: Page[] = [];
  for (let i = 0; i < count; i++) {
    const c = await browser.newContext({
      baseURL,
      viewport: { width: 1440, height: 1000 },
      reducedMotion: "reduce",
    });
    contexts.push(c);
    pages.push(await c.newPage());
  }
  const host = pages[0];
  await host.goto("/");
  await expect(host).toHaveTitle("링구링구");
  await host
    .getByRole("button", { name: "우리 테이블 만들기", exact: true })
    .click();
  await host.getByLabel("내 이름", { exact: false }).fill("호스트 친구");
  await host.getByLabel("함께할 게임", { exact: true }).selectOption(key);
  await host.getByLabel("테이블 이름", { exact: true }).fill(`새 게임 ${key}`);
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "테이블 만들기", exact: true })
    .click();
  await expect(host.getByText("연결됨", { exact: true })).toBeVisible();
  await host
    .getByRole("button", { name: "초대 링크 만들기", exact: true })
    .first()
    .click();
  const invite = await host
    .getByLabel("우리 테이블 초대 링크", { exact: true })
    .inputValue();
  await host
    .getByRole("dialog")
    .getByRole("button", { name: "닫기", exact: true })
    .click();
  for (let i = 1; i < count; i++) {
    await pages[i].goto(invite);
    await pages[i]
      .getByLabel("내 이름", { exact: false })
      .fill(`초대 친구 ${i}`);
    await pages[i]
      .getByRole("button", { name: "테이블에 입장하기", exact: true })
      .click();
    await expect(pages[i].getByText("연결됨", { exact: true })).toBeVisible();
  }
  await expect(host.locator(".occupied-seat")).toHaveCount(count);
  return { contexts, pages };
}
async function start(pages: Page[]) {
  for (const p of pages) {
    await p.getByRole("button", { name: "준비", exact: true }).click();
    await expect(
      p.getByRole("button", { name: "준비 완료 · 취소", exact: true }),
    ).toBeVisible();
  }
  await expect(
    pages[0].getByRole("button", { name: "게임 시작", exact: true }),
  ).toBeEnabled();
  await pages[0]
    .getByRole("button", { name: "게임 시작", exact: true })
    .click();
  for (const p of pages) await expect(p.locator(".multi-board")).toBeVisible();
}
async function mobile(page: Page, name: string, info: TestInfo) {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth,
        ),
      )
      .toBeLessThanOrEqual(1);
    await page.screenshot({
      path: info.outputPath(`${name}-${width}.png`),
      fullPage: true,
    });
  }
}
test("four friends use one invitation, collect light, reserve privately, reconnect and resize", async ({
  browser,
  baseURL,
}, info) => {
  const { pages, contexts } = await setup(browser, baseURL, "workshop", 4);
  const errors: string[] = [];
  pages.forEach((p) => p.on("pageerror", (e) => errors.push(e.message)));
  try {
    await start(pages);
    const host = pages[0],
      guest = pages[1];
    await host.locator(".work-market .work-card").first().click();
    await expect(
      host.getByLabel("선택한 동물의 행동", { exact: true }),
    ).toBeVisible();
    await expect(
      host.getByRole("button", { name: "동물 데려오기", exact: true }),
    ).toBeVisible();
    await host
      .getByLabel("선택한 동물의 행동", { exact: true })
      .screenshot({ path: info.outputPath("workshop-selected.png") });
    await host
      .getByRole("button", { name: "동물 선택 닫기", exact: true })
      .click();
    await host
      .locator(".multi-board")
      .getByRole("button", { name: "규칙", exact: true })
      .click();
    await expect(host.getByRole("dialog")).toContainText(
      "모든 단계의 영구 할인은 카드당 1",
    );
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .filter({ hasText: "닫기" })
      .click();
    await host.locator(".bank-tokens .token-white").click();
    await host.locator(".bank-tokens .token-blue").click();
    await host.locator(".bank-tokens .token-green").click();
    await host
      .getByRole("button", { name: "선택한 간식 가져오기", exact: true })
      .click();
    await expect(guest.locator(".multi-board-heading")).toContainText(
      "내 차례예요",
    );
    await guest.locator(".work-deck").filter({ hasText: "1단계" }).click();
    await expect(guest.locator(".reserved-works .work-card")).toHaveCount(1);
    await expect(host.locator(".reserved-works .work-card")).toHaveCount(0);
    const reserved = await guest
      .locator(".reserved-works .work-card")
      .getAttribute("aria-label");
    await guest.reload();
    await expect(guest.locator(".reserved-works .work-card")).toHaveCount(1);
    await expect(guest.locator(".reserved-works .work-card")).toHaveAttribute(
      "aria-label",
      reserved!,
    );
    await guest.screenshot({
      path: info.outputPath("workshop-desktop.png"),
      fullPage: true,
    });
    await mobile(guest, "workshop", info);
    expect(errors).toEqual([]);
  } finally {
    for (const c of contexts) await c.close();
  }
});
test("same members choose garden, ready again, edit tiles and keep the rack after reconnect", async ({
  browser,
  baseURL,
}, info) => {
  const { pages, contexts } = await setup(browser, baseURL, "workshop", 2);
  try {
    for (const page of pages)
      await expect(page).toHaveTitle("링구링구 - 와일드 스플렌더");
    await pages[0]
      .getByLabel("다음에 함께할 게임", { exact: false })
      .selectOption("star-trails");
    for (const page of pages)
      await expect(page).toHaveTitle("링구링구 - 로스트 팻츠");
    await pages[0].getByRole("button", { name: "준비", exact: true }).click();
    await pages[0]
      .getByLabel("다음에 함께할 게임", { exact: false })
      .selectOption("garden");
    for (const page of pages)
      await expect(page).toHaveTitle("링구링구 - 넘버가든");
    await expect(
      pages[0].getByRole("button", { name: "준비", exact: true }),
    ).toBeVisible();
    await expect(pages[0].locator(".occupied-seat")).toHaveCount(2);
    await start(pages);
    for (const page of pages)
      await expect(page).toHaveTitle("링구링구 - 넘버가든");
    const first = (await pages[0]
      .locator(".multi-board-heading")
      .textContent())!.includes("내 차례예요")
      ? pages[0]
      : pages[1];
    const second = first === pages[0] ? pages[1] : pages[0];
    const rack = first
      .locator(".board-section")
      .filter({ has: first.getByRole("heading", { name: /내 타일/ }) });
    await expect(rack.locator(".number-tile")).toHaveCount(14);
    await rack.locator(".number-tile").first().click();
    await expect(first.locator(".tile-selection .number-tile")).toHaveCount(1);
    await expect(
      first.getByRole("button", { name: "되돌리기", exact: true }),
    ).toBeEnabled();
    await first.getByRole("button", { name: "되돌리기", exact: true }).click();
    await expect(rack.locator(".number-tile")).toHaveCount(14);
    await expect(
      first.getByRole("button", { name: "1장 뽑고 차례 마치기", exact: true }),
    ).toBeEnabled();
    await first
      .getByRole("button", { name: "1장 뽑고 차례 마치기", exact: true })
      .click();
    await expect(second.locator(".multi-board-heading")).toContainText(
      "내 차례예요",
    );
    await first.reload();
    await expect(first.locator(".garden-board")).toBeVisible();
    await expect(first).toHaveTitle("링구링구 - 넘버가든");
    await expect(
      first
        .locator(".board-section")
        .filter({ has: first.getByRole("heading", { name: /내 타일/ }) })
        .locator(".number-tile"),
    ).toHaveCount(15);
    await first.screenshot({
      path: info.outputPath("garden-desktop.png"),
      fullPage: true,
    });
    await mobile(first, "garden", info);
    await first
      .getByRole("button", { name: "링구링구 홈", exact: true })
      .click();
    await expect(first).toHaveTitle("링구링구");
    await first.goBack();
    await expect(first.locator(".garden-board")).toBeVisible();
    await expect(first).toHaveTitle("링구링구 - 넘버가든");
  } finally {
    for (const c of contexts) await c.close();
  }
});

test("four signal players privately reveal a role, draw, discard and continue on mobile", async ({
  browser,
  baseURL,
}, info) => {
  const { pages, contexts } = await setup(browser, baseURL, "signal", 4);
  try {
    await start(pages);
    let actor: Page | undefined;
    for (const page of pages)
      if (
        (await page.locator(".multi-board-heading").textContent())!.includes(
          "내 차례예요",
        )
      )
        actor = page;
    expect(actor).toBeTruthy();
    const first = actor!;
    await first
      .getByRole("button", { name: "내 진영 보기", exact: true })
      .click();
    await expect(first.locator(".signal-secret")).toContainText("기지 대장");
    for (const page of pages.filter((p) => p !== first))
      await expect(page.locator(".signal-secret")).toHaveCount(0);
    await first
      .getByRole("button", { name: "진영 가리기", exact: true })
      .click();
    const draw = first.getByRole("button", { name: "덱에서 2장", exact: true });
    if (await draw.isVisible()) await draw.click();
    const pick = first.getByRole("heading", {
      name: "세 장 중 두 장을 골라요",
      exact: true,
    });
    if (await pick.isVisible()) {
      await first.locator(".signal-choices .signal-card").nth(0).click();
      await first.locator(".signal-choices .signal-card").nth(1).click();
      await first
        .getByRole("button", { name: "선택 확정", exact: true })
        .click();
    }
    await expect(
      first.getByRole("button", { name: "차례 마치기", exact: true }),
    ).toBeVisible();
    await first
      .getByRole("button", { name: "차례 마치기", exact: true })
      .click();
    const discard = first.getByRole("button", {
      name: "선택한 카드 버리기",
      exact: true,
    });
    if (await discard.isVisible()) {
      const instruction = await first
          .locator(".signal-hand-heading p")
          .textContent(),
        n = Number(instruction?.match(/(\d+)장을/)?.[1]);
      expect(n).toBeGreaterThan(0);
      for (let i = 0; i < n; i++)
        await first.locator(".signal-hand .signal-card").nth(i).click();
      await discard.click();
    }
    await expect(first.locator(".multi-board-heading")).not.toContainText(
      "내 차례예요",
    );
    await first.reload();
    await expect(first.locator(".signal-board")).toBeVisible();
    await first.screenshot({
      path: info.outputPath("signal-desktop.png"),
      fullPage: true,
    });
    await mobile(first, "signal", info);
  } finally {
    for (const c of contexts) await c.close();
  }
});

test("two council players draft two secret roles and take their first resource action", async ({
  browser,
  baseURL,
}, info) => {
  const { pages, contexts } = await setup(browser, baseURL, "council", 2);
  try {
    await start(pages);
    await pages[0]
      .getByRole("button", { name: "왕관 건네기", exact: true })
      .click();
    for (let step = 0; step < 4; step++) {
      const current = (await pages[0].locator(".council-role-grid").isVisible())
        ? pages[0]
        : pages[1];
      await expect(current.locator(".council-role-grid")).toBeVisible();
      await current.locator(".council-role-card").first().click();
      const exclude = current.getByLabel("제외할 역할", { exact: true });
      if (await exclude.isVisible()) {
        const value = await exclude
          .locator("option:not([disabled])")
          .first()
          .getAttribute("value");
        await exclude.selectOption(value!);
      }
      await current
        .getByRole("button", { name: "선택 확정", exact: false })
        .click();
      await expect(
        current.getByRole("button", { name: "선택 확정", exact: false }),
      ).toHaveCount(0);
    }
    let current: Page | undefined;
    for (const page of pages)
      if (
        await page
          .getByRole("button", { name: "금 2 받기", exact: true })
          .isVisible()
      )
        current = page;
    expect(current).toBeTruthy();
    await current!
      .getByRole("button", { name: "금 2 받기", exact: true })
      .click();
    await expect(
      current!.getByRole("button", { name: "차례 마치기", exact: true }),
    ).toBeVisible();
    await current!.reload();
    await expect(
      current!.getByRole("button", { name: "차례 마치기", exact: true }),
    ).toBeVisible();
    await current!.screenshot({
      path: info.outputPath("council-desktop.png"),
      fullPage: true,
    });
    await mobile(current!, "council", info);
  } finally {
    for (const c of contexts) await c.close();
  }
});
