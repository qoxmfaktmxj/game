"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import Image from "next/image";
import { X, LoaderCircle } from "lucide-react";
import type { Card, Suit } from "@moyeotable/contracts";
import { suitNames } from "../lib/client";
import { getStarCardArt } from "../lib/star-card-art";
import "./star-theme.css";

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
          <path d="M12 12c-6-4-9 1-8 9 0 4 4 6 7 3m17-12c6-4 9 1 8 9 0 4-4 6-7 3" />
          <path d="M11 15c0-7 18-7 18 0v10c0 7-18 7-18 0Z" />
          <path d="M15 19h.1M25 19h.1M18 24h4l-2 2-2-2Zm2 2v3" />
        </>
      )}
      {suit === "ember" && (
        <>
          <path d="m9 17 1-10 8 6h4l8-6 1 10c6 12-4 16-11 16S3 29 9 17Z" />
          <path d="M14 21h.1M26 21h.1m-8 4h4l-2 2-2-2Zm2 2v3M5 23l6 1m-6 4 6-1m24-4-6 1m6 4-6-1" />
        </>
      )}
      {suit === "tide" && (
        <>
          <path d="M8 21c0-8 5-13 12-13s12 5 12 13c0 8-6 12-12 12S8 29 8 21Z" />
          <path d="M14 18h.1M26 18h.1m-8 5h4l-2 2-2-2Zm2 2v3m-3 0c1 2 5 2 6 0M4 22l8 2m-7 5 7-2m24-5-8 2m7 5-7-2" />
        </>
      )}
      {suit === "moss" && (
        <>
          <path d="M10 14c-6-5-2-10 3-7m17 7c6-5 2-10-3-7" />
          <path d="M7 22C7 5 33 5 33 22c0 7-6 11-13 11S7 29 7 22Z" />
          <path d="M14 19h.1M26 19h.1m-6 2c-7-4-12 6-5 8 3 1 4-1 5-1s2 2 5 1c7-2 2-12-5-8Zm-2 2h4l-2 2-2-2Z" />
        </>
      )}
      {suit === "dusk" && (
        <>
          <path d="M11 12C5 9 6 3 13 6m16 6c6-3 5-9-2-6" />
          <path d="M7 21C7 5 33 5 33 21c0 8-6 13-13 13S7 29 7 21Z" />
          <path d="M16 10l1 5m7-5-1 5M7 20l5 2m-4 5 5-1m20-6-5 2m4 5-5-1M15 20h.1M25 20h.1m-7 5h4l-2 2-2-2Zm2 2v3m-3 0c1 2 5 2 6 0" />
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
        src={getStarCardArt(card).src}
        alt=""
        fill
        sizes={artSizes}
        className="card-art"
        draggable={false}
      />
      <span className="card-corner">
        {card.kind === "support" ? "×2" : card.value}
      </span>
      <span className="card-center">
        <SuitIcon suit={card.suit} />
        <span>{suitNames[card.suit]}</span>
      </span>
    </>
  );
  const className = `playing-card animal-playing-card ${card.suit} ${card.kind === "support" ? "support-card" : ""} ${selected ? "selected" : ""} ${small ? "small" : ""}`;
  const label = `${suitNames[card.suit]} ${card.kind === "support" ? "지원 카드, 배수 카드" : card.value}`;
  return onClick ? (
    <button
      type="button"
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
    <div className={className} role="img" aria-label={label}>
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
        다섯 동물 친구, 여덟 장의 선택.
        <br />
        같은 친구끼리 숫자가 커지는 순서로 모아요.
      </p>
      <ol className="rule-steps">
        <li>
          <strong>한 장을 놓거나 버려요</strong>
          <p>
            같은 동물의 길에 숫자가 커지는 순서로 놓아요. 지원 카드는 숫자보다
            먼저. 놓기 어려운 카드는 버릴 수 있어요.
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
        <p className="support-multipliers">
          지원 1장 <b>×2</b> · 2장 <b>×3</b> · 3장 <b>×4</b>
        </p>
        <p>
          카드의 ×2는 지원 카드 표시예요. 지원을 추가할 때마다 배수가 1씩
          올라가요. 마이너스 점수에도 배수가 적용돼요.
        </p>
        <p>
          한 길에 지원 카드를 포함해 8장 이상 모았다면, 배수를 계산한 뒤{" "}
          <b>+20점</b>. 시작하지 않은 길은 0점이에요.
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
