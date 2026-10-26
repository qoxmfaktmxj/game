import { expect, test, type Locator, type Page } from "@playwright/test";

const hand = (page: Page) =>
  page.locator('[aria-label="내 손패"] button[data-card-id]');

type ViewDeliveryGate = {
  holding: boolean;
  acknowledgements: number;
  queued: Array<() => void>;
};

async function holdServerViews(page: Page) {
  await page.addInitScript(() => {
    const gate: ViewDeliveryGate = {
      holding: false,
      acknowledgements: 0,
      queued: [],
    };
    Object.assign(window, { __starViewDelivery: gate });
    const NativeWebSocket = window.WebSocket;
    // Keep the native connection and real server data. This listener is registered
    // before the SDK's listener and can postpone only an authorised View event.
    window.WebSocket = class extends NativeWebSocket {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        this.addEventListener("message", (event: MessageEvent) => {
          if (!gate.holding || !(event.data instanceof ArrayBuffer)) return;
          const bytes = new Uint8Array(event.data);
          // Colyseus ROOM_DATA (13), then the fixed-length message-type string.
          if (bytes[0] !== 13) return;
          const type = String.fromCharCode(
            ...bytes.slice(2, 2 + (bytes[1]! & 0x1f)),
          );
          if (type === "view") {
            event.stopImmediatePropagation();
            gate.queued.push(() =>
              this.dispatchEvent(
                new MessageEvent("message", {
                  data: event.data,
                  origin: event.origin,
                }),
              ),
            );
          } else if (type === "ack") {
            gate.acknowledgements += 1;
          }
        });
      }
    };
  });
  return {
    hold: () =>
      page.evaluate(() => {
        (
          window as unknown as { __starViewDelivery: ViewDeliveryGate }
        ).__starViewDelivery.holding = true;
      }),
    state: () =>
      page.evaluate(() => {
        const gate = (
          window as unknown as { __starViewDelivery: ViewDeliveryGate }
        ).__starViewDelivery;
        return {
          acknowledgements: gate.acknowledgements,
          queued: gate.queued.length,
        };
      }),
    release: () =>
      page.evaluate(() => {
        const gate = (
          window as unknown as { __starViewDelivery: ViewDeliveryGate }
        ).__starViewDelivery;
        gate.holding = false;
        gate.queued.splice(0).forEach((deliver) => deliver());
      }),
  };
}
async function dragCard(
  page: Page,
  card: Locator,
  target: Locator,
  finish = true,
) {
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  await page.mouse.move(from!.x + from!.width / 2, from!.y + from!.height / 2);
  await page.mouse.down();
  await page.mouse.move(from!.x + from!.width / 2, from!.y - 14, { steps: 3 });
  await expect(page.locator(".star-drag-preview")).toBeVisible();
  await page.mouse.move(to!.x + to!.width / 2, to!.y + to!.height / 2, {
    steps: 8,
  });
  if (finish) await page.mouse.up();
}

async function touchDragCard(page: Page, card: Locator, target: Locator) {
  const handle = card.locator("..").locator(".card-drag-handle");
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const to = await target.boundingBox();
  expect(from).not.toBeNull();
  expect(to).not.toBeNull();
  const start = { x: from!.x + from!.width / 2, y: from!.y + from!.height / 2 };
  const end = { x: to!.x + to!.width / 2, y: to!.y + to!.height / 2 };
  const session = await page.context().newCDPSession(page);
  let ended = false;
  try {
    // Native touch input exercises implicit capture on the handle and its
    // transfer to the holder; dispatching a synthetic PointerEvent would not.
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: start.x, y: start.y - 20, id: 1 }],
    });
    await expect(page.locator(".star-drag-preview")).toBeVisible();
    for (let step = 1; step <= 4; step += 1) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * step) / 4,
            y: start.y - 20 + ((end.y - start.y + 20) * step) / 4,
            id: 1,
          },
        ],
      });
    }
    await expect(page.locator(".star-drag-preview")).toBeVisible();
    await session.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    ended = true;
  } finally {
    if (!ended) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchCancel",
        touchPoints: [],
      });
    }
    await session.detach();
  }
}

test("animal cards select without playing; illegal and cancelled drags return; legal drops and buttons commit", async ({
  browser,
  baseURL,
}, testInfo) => {
  const hostContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1200 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const guestContext = await browser.newContext({
    baseURL,
    viewport: { width: 1440, height: 1200 },
    hasTouch: true,
    reducedMotion: "reduce",
  });
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();
  const hostGate = await holdServerViews(host);
  const guestGate = await holdServerViews(guest);
  const errors: string[] = [];
  host.on("pageerror", (error) => errors.push(error.message));
  guest.on("pageerror", (error) => errors.push(error.message));
  try {
    await host.goto("/");
    await host
      .getByRole("button", { name: "우리 테이블 만들기", exact: true })
      .click();
    await host.getByLabel("내 이름", { exact: false }).fill("카드 배치 확인");
    await host
      .getByLabel("테이블 이름", { exact: true })
      .fill(`동물 카드 ${Date.now()}`);
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "테이블 만들기", exact: true })
      .click();
    await host
      .getByRole("button", { name: "초대 링크 만들기", exact: true })
      .click();
    const invitation = await host
      .getByLabel("우리 테이블 초대 링크", { exact: true })
      .inputValue();
    await host
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .click();
    await guest.goto(invitation);
    await guest.getByLabel("내 이름", { exact: false }).fill("카드 친구");
    await guest
      .getByRole("button", { name: "테이블에 입장하기", exact: true })
      .click();
    await expect(host.locator(".occupied-seat")).toHaveCount(2);
    await host.getByRole("button", { name: "준비", exact: true }).click();
    await guest
      .getByRole("button", { name: "준비", exact: true })
      .click();
    await host.getByRole("button", { name: "탐험 시작", exact: true }).click();
    await expect(hand(host)).toHaveCount(8);
    await expect(hand(guest)).toHaveCount(8);
    const actor = (await host
      .getByRole("button", { name: "버리기", exact: true })
      .isVisible())
      ? host
      : guest;
    const opponent = actor === host ? guest : host;
    const card = hand(actor).first();
    const cardId = await card.getAttribute("data-card-id");
    const suit = await card.evaluate((node) =>
      ["aurora", "ember", "tide", "moss", "dusk"].find((name) =>
        node.classList.contains(name),
      )!,
    );
    const ownLane = actor.locator(
      `[data-star-drop="play"][data-suit="${suit}"]`,
    );
    const wrongLane = actor
      .locator(`[data-star-drop="play"]:not([data-suit="${suit}"])`)
      .first();

    await card.click();
    await expect(card).toHaveAttribute("aria-pressed", "true");
    await expect(hand(actor)).toHaveCount(8);
    await ownLane.click();
    await expect(actor.getByRole("dialog")).toBeVisible();
    await expect(hand(actor)).toHaveCount(8);
    await actor
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .click();

    await dragCard(actor, card, wrongLane);
    // A new pointer press immediately after the drop must work, even while the
    // drag's generated click is still suppressed. Do not wait before clicking.
    await ownLane.click();
    await expect(actor.getByRole("dialog")).toBeVisible();
    await actor
      .getByRole("dialog")
      .getByRole("button", { name: "닫기", exact: true })
      .click();
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);
    await expect(hand(actor)).toHaveCount(8);
    await expect(actor.locator(".star-drag-status")).toContainText(
      "이동을 취소",
    );
    await expect(ownLane.locator(".playing-card")).toHaveCount(0);

    await dragCard(actor, card, actor.locator(`.theirs .lane.${suit}`));
    await expect(hand(actor)).toHaveCount(8);
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);

    await dragCard(actor, card, ownLane, false);
    await actor.mouse.move(1, 1);
    await actor.mouse.up();
    await expect(hand(actor)).toHaveCount(8);
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);

    await dragCard(actor, card, ownLane, false);
    await actor.keyboard.press("Escape");
    await actor.mouse.up();
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);
    await expect(hand(actor)).toHaveCount(8);

    // Pointer cancellation is the browser's path when a touch scroll or OS gesture wins.
    await dragCard(actor, card, ownLane, false);
    await actor.evaluate(() =>
      window.dispatchEvent(new PointerEvent("pointercancel", { pointerId: 1 })),
    );
    await actor.mouse.up();
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);
    await expect(hand(actor)).toHaveCount(8);

    await dragCard(actor, card, ownLane, false);
    await actor
      .locator(".hand-card-holder")
      .first()
      .evaluate((element) => element.releasePointerCapture(1));
    await actor.mouse.up();
    await expect(actor.locator(".star-drag-preview")).toHaveCount(0);
    await expect(hand(actor)).toHaveCount(8);

    const gate = actor === host ? hostGate : guestGate;
    await gate.hold();
    await dragCard(actor, card, ownLane);
    await expect
      .poll(async () => (await gate.state()).acknowledgements)
      .toBe(1);
    await expect(
      actor.getByRole("button", { name: "놓기", exact: true }),
    ).toBeEnabled();
    await expect(hand(actor)).toHaveCount(8);
    await expect(ownLane.locator(".playing-card")).toHaveCount(0);
    await expect
      .poll(async () => (await gate.state()).queued)
      .toBeGreaterThan(0);
    await gate.release();
    await expect(hand(actor)).toHaveCount(7);
    await expect(actor.locator(".star-drag-status")).toContainText(
      "카드 이동을 반영했어요",
    );
    await expect(
      actor.locator(`[aria-label="내 손패"] [data-card-id="${cardId}"]`),
    ).toHaveCount(0);
    await expect(ownLane.locator(".playing-card img")).toBeVisible();
    await expect(
      actor.getByRole("button", {
        name: "덱에서 뽑기, 44장 남음",
        exact: true,
      }),
    ).toBeEnabled();
    // A drop's following click must not open details or submit a second command.
    await expect(actor.getByRole("dialog")).toHaveCount(0);
    await actor
      .getByRole("button", { name: "덱에서 뽑기, 44장 남음", exact: true })
      .focus();
    await actor.keyboard.press("Enter");
    await expect(hand(actor)).toHaveCount(8);

    // Keyboard selection plus the explicit action remains a complete alternative.
    await expect(
      opponent.getByRole("button", { name: "버리기", exact: true }),
    ).toBeVisible();
    const nextCard = hand(opponent).first();
    await nextCard.focus();
    await opponent.keyboard.press("Enter");
    await expect(nextCard).toHaveAttribute("aria-pressed", "true");
    await opponent.getByRole("button", { name: "버리기", exact: true }).focus();
    await opponent.keyboard.press("Enter");
    await expect(hand(opponent)).toHaveCount(7);
    await opponent
      .getByRole("button", { name: "덱에서 뽑기, 43장 남음", exact: true })
      .click();
    await expect(hand(opponent)).toHaveCount(8);

    const discardCard = hand(actor).first();
    const discardSuit = await discardCard.evaluate((node) =>
      ["aurora", "ember", "tide", "moss", "dusk"].find((name) =>
        node.classList.contains(name),
      )!,
    );
    const discardPile = actor.locator(
      `[data-star-drop="discard"][data-suit="${discardSuit}"]`,
    );
    const priorDiscardLabels = await discardPile
      .locator(".animal-stack-card .playing-card")
      .evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("aria-label")),
      );
    const discardedLabel = await discardCard.getAttribute("aria-label");
    await touchDragCard(actor, discardCard, discardPile);
    await expect(hand(actor)).toHaveCount(7);
    await expect(discardPile.locator(".stack-front img")).toBeVisible();
    const expectedDiscardLabels = [...priorDiscardLabels, discardedLabel];
    const beforeInspection = await hand(actor).evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-card-id")),
    );
    await expect(discardPile.locator(".discard-take")).toBeDisabled();
    await discardPile.locator("button.discard").click();
    const discardDetail = actor.getByRole("dialog");
    await expect(
      discardDetail.locator(".detail-cards .playing-card"),
    ).toHaveCount(expectedDiscardLabels.length);
    expect(
      await discardDetail
        .locator(".detail-cards .playing-card")
        .evaluateAll((cards) =>
          cards.map((card) => card.getAttribute("aria-label")),
        ),
    ).toEqual(expectedDiscardLabels);
    await expect(
      discardDetail.getByRole("button", {
        name: "마지막 카드 가져오기",
        exact: true,
      }),
    ).toBeDisabled();
    expect(
      await hand(actor).evaluateAll((cards) =>
        cards.map((card) => card.getAttribute("data-card-id")),
      ),
    ).toEqual(beforeInspection);
    await discardDetail
      .getByRole("button", { name: "닫기", exact: true })
      .click();
    await actor.screenshot({
      path: testInfo.outputPath("animal-board-desktop.png"),
      fullPage: true,
    });

    for (const width of [390, 360]) {
      await actor.setViewportSize({ width, height: 844 });
      await expect
        .poll(() =>
          actor.evaluate(
            () =>
              Math.max(
                document.documentElement.scrollWidth,
                document.body.scrollWidth,
              ) - innerWidth,
          ),
        )
        .toBeLessThanOrEqual(1);
      await actor.screenshot({
        path: testInfo.outputPath(`animal-board-${width}.png`),
        fullPage: true,
      });
    }
    expect(errors).toEqual([]);
  } finally {
    await hostContext.close();
    await guestContext.close();
  }
});
