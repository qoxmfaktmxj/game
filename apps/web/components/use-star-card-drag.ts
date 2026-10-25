"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { Card, StarCommand } from "@moyeotable/contracts";

type Drag = {
  card: Card;
  x: number;
  y: number;
  width: number;
  target: string | null;
};
type Gesture = {
  card: Card;
  pointerId: number;
  originX: number;
  originY: number;
  width: number;
  version: number;
  element: HTMLElement;
  active: boolean;
};

/** A visual gesture only: the authorised server View remains the card's location. */
export function useStarCardDrag({
  enabled,
  version,
  legalCommands,
  onSelect,
  onCommand,
}: {
  enabled: boolean;
  version: number;
  legalCommands: StarCommand[];
  onSelect: (id: string) => void;
  onCommand: (command: StarCommand) => void;
}) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const gesture = useRef<Gesture | null>(null);
  const submittedVersion = useRef<number | null>(null);
  const suppressClickUntil = useRef(0);
  const latest = useRef({
    enabled,
    version,
    legalCommands,
    onSelect,
    onCommand,
  });
  latest.current = { enabled, version, legalCommands, onSelect, onCommand };

  useEffect(() => {
    function destination(x: number, y: number, current: Gesture) {
      const zone = document
        .elementFromPoint(x, y)
        ?.closest<HTMLElement>("[data-star-drop]");
      if (!zone || zone.dataset.suit !== current.card.suit) return null;
      const type =
        zone.dataset.starDrop === "play" ? "STAR_PLAY" : "STAR_DISCARD";
      const command = latest.current.legalCommands.find(
        (candidate) =>
          candidate.type === type &&
          candidate.payload.cardId === current.card.id,
      );
      return command
        ? { command, key: `${zone.dataset.starDrop}:${current.card.suit}` }
        : null;
    }
    function finish(commit: boolean, x = 0, y = 0) {
      const current = gesture.current;
      if (!current) return;
      gesture.current = null;
      if (current.active) {
        suppressClickUntil.current = performance.now() + 700;
        const valid =
          commit &&
          latest.current.enabled &&
          current.version === latest.current.version
            ? destination(x, y, current)
            : null;
        if (valid) {
          submittedVersion.current = latest.current.version;
          setAnnouncement("카드 이동 승인을 기다리고 있어요.");
          latest.current.onCommand(valid.command);
        } else {
          setAnnouncement("이동을 취소했어요. 카드는 손패에 그대로 있어요.");
        }
      }
      setDrag(null);
      if (current.element.hasPointerCapture(current.pointerId)) {
        current.element.releasePointerCapture(current.pointerId);
      }
    }
    function move(event: PointerEvent) {
      const current = gesture.current;
      if (!current || event.pointerId !== current.pointerId) return;
      if (
        !latest.current.enabled ||
        current.version !== latest.current.version
      ) {
        finish(false);
        return;
      }
      if (!current.active) {
        if (
          Math.hypot(
            event.clientX - current.originX,
            event.clientY - current.originY,
          ) < 9
        )
          return;
        current.active = true;
        current.element.setPointerCapture(current.pointerId);
        latest.current.onSelect(current.card.id);
        setAnnouncement(
          "같은 동물의 내 길 또는 버림 더미로 옮겨 주세요. Esc로 취소할 수 있어요.",
        );
      }
      event.preventDefault();
      setDrag({
        card: current.card,
        x: event.clientX,
        y: event.clientY,
        width: current.width,
        target: destination(event.clientX, event.clientY, current)?.key ?? null,
      });
    }
    const up = (event: PointerEvent) => {
      if (event.pointerId === gesture.current?.pointerId)
        finish(true, event.clientX, event.clientY);
    };
    const cancel = (event: PointerEvent) => {
      if (event.pointerId === gesture.current?.pointerId) finish(false);
    };
    const lostCapture = (event: PointerEvent) => {
      const current = gesture.current;
      // Touch first captures the handle itself. Moving that capture to its holder
      // loses the handle's capture without ending the drag we now own.
      if (
        current &&
        event.pointerId === current.pointerId &&
        event.target === current.element
      )
        finish(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && gesture.current) {
        event.preventDefault();
        finish(false);
      }
    };
    const blur = () => finish(false);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    window.addEventListener("lostpointercapture", lostCapture);
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
      window.removeEventListener("lostpointercapture", lostCapture);
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", blur);
      const current = gesture.current;
      gesture.current = null;
      if (current?.element.hasPointerCapture(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
    };
  }, []);

  useEffect(() => {
    if (submittedVersion.current !== null) {
      if (submittedVersion.current !== version) {
        submittedVersion.current = null;
        setAnnouncement("카드 이동을 반영했어요.");
      } else if (enabled) {
        // An ACK can unlock controls before its separate View message arrives.
        // Only the View confirms a move; command errors belong to the parent.
        setAnnouncement((current) =>
          current === "카드 이동 승인을 기다리고 있어요." ? "" : current,
        );
      }
    }
    const current = gesture.current;
    if (current && (!enabled || current.version !== version)) {
      gesture.current = null;
      if (current.active) suppressClickUntil.current = performance.now() + 700;
      if (current.element.hasPointerCapture(current.pointerId))
        current.element.releasePointerCapture(current.pointerId);
      setDrag(null);
      setAnnouncement(
        "상태가 바뀌어 이동을 취소했어요. 최신 손패를 확인해 주세요.",
      );
    }
  }, [enabled, version]);

  function start(event: ReactPointerEvent<HTMLElement>, card: Card) {
    if (!enabled || !event.isPrimary || event.button !== 0 || gesture.current)
      return;
    // The card face retains native touch scrolling; only its handle starts a touch drag.
    if (
      event.pointerType === "touch" &&
      !(
        event.target instanceof Element &&
        event.target.closest(".card-drag-handle")
      )
    )
      return;
    const face =
      event.currentTarget.querySelector<HTMLElement>(".playing-card");
    gesture.current = {
      card,
      pointerId: event.pointerId,
      originX: event.clientX,
      originY: event.clientY,
      width: face?.getBoundingClientRect().width ?? 88,
      version,
      element: event.currentTarget,
      active: false,
    };
  }

  return {
    drag,
    announcement,
    start,
    resetClickSuppression: () => {
      // A fresh press is intentional; only the completed drag's click is ignored.
      suppressClickUntil.current = 0;
    },
    suppressClick: () => performance.now() < suppressClickUntil.current,
  };
}
