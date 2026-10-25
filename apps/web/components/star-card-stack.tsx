import type { CSSProperties } from "react";
import type { Card } from "@moyeotable/contracts";
import { PlayingCard } from "./primitives";

/** Public cards in placement order: earlier ranks above one complete newest face. */
export function CardStack({
  cards,
  compact = false,
}: {
  cards: Card[];
  compact?: boolean;
}) {
  if (cards.length === 0) return null;
  return (
    <div
      className={`animal-card-stack${compact ? " compact" : ""}`}
      style={{ "--stack-steps": cards.length - 1 } as CSSProperties}
      aria-hidden="true"
    >
      {cards.map((card, index) => (
        <div
          className={`animal-stack-card ${index === cards.length - 1 ? "stack-front" : "stack-previous"}`}
          key={card.id}
          style={{ "--stack-index": index } as CSSProperties}
        >
          <PlayingCard
            card={card}
            artSizes={
              compact
                ? "(max-width: 640px) 48px, 76px"
                : "(max-width: 640px) 64px, 112px"
            }
          />
        </div>
      ))}
    </div>
  );
}
