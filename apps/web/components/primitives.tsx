"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Image from "next/image";
import { X, LoaderCircle } from "lucide-react";
import type { Card, Suit } from "@moyeotable/contracts";
import { suitNames } from "../lib/client";

export function SuitIcon({
  suit,
  className = "",
}: {
  suit: Suit;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`suit-icon ${className}`}
    >
      {suit === "aurora" && (
        <>
          <path d="M5 25c5-15 9-17 14-7s10 11 16-3M5 32c5-15 9-17 14-7s10 11 16-3" />
          <path d="M10 13c3-7 6-9 9-5s4 10 8 10" opacity=".5" />
        </>
      )}
      {suit === "ember" && (
        <>
          <path
            d="M21 4c2 8-5 10-4 16 4-1 6-5 7-8 3 4 8 9 8 15 0 7-5 10-12 10S8 32 8 26c0-5 3-9 7-13-1 5 0 7 1 8-1-8 8-10 5-17Z"
            fill="currentColor"
            fillOpacity=".1"
          />
          <path d="M20 22c0 5-5 6-5 10 0 3 2 5 5 5s5-2 5-5c0-4-3-6-5-10Z" />
        </>
      )}
      {suit === "tide" && (
        <>
          <path d="M4 25c6 0 7-4 10-10 3-7 10-10 16-5-7-1-10 6-5 10 3 3 7 4 11 3" />
          <path d="M4 29c4 3 7 3 11 0s7-3 11 0 7 3 10 0M4 35c4 3 7 3 11 0s7-3 11 0 7 3 10 0" />
        </>
      )}
      {suit === "moss" && (
        <>
          <path
            d="M12 29H6c-4 0-5-5-2-7-2-3 0-7 3-7-1-4 2-7 5-7s6 3 5 7c4 0 6 5 3 7 3 3 1 7-3 7h-5Z"
            fill="currentColor"
            fillOpacity=".08"
          />
          <path d="M25 27h7c4 0 6-5 3-8 2-3 0-7-3-7 0-4-3-7-6-7s-6 3-6 7M12 19v16m-4-11 4 3 4-4m10-7v19m-4-14 4 4 5-5M6 36h28" />
        </>
      )}
      {suit === "dusk" && (
        <>
          <path
            d="M10 24a10 10 0 0 1 20 0"
            fill="currentColor"
            fillOpacity=".12"
          />
          <path d="M4 24h32M8 29h24m-18 5h12M20 5v4M7 11l3 3m23-3-3 3M3 19l3 1m31-1-3 1" />
        </>
      )}
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <svg
        width="42"
        height="34"
        viewBox="0 0 42 34"
        fill="none"
        aria-hidden="true"
      >
        <ellipse
          cx="15"
          cy="17"
          rx="10"
          ry="13"
          transform="rotate(-31 15 17)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <ellipse
          cx="27"
          cy="17"
          rx="10"
          ry="13"
          transform="rotate(-31 27 17)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <path
          d="m19 13 2 4-2 4"
          stroke="var(--gold)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {!compact && (
        <span>
          링구링구<span className="brand-period">.</span>
        </span>
      )}
    </span>
  );
}

export function PlayingCard({
  card,
  selected = false,
  onClick,
  disabled = false,
  small = false,
  motionSlot,
  artSizes = "(max-width: 760px) 76px, 88px",
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  small?: boolean;
  motionSlot?: string;
  artSizes?: string;
}) {
  const content = (
    <>
      <Image
        src={`/art/cards/star-trails/${card.suit}-${card.kind === "support" ? "support" : card.value}.png`}
        alt=""
        fill
        sizes={artSizes}
        className="card-art"
        draggable={false}
      />
      <span className="card-print-frame" aria-hidden="true" />
      <span className="card-corner">
        {card.kind === "support" ? "+" : card.value}
        <SuitIcon suit={card.suit} />
      </span>
      <span className="card-center">
        <span>{card.kind === "support" ? "지원" : suitNames[card.suit]}</span>
      </span>
      <span className="card-corner card-corner-bottom">
        {card.kind === "support" ? "+" : card.value}
      </span>
    </>
  );
  const className = `playing-card illustrated-card ${card.suit} ${selected ? "selected" : ""} ${small ? "small" : ""}`;
  const label = `${suitNames[card.suit]} ${card.kind === "support" ? "지원 카드" : card.value}`;
  return onClick ? (
    <button
      className={className}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      data-card-id={card.id}
      data-motion-slot={motionSlot}
      data-motion-value={card.id}
    >
      {content}
    </button>
  ) : (
    <div className={className} aria-label={label}>
      {content}
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    dialog?.showModal();
    (
      dialog?.querySelector<HTMLElement>(
        "input:not([readonly]):not([disabled])",
      ) ?? dialog?.querySelector<HTMLElement>("button")
    )?.focus();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const targets = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex]",
          ) ?? [],
        ).filter(
          (element) =>
            element.tabIndex >= 0 && element.getClientRects().length > 0,
        );
        const first = targets[0],
          last = targets.at(-1);
        if (!first) {
          event.preventDefault();
          return;
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            !ref.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          last?.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !ref.current?.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }}
      onClick={(event) => {
        if (event.target === ref.current) {
          const r = ref.current.getBoundingClientRect();
          if (
            event.clientX < r.left ||
            event.clientX > r.right ||
            event.clientY < r.top ||
            event.clientY > r.bottom
          )
            onClose();
        }
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export function Busy({ text = "잠시만요" }: { text?: string }) {
  return (
    <>
      <LoaderCircle className="spinner" size={18} />
      {text}
    </>
  );
}

export function RulesContent() {
  return (
    <div className="rules-content">
      <p className="lead">
        다섯 개의 별길, 여덟 장의 선택.
        <br />
        어느 길에 도전할지는 당신에게 달렸어요.
      </p>
      <ol className="rule-steps">
        <li>
          <strong>한 장을 놓거나 버려요</strong>
          <p>
            같은 길에 숫자가 커지는 순서로 놓아요. 지원 카드는 숫자보다 먼저.
            놓기 어려운 카드는 버릴 수 있어요.
          </p>
        </li>
        <li>
          <strong>한 장을 가져와요</strong>
          <p>
            덱에서 뽑거나 버림 더미의 맨 위 카드를 가져와요. 방금 버린 카드는
            곧바로 가져올 수 없어요.
          </p>
        </li>
        <li>
          <strong>덱이 비면 탐험이 끝나요</strong>
          <p>
            마지막 카드를 뽑는 즉시 점수를 계산해요. 가장 높은 점수가 승리하고,
            같으면 공동 승리예요.
          </p>
        </li>
      </ol>
      <div className="score-formula">
        <span>길마다 이렇게 계산해요</span>
        <strong>(숫자 합 − 20) × (지원 수 + 1)</strong>
        <p>
          한 길에 8장 이상 모았다면 <b>+20점</b>. 시작하지 않은 길은 0점이에요.
          지원 카드의 배수는 마이너스 점수에도 적용돼요.
        </p>
      </div>
      <div className="suit-legend">
        {(["aurora", "ember", "tide", "moss", "dusk"] as Suit[]).map((suit) => (
          <span key={suit} className={suit}>
            <SuitIcon suit={suit} />
            {suitNames[suit]}
          </span>
        ))}
      </div>
      <p className="quiet">2인 · 60장 · 각자 손패 8장 · 기본 규칙 1.0.0</p>
      <a
        className="card-gallery-link"
        href="/cards"
        target="_blank"
        rel="noreferrer"
      >
        카드 그림 모아보기 ↗
      </a>
    </div>
  );
}
