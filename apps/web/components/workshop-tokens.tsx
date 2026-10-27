import { useEffect, useRef, type RefObject } from "react";
import { webAssets } from "../lib/web-assets";
import { workshopResources } from "../lib/workshop-theme";

export type Snack = keyof typeof workshopResources;
export type SnackCounts = Record<Snack, number>;

export function ResourceArt({ token }: { token: Snack }) {
  return (
    <span className={`wild-resource-art snack-${token}`} aria-hidden="true">
      <img
        src={webAssets[`workshop-token/${token}`].src}
        alt=""
        width={192}
        height={192}
        draggable={false}
      />
    </span>
  );
}

export function TokenPile({ token, count }: { token: Snack; count: number }) {
  return (
    <span
      className={`wild-token-pile ${count === 0 ? "is-empty" : ""}`}
      aria-hidden="true"
    >
      {count === 0 ? (
        <span className="wild-token-empty">
          <ResourceArt token={token} />
        </span>
      ) : (
        Array.from({ length: count }, (_, i) => (
          <span
            className="wild-pile-piece"
            key={i}
            style={{
              bottom: `${i * 5}px`,
              left: `calc(50% - 22px + ${(i % 2) * 2}px)`,
            }}
          >
            <ResourceArt token={token} />
          </span>
        ))
      )}
    </span>
  );
}

export function TokenInventory({ counts }: { counts: SnackCounts }) {
  return (
    <div className="wild-inventory" aria-label="내 간식">
      {(Object.keys(workshopResources) as Snack[]).map((token) => (
        <div
          className={`wild-token-slot token-${token}`}
          key={token}
          role="img"
          data-token-zone="mine"
          data-token={token}
          title={workshopResources[token].name}
          aria-label={`${workshopResources[token].name} ${counts[token]}개`}
        >
          <TokenPile token={token} count={counts[token]} />
          <b aria-hidden="true">{counts[token]}</b>
        </div>
      ))}
    </div>
  );
}

export function useTokenTransfers(
  root: RefObject<HTMLDivElement | null>,
  mine: SnackCounts,
  bank: SnackCounts,
  connected: boolean,
  playerId: string,
) {
  const previous = useRef({ mine, bank, connected, playerId });
  useEffect(() => {
    const old = previous.current;
    previous.current = { mine, bank, connected, playerId };
    if (
      !connected ||
      !old.connected ||
      old.playerId !== playerId ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const flying: HTMLElement[] = [];
    for (const token of Object.keys(mine) as Snack[]) {
      const delta = mine[token] - old.mine[token];
      const bankDelta = bank[token] - old.bank[token];
      if (!delta || Math.sign(delta) === Math.sign(bankDelta)) continue;
      const from = root.current?.querySelector(
        `[data-token-zone="${delta > 0 ? "bank" : "mine"}"][data-token="${token}"]`,
      );
      const to = root.current?.querySelector(
        `[data-token-zone="${delta > 0 ? "mine" : "bank"}"][data-token="${token}"]`,
      );
      const chip = from?.querySelector<HTMLElement>(".wild-resource-art");
      if (!from || !to || !chip) continue;
      const start = from.getBoundingClientRect(),
        end = to.getBoundingClientRect();
      for (let i = 0; i < Math.min(Math.abs(delta), Math.abs(bankDelta)); i++) {
        const clone = chip.cloneNode(true) as HTMLElement;
        clone.classList.add("wild-token-flight");
        Object.assign(clone.style, {
          left: `${start.x + start.width / 2 - 22}px`,
          top: `${start.y + start.height / 2 - 22}px`,
        });
        document.body.append(clone);
        flying.push(clone);
        const x = end.x + end.width / 2 - start.x - start.width / 2;
        const y = end.y + end.height / 2 - start.y - start.height / 2;
        const animation = clone.animate(
          [
            { transform: "translate(0, 0) scale(1)", opacity: 1 },
            {
              transform: `translate(${x * 0.5}px, ${y * 0.5 - 35}px) scale(1.12)`,
              opacity: 1,
              offset: 0.45,
            },
            { transform: `translate(${x}px, ${y}px) scale(1)`, opacity: 0.9 },
          ],
          {
            duration: 560,
            delay: i * 70,
            easing: "cubic-bezier(.22,1,.36,1)",
            fill: "backwards",
          },
        );
        animation.onfinish = () => clone.remove();
      }
    }
    return () =>
      flying.forEach((element) => {
        element.getAnimations().forEach((animation) => animation.cancel());
        element.remove();
      });
  }, [root, mine, bank, connected, playerId]);
}
