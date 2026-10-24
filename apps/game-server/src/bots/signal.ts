import type { GameViewMap } from "@moyeotable/contracts";
import {
  action,
  pickRated,
  type BotCommand,
  type BotRandom,
  type Rated,
} from "./types.js";

type View = GameViewMap["signal"];
type Card = View["yourHand"][number];
const ranges: Record<string, number> = {
  repeater: 1,
  range2: 2,
  range3: 3,
  range4: 4,
  range5: 5,
};

export function chooseSignalCommand(
  view: View,
  randomInt: BotRandom,
): BotCommand | null {
  if (!view.legalActions.length || view.phase === "FINISHED") return null;
  const can = (type: string) => view.legalActions.includes(type);
  const me = view.players.find((player) => player.id === view.you)!;
  const others = view.players.filter(
    (player) => player.alive && player.id !== view.you,
  );
  const captain = view.players.find(
    (player) => player.alive && player.role === "captain",
  );
  const versatile = me.character.id === "versatile";
  const strike = (card: Card) =>
    card.kind === "strike" || (versatile && card.kind === "evade");
  const evade = (card: Card) =>
    card.kind === "evade" || (versatile && card.kind === "strike");
  const cardValue = (card: Card) => {
    if (card.kind === "tonic")
      return others.length >= 2 ? (me.health <= 2 ? 12 : 7) : -5;
    if (evade(card)) return 8;
    if (strike(card)) return 6;
    if (card.kind === "shield" || card.kind === "detour")
      return me.equipment.some((c) => c.kind === card.kind) ? 0 : 8;
    if (card.kind === "supply" || card.kind === "caravan") return 10;
    if (card.kind === "reactor") return -6;
    if (ranges[card.kind])
      return 2 + Math.max(0, ranges[card.kind]! - view.weaponRange) * 2;
    return 5;
  };
  const disposable = () =>
    [...view.yourHand].sort((a, b) => cardValue(a) - cardValue(b));
  // Allegiance inference uses only the revealed captain and the bot's own role.
  const hostility = (player: View["players"][number]) => {
    if (player.role === "captain") {
      if (view.yourRole === "ally") return -100;
      if (view.yourRole === "drifter" && others.length > 1) return -30;
      return 12;
    }
    if (view.yourRole === "drifter") return 7;
    return 5;
  };
  const dangerous = others.filter((player) => hostility(player) > 0);
  if (can("SIGNAL_RESCUE")) {
    const tonics = view.yourHand.filter((card) => card.kind === "tonic");
    return action("SIGNAL_RESCUE", {
      cardIds: tonics
        .slice(0, Math.max(1, 1 - me.health))
        .map((card) => card.id),
    });
  }
  if (
    can("SIGNAL_HEAL") &&
    me.health < me.maxHealth &&
    (me.health <= 1 ||
      (me.health <= 2 &&
        disposable()
          .slice(0, 2)
          .reduce((n, card) => n + cardValue(card), 0) <= 12))
  )
    return action("SIGNAL_HEAL", {
      cardIds: disposable()
        .slice(0, 2)
        .map((card) => card.id),
    });
  if (can("SIGNAL_ACCEPT_ELIMINATION"))
    return action("SIGNAL_ACCEPT_ELIMINATION");
  if (can("SIGNAL_SHIELD")) return action("SIGNAL_SHIELD");
  if (can("SIGNAL_RESPOND")) {
    const needsStrike =
      view.pending?.mode === "duel" || view.pending?.mode === "raiders";
    const card = [...view.yourHand]
      .filter(needsStrike ? strike : evade)
      .sort((a, b) => cardValue(a) - cardValue(b))[0];
    if (card) return action("SIGNAL_RESPOND", { cardId: card.id });
  }
  if (can("SIGNAL_TAKE_HIT")) return action("SIGNAL_TAKE_HIT");
  if (can("SIGNAL_CHOOSE")) {
    const pending = view.pending!;
    const ranked = pending.cards
      .map((card) => ({
        card,
        score:
          pending.kind === "check"
            ? (pending.purpose === "reactor"
                ? Number(
                    !(
                      card.suit === "spades" &&
                      card.rank >= 2 &&
                      card.rank <= 9
                    ),
                  )
                : Number(card.suit === "hearts")) * 100
            : cardValue(card) + randomInt(3) * 0.2,
      }))
      .sort((a, b) => b.score - a.score);
    return action("SIGNAL_CHOOSE", {
      cardIds: ranked.slice(0, pending.chooseCount).map(({ card }) => card.id),
    });
  }
  if (can("SIGNAL_DRAW")) {
    if (
      me.character.id === "recycler" &&
      view.discardTop &&
      cardValue(view.discardTop) >= 7
    )
      return action("SIGNAL_DRAW", { source: "discard" });
    if (me.character.id === "scrounger") {
      const target = pickRated(
        dangerous
          .filter((player) => player.handCount > 0)
          .map((player) => ({
            item: player,
            score: hostility(player) + (player.handCount <= 2 ? 2 : 0),
          })),
        randomInt,
      );
      if (target)
        return action("SIGNAL_DRAW", { source: "player", targetId: target.id });
    }
    return action("SIGNAL_DRAW", { source: "deck" });
  }
  if (can("SIGNAL_DISCARD"))
    return action("SIGNAL_DISCARD", {
      cardIds: disposable()
        .slice(0, me.handCount - me.health)
        .map((card) => card.id),
    });
  if (!can("SIGNAL_PLAY")) return null;
  const candidates: Rated<BotCommand>[] = [];
  const add = (
    card: Card,
    score: number,
    payload: Record<string, unknown> = {},
  ) =>
    candidates.push({
      item: action("SIGNAL_PLAY", { cardId: card.id, ...payload }),
      score,
    });
  for (const card of view.yourHand) {
    if (strike(card)) {
      if (
        view.strikesPlayed > 0 &&
        me.character.id !== "rapid" &&
        !me.equipment.some((c) => c.kind === "repeater")
      )
        continue;
      for (const target of dangerous.filter(
        (p) => p.distance !== null && p.distance <= view.weaponRange,
      ))
        add(card, 6 + hostility(target) * 0.4 + (target.health === 1 ? 4 : 0), {
          targetId: target.id,
        });
      continue;
    }
    if (card.kind === "evade" || card.kind === "reactor") continue;
    if (card.kind === "tonic") {
      if (me.health < me.maxHealth && others.length >= 2)
        add(card, 15 + me.maxHealth - me.health);
      continue;
    }
    if (card.kind === "pulse") {
      const alliedCaptain =
        view.yourRole === "ally" &&
        captain &&
        captain.health < captain.maxHealth;
      if (me.health < me.maxHealth || alliedCaptain)
        add(card, 8 + (me.health <= 2 ? 6 : 0) + (alliedCaptain ? 4 : 0));
      continue;
    }
    if (card.kind === "challenge") {
      for (const target of dangerous)
        if (
          view.yourHand.filter(strike).length >=
            Math.min(2, target.handCount) ||
          target.handCount <= 1
        )
          add(
            card,
            4 + hostility(target) * 0.4 + Number(target.health === 1) * 3,
            { targetId: target.id },
          );
      continue;
    }
    if (card.kind === "jam" || card.kind === "snatch") {
      const ownHazard = me.equipment.find(
        (c) => c.kind === "quarantine" || c.kind === "reactor",
      );
      if (ownHazard)
        add(card, 14, { targetId: me.id, targetCardId: ownHazard.id });
      for (const target of dangerous.filter(
        (p) => card.kind === "jam" || (p.distance !== null && p.distance <= 1),
      )) {
        const gear = [...target.equipment]
          .filter((c) => c.kind !== "quarantine" && c.kind !== "reactor")
          .sort((a, b) => cardValue(b) - cardValue(a))[0];
        if (gear)
          add(
            card,
            5 + hostility(target) * 0.4 + (gear.kind === "shield" ? 2 : 0),
            { targetId: target.id, targetCardId: gear.id },
          );
        if (target.handCount)
          add(card, 4 + hostility(target) * 0.3, { targetId: target.id });
      }
      continue;
    }
    if (card.kind === "quarantine") {
      for (const target of dangerous.filter(
        (p) =>
          p.role !== "captain" &&
          !p.equipment.some((c) => c.kind === "quarantine"),
      ))
        add(card, 6 + hostility(target) * 0.3, { targetId: target.id });
      continue;
    }
    if (card.kind === "barrage" || card.kind === "raiders") {
      if (
        captain &&
        captain.id !== me.id &&
        captain.health <= 1 &&
        (view.yourRole === "ally" ||
          (view.yourRole === "drifter" && others.length > 1))
      )
        continue;
      add(card, 4 + dangerous.length * 1.8);
      continue;
    }
    if (card.equipment) {
      if (me.equipment.some((gear) => gear.kind === card.kind)) continue;
      const range = ranges[card.kind];
      if (range) {
        if (card.kind === "repeater") {
          if (
            view.yourHand.filter(strike).length >= 2 &&
            dangerous.some((p) => p.distance === 1)
          )
            add(card, 10);
        } else if (range > view.weaponRange)
          add(card, 10 + range - view.weaponRange);
      } else add(card, card.kind === "shield" ? 13 : 10);
      continue;
    }
    if (card.kind === "supply" || card.kind === "caravan") add(card, 16);
    if (card.kind === "cache") add(card, 7);
  }
  return pickRated(candidates, randomInt, 1.2) ?? action("SIGNAL_END_TURN");
}
