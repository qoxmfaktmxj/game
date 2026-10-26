import { expect, test, type Page, type TestInfo } from "@playwright/test";

const handCards = (page: Page) =>
  page.locator('[aria-label="내 손패"] button[data-card-id]');
const drawButton = (page: Page, count: number) =>
  page.getByRole("button", {
    name: `덱에서 뽑기, ${count}장 남음`,
    exact: true,
  });

async function assertNoHorizontalOverflow(page: Page, screen: string) {
  const geometry = await page.evaluate(() => ({
    viewport: window.innerWidth,
    root: document.documentElement.scrollWidth,
    body: document.body.scrollWidth,
  }));
  expect(
    Math.max(geometry.root, geometry.body),
    `${screen}: ${JSON.stringify(geometry)}`,
  ).toBeLessThanOrEqual(geometry.viewport + 1);
}

async function captureScreenshot(page: Page, name: string, testInfo: TestInfo) {
  await page.evaluate(() => {
    if (
      !document.querySelector("dialog[open]") &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }
    // Keep fixed elements in their real viewport position during full-page capture.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath(name), fullPage: true });
}

async function checkMobileWidths(
  page: Page,
  screen: string,
  testInfo: TestInfo,
) {
  for (const width of [360, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    await assertNoHorizontalOverflow(page, `${screen} at ${width}px`);
    await captureScreenshot(page, `${screen}-${width}.png`, testInfo);
  }
}

test("two browsers finish a real game, recover DRAW after refresh, and rematch at the same table", async ({
  browser,
  baseURL,
}, testInfo) => {
  // A full game plus rematch/reconnect/leave flows need room on a busy dev machine.
  test.setTimeout(360_000);
  // Isolated browser storage creates two genuinely different signed-in members.
  const hostContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "no-preference",
    locale: "ko-KR",
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const guestContext = await browser.newContext({
    baseURL,
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    locale: "ko-KR",
  });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const browserErrors: string[] = [];
  host.on("pageerror", (error) => browserErrors.push(`host: ${error.message}`));
  guest.on("pageerror", (error) =>
    browserErrors.push(`guest: ${error.message}`),
  );
  try {
    await host.goto("/");
    await expect(
      host.getByRole("heading", { name: /좋은 친구들과/ }),
    ).toBeVisible();
    const pauseHomeMotion = host.getByRole("button", {
      name: "홈 카드 모션 일시 정지",
      exact: true,
    });
    const homeLoopStates = () =>
      host.locator(".club-scene").evaluate((scene) =>
        scene
          .getAnimations({ subtree: true })
          .filter(
            (animation) =>
              animation.effect?.getTiming().iterations === Infinity,
          )
          .map((animation) => animation.playState),
      );
    await expect(pauseHomeMotion).toBeEnabled();
    await expect
      .poll(async () => {
        const states = await homeLoopStates();
        return (
          states.length > 0 && states.every((state) => state === "running")
        );
      })
      .toBe(true);
    await pauseHomeMotion.click();
    const resumeHomeMotion = host.getByRole("button", {
      name: "홈 카드 모션 재생",
      exact: true,
    });
    await expect(resumeHomeMotion).toHaveAttribute("aria-pressed", "true");
    await expect
      .poll(async () => {
        const states = await homeLoopStates();
        return states.length > 0 && states.every((state) => state === "paused");
      })
      .toBe(true);
    await resumeHomeMotion.click();
    await expect(pauseHomeMotion).toHaveAttribute("aria-pressed", "false");
    await captureScreenshot(host, "home-desktop.png", testInfo);
    await host.screenshot({
      path: testInfo.outputPath("home-hero-desktop.png"),
    });
    await host.getByRole("button", { name: "우리 테이블 만들기" }).click();
    await host.getByLabel("내 이름", { exact: false }).fill("첫번째 탐험가");
    const tableTitle = `브라우저 검증 ${Date.now().toString().slice(-7)}`;
    await host.getByLabel("테이블 이름", { exact: true }).fill(tableTitle);
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "테이블 만들기", exact: true })
      .click();
    await expect(
      host.getByRole("heading", { name: new RegExp(tableTitle) }),
    ).toBeVisible();
    await expect(host.getByText("연결됨", { exact: true })).toBeVisible();
    const tableUrl = host.url();
    expect(new URL(tableUrl).searchParams.get("table")).toBeTruthy();

    // Invite issuance, copying, and joining all go through the rendered UI.
    await host
      .getByRole("button", { name: "초대 링크 만들기", exact: true })
      .click();
    const inviteField = host.getByLabel("우리 테이블 초대 링크", {
      exact: true,
    });
    await expect(inviteField).toBeVisible();
    const invitation = await inviteField.inputValue();
    expect(new URL(invitation).searchParams.get("invite")).toBeTruthy();
    await host
      .getByRole("button", { name: "링크 복사하기", exact: true })
      .click();
    await expect(host.getByRole("status")).toContainText(
      "초대 링크를 복사했어요",
    );
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .click();

    await guest.goto(invitation);
    await expect(guest.getByRole("dialog")).toBeVisible();
    await guest.getByLabel("내 이름", { exact: false }).fill("두번째 탐험가");
    await guest
      .getByRole("button", { name: "테이블에 입장하기", exact: true })
      .click();
    await expect(
      guest.getByRole("heading", { name: new RegExp(tableTitle) }),
    ).toBeVisible();
    await expect(guest.getByText("연결됨", { exact: true })).toBeVisible();
    await expect(host.locator(".occupied-seat")).toHaveCount(2);
    await expect(guest.locator(".occupied-seat")).toHaveCount(2);
    await checkMobileWidths(guest, "waiting", testInfo);
    await captureScreenshot(host, "waiting-desktop.png", testInfo);

    await expect(
      host.getByRole("button", { name: "탐험 시작", exact: true }),
    ).toBeDisabled();
    await host.getByRole("button", { name: "준비", exact: true }).click();
    await expect(
      host.getByRole("button", { name: "준비 완료 · 취소", exact: true }),
    ).toBeVisible();
    await guest
      .getByRole("button", { name: "준비", exact: true })
      .click();
    await expect(
      host.getByRole("button", { name: "탐험 시작", exact: true }),
    ).toBeEnabled();
    await host.getByRole("button", { name: "탐험 시작", exact: true }).click();
    for (const page of [host, guest]) {
      await expect(handCards(page)).toHaveCount(8);
      await expect(drawButton(page, 44)).toBeVisible();
    }
    // Every player uses the same defaults; operating-system accessibility still applies.
    expect(
      await host.evaluate(
        () => matchMedia("(prefers-reduced-motion: reduce)").matches,
      ),
    ).toBe(false);
    const transitionDurations = () =>
      handCards(host)
        .first()
        .evaluate((card) =>
          getComputedStyle(card)
            .transitionDuration.split(",")
            .map((duration) => parseFloat(duration.trim())),
        );
    expect(
      (await transitionDurations()).some((duration) => duration > 0.00001),
    ).toBe(true);
    await host.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(async () =>
        (await transitionDurations()).every((duration) => duration <= 0.00001),
      )
      .toBe(true);
    await checkMobileWidths(guest, "game", testInfo);
    await captureScreenshot(host, "game-desktop.png", testInfo);

    let playedCards = 0;
    let discardedCards = 0;
    for (let turn = 0; turn < 44; turn += 1) {
      await expect
        .poll(
          async () =>
            (await host
              .getByRole("button", { name: "버리기", exact: true })
              .isVisible()) ||
            (await guest
              .getByRole("button", { name: "버리기", exact: true })
              .isVisible()),
          { message: `turn ${turn + 1}: one player reaches PLACE` },
        )
        .toBe(true);
      const actor = (await host
        .getByRole("button", { name: "버리기", exact: true })
        .isVisible())
        ? host
        : guest;
      const opponent = actor === host ? guest : host;
      await expect(handCards(actor)).toHaveCount(8);
      await expect(handCards(actor).first()).toBeEnabled();
      await expect(handCards(opponent).first()).toBeDisabled();
      await expect(drawButton(actor, 44 - turn)).toBeDisabled();
      const selected = handCards(actor).first();
      const selectedId = await selected.getAttribute("data-card-id");
      const selectedLabel = await selected.getAttribute("aria-label");
      await selected.click();
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      const play = actor.getByRole("button", {
        name: "놓기",
        exact: true,
      });
      if (turn > 0 && turn % 3 !== 0 && (await play.isEnabled())) {
        await play.click();
        playedCards += 1;
      } else {
        await actor
          .getByRole("button", { name: "버리기", exact: true })
          .click();
        discardedCards += 1;
      }
      await expect(handCards(actor)).toHaveCount(7);
      await expect(
        actor.getByText("카드 한 장을 가져오세요", { exact: true }),
      ).toBeVisible();
      await expect(drawButton(actor, 44 - turn)).toBeEnabled();
      if (turn === 0) {
        const beforeRefresh = await handCards(actor).evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("data-card-id")),
        );
        expect(beforeRefresh).not.toContain(selectedId);
        const discardedSuit = selectedLabel?.split(" ")[0];
        expect(discardedSuit).toBeTruthy();
        await expect(
          actor.getByRole("button", {
            name: new RegExp(`^${discardedSuit} 버림 더미에서 가져오기`),
          }),
        ).toBeDisabled();
        const inspectDiscard = async () => {
          const inspect = actor.getByRole("button", {
            name: `${discardedSuit} 버림 더미, 1장, 자세히 보기`,
            exact: true,
          });
          await expect(inspect).toBeEnabled();
          await inspect.click();
          const detail = actor.getByRole("dialog", {
            name: `${discardedSuit} 버림 더미 · 1장`,
            exact: true,
          });
          await expect(detail).toBeVisible();
          await expect(
            detail.locator(".detail-cards .playing-card"),
          ).toHaveCount(1);
          await expect(
            detail.locator(".detail-cards .playing-card"),
          ).toHaveAttribute("aria-label", selectedLabel!);
          await expect(
            detail.getByRole("button", {
              name: "마지막 카드 가져오기",
              exact: true,
            }),
          ).toBeDisabled();
          expect(
            await handCards(actor).evaluateAll((buttons) =>
              buttons.map((button) => button.getAttribute("data-card-id")),
            ),
          ).toEqual(beforeRefresh);
          await detail
            .getByRole("button", { name: "닫기", exact: true })
            .click();
        };
        await inspectDiscard();
        await actor.reload();
        await expect(
          actor.getByText("카드 한 장을 가져오세요", { exact: true }),
        ).toBeVisible();
        await expect(handCards(actor)).toHaveCount(7);
        await expect(drawButton(actor, 44)).toBeEnabled();
        const recoveredHand = await handCards(actor).evaluateAll((buttons) =>
          buttons.map((button) => button.getAttribute("data-card-id")),
        );
        expect(recoveredHand).toEqual(beforeRefresh);
        await expect(
          actor.getByRole("button", {
            name: new RegExp(`^${discardedSuit} 버림 더미에서 가져오기`),
          }),
        ).toBeDisabled();
        await inspectDiscard();
        await checkMobileWidths(guest, "draw-recovery", testInfo);
      }
      await drawButton(actor, 44 - turn).click();
      if (turn < 43) {
        for (const page of [host, guest])
          await expect(drawButton(page, 43 - turn)).toBeVisible();
      }
      if (turn === 19) {
        await captureScreenshot(host, "game-in-progress-desktop.png", testInfo);
        await checkMobileWidths(guest, "game-in-progress", testInfo);
      }
    }
    expect(playedCards).toBeGreaterThan(0);
    expect(discardedCards).toBeGreaterThan(0);
    for (const page of [host, guest]) {
      await expect(
        page.getByText("덱의 마지막 카드까지, 탐험 완료", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("table", { name: "다섯 별길의 점수" }),
      ).toBeVisible();
      await expect(page.locator(".result-person")).toHaveCount(2);
      await expect(
        page.getByRole("button", { name: "재경기 준비하기", exact: true }),
      ).toBeEnabled();
      expect(page.url()).toBe(tableUrl);
    }
    await checkMobileWidths(guest, "result", testInfo);
    await captureScreenshot(host, "result-desktop.png", testInfo);

    await host
      .getByRole("button", { name: "재경기 준비하기", exact: true })
      .click();
    await guest
      .getByRole("button", { name: "재경기 준비하기", exact: true })
      .click();
    await expect(
      host.getByRole("button", { name: "새 탐험 시작", exact: true }),
    ).toBeEnabled();
    await host
      .getByRole("button", { name: "새 탐험 시작", exact: true })
      .click();
    for (const page of [host, guest]) {
      await expect(drawButton(page, 44)).toBeVisible();
      await expect(handCards(page)).toHaveCount(8);
      await expect(
        page.getByRole("heading", { name: new RegExp(tableTitle) }),
      ).toBeVisible();
      expect(page.url()).toBe(tableUrl);
    }

    // Leaving the page really closes the second socket; no API or transport mocks.
    const readHand = (page: Page) =>
      handCards(page).evaluateAll((buttons) =>
        buttons.map((button) => button.getAttribute("data-card-id")),
      );
    const hostHandBeforeDisconnect = await readHand(host);
    const guestHandBeforeDisconnect = await readHand(guest);
    await guest.goto("about:blank");
    await expect(
      host.getByText("친구가 돌아오기를 기다리고 있어요", { exact: true }),
    ).toBeVisible();
    await expect(handCards(host).first()).toBeDisabled();
    await expect(drawButton(host, 44)).toBeDisabled();
    expect(await readHand(host)).toEqual(hostHandBeforeDisconnect);

    await guest.goto(tableUrl);
    await expect(guest.getByText("연결됨", { exact: true })).toBeVisible();
    await expect(
      host.getByText("친구가 돌아오기를 기다리고 있어요", { exact: true }),
    ).toHaveCount(0);
    await expect(handCards(guest)).toHaveCount(8);
    expect(await readHand(host)).toEqual(hostHandBeforeDisconnect);
    expect(await readHand(guest)).toEqual(guestHandBeforeDisconnect);
    const resumedActor = (await host
      .getByRole("button", { name: "버리기", exact: true })
      .isVisible())
      ? host
      : guest;
    await expect(handCards(resumedActor).first()).toBeEnabled();
    await handCards(resumedActor).first().click();
    await resumedActor
      .getByRole("button", { name: "버리기", exact: true })
      .click();
    await expect(handCards(resumedActor)).toHaveCount(7);
    await expect(drawButton(resumedActor, 44)).toBeEnabled();
    await drawButton(resumedActor, 44).click();
    for (const page of [host, guest]) {
      await expect(drawButton(page, 43)).toBeVisible();
      expect(page.url()).toBe(tableUrl);
    }

    // The mobile settings offer the same explicit resignation flow as desktop.
    await guest.getByRole("button", { name: "설정", exact: true }).click();
    await guest
      .getByRole("dialog")
      .getByRole("button", { name: "이번 게임 기권하기", exact: true })
      .click();
    await guest
      .getByRole("dialog")
      .getByRole("button", { name: "기권하기", exact: true })
      .click();
    for (const page of [host, guest])
      await expect(
        page.getByText("기권으로 마친 게임", { exact: true }),
      ).toBeVisible();

    await host.getByRole("button", { name: "설정", exact: true }).click();
    await host
      .getByRole("button", { name: "테이블에서 나가기", exact: true })
      .click();
    const leaveConfirmation = host.getByRole("dialog");
    await expect(leaveConfirmation).toBeVisible();
    expect(host.url()).toBe(tableUrl);
    await leaveConfirmation
      .getByRole("button", { name: "테이블에서 나가기", exact: true })
      .click();
    await expect(
      host.getByRole("heading", { name: "다시 만나서 반가워요.", exact: true }),
    ).toBeVisible();
    await expect(host.getByRole("dialog")).toHaveCount(0);
    await expect(
      host.locator(".table-list").getByRole("heading", { name: tableTitle }),
    ).toHaveCount(0);
    await expect(guest.locator(".occupied-seat")).toHaveCount(1);
    await expect(guest.locator(".occupied-seat")).toContainText(
      "두번째 탐험가",
    );
    await expect(guest.locator(".occupied-seat")).toContainText(
      "테이블 호스트",
    );
    await expect(
      guest.getByRole("button", { name: "탐험 시작", exact: true }),
    ).toBeDisabled();
    expect(guest.url()).toBe(tableUrl);
    expect(browserErrors, "Neither browser raises a runtime exception").toEqual(
      [],
    );
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});

for (const width of [390, 360]) {
  test(`${width}px home and dialogs fit the viewport and preserve keyboard focus`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: /좋은 친구들과/ }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, `${width}px home`);
    await expect(
      page.getByRole("button", { name: "모션 감소 설정 사용 중", exact: true }),
    ).toBeDisabled();
    await expect
      .poll(() =>
        page
          .locator(".club-scene")
          .evaluate(
            (scene) =>
              scene
                .getAnimations({ subtree: true })
                .filter(
                  (animation) =>
                    animation.effect?.getTiming().iterations === Infinity &&
                    animation.playState === "running",
                ).length,
          ),
      )
      .toBe(0);
    await captureScreenshot(page, `home-${width}.png`, testInfo);

    const trigger = page.getByRole("button", { name: "우리 테이블 만들기" });
    await trigger.focus();
    await page.keyboard.press("Enter");
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    await expect(page.getByLabel("내 이름", { exact: false })).toBeFocused();
    await assertNoHorizontalOverflow(page, `${width}px create modal`);
    for (let index = 0; index < 10; index += 1) {
      await page.keyboard.press(index % 3 === 0 ? "Shift+Tab" : "Tab");
      expect(
        await modal.evaluate((dialog) =>
          dialog.contains(document.activeElement),
        ),
        "Tab focus remains inside the open modal",
      ).toBe(true);
    }
    await page.keyboard.press("Escape");
    await expect(modal).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await page
      .getByRole("button", { name: "로스트 팻츠 규칙 보기", exact: true })
      .click();
    await expect(modal).toBeVisible();
    await assertNoHorizontalOverflow(page, `${width}px rules modal`);
    await captureScreenshot(page, `rules-${width}.png`, testInfo);
    await modal
      .getByRole("button", { name: "닫기", exact: true })
      .filter({ hasText: /^닫기$/ })
      .click();
    await expect(modal).toHaveCount(0);
  });
}

test("a temporary session-check outage preserves the existing local identity and table", async ({
  page,
}) => {
  let guestIssuances = 0;
  page.on("request", (request) => {
    if (
      request.method() === "POST" &&
      new URL(request.url()).pathname === "/auth/guest"
    )
      guestIssuances += 1;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "우리 테이블 만들기" }).click();
  await page.getByLabel("내 이름", { exact: false }).fill("복구 검증 탐험가");
  const tableTitle = `세션 복구 ${Date.now().toString().slice(-7)}`;
  await page.getByLabel("테이블 이름", { exact: true }).fill(tableTitle);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "테이블 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: new RegExp(tableTitle) }),
  ).toBeVisible();
  await expect(page.getByText("연결됨", { exact: true })).toBeVisible();
  expect(guestIssuances).toBe(1);
  const tableUrl = page.url();
  const cachedIdentity = await page.evaluate(() =>
    sessionStorage.getItem("moyeotable.session"),
  );
  expect(Boolean(cachedIdentity)).toBe(true);

  let injectedOutage = 0;
  await page.route("http://localhost:2567/tables", async (route) => {
    if (route.request().method() === "GET" && injectedOutage === 0) {
      injectedOutage += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": new URL(page.url()).origin },
        body: JSON.stringify({
          error: { code: "SAVE_FAILED", message: "일시적인 저장소 오류" },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: new RegExp(tableTitle) }),
  ).toBeVisible();
  await expect(page.getByText("연결됨", { exact: true })).toBeVisible();
  await expect(page.locator(".occupied-seat")).toHaveCount(1);
  await expect(
    page.locator(".occupied-seat").getByRole("heading"),
  ).toContainText("복구 검증 탐험가");
  await expect(
    page.getByRole("button", { name: "탐험 시작", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(injectedOutage).toBe(1);
  expect(guestIssuances, "Reload must not issue a replacement identity").toBe(
    1,
  );
  expect(page.url()).toBe(tableUrl);
  const recoveredIdentity = await page.evaluate(() =>
    sessionStorage.getItem("moyeotable.session"),
  );
  expect(
    recoveredIdentity === cachedIdentity,
    "The original token and member are retained",
  ).toBe(true);
  await page.getByRole("button", { name: "준비", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "준비 완료 · 취소", exact: true }),
  ).toBeVisible();
});

test("leaving a table returns to the lobby even if refreshing the list fails", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "우리 테이블 만들기" }).click();
  await page.getByLabel("내 이름", { exact: false }).fill("퇴장 검증 탐험가");
  const tableTitle = `퇴장 복구 ${Date.now().toString().slice(-7)}`;
  await page.getByLabel("테이블 이름", { exact: true }).fill(tableTitle);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "테이블 만들기", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: new RegExp(tableTitle) }),
  ).toBeVisible();
  await expect(page.getByText("연결됨", { exact: true })).toBeVisible();

  let failedRefreshes = 0;
  await page.route("http://localhost:2567/tables", async (route) => {
    if (route.request().method() === "GET" && failedRefreshes === 0) {
      failedRefreshes += 1;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        headers: { "Access-Control-Allow-Origin": new URL(page.url()).origin },
        body: JSON.stringify({
          error: { code: "SAVE_FAILED", message: "일시적인 목록 조회 오류" },
        }),
      });
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "설정", exact: true }).click();
  await page
    .getByRole("button", { name: "테이블에서 나가기", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "테이블에서 나가기", exact: true })
    .click();
  await expect.poll(() => failedRefreshes).toBe(1);
  await expect(
    page.getByRole("heading", { name: "다시 만나서 반가워요.", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator(".loading-table")).toHaveCount(0);
  await expect(
    page.locator(".table-list").getByRole("heading", { name: tableTitle }),
  ).toHaveCount(0);
  expect(new URL(page.url()).searchParams.has("table")).toBe(false);
  await page.getByRole("button", { name: "새 테이블", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("테이블 이름", { exact: true })).toBeEditable();
});
