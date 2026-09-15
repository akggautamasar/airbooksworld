"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Book } from "@/lib/api";
import { getCoverUrl } from "@/lib/api";

type Props = {
  book: Book;
  onOpen: (book: Book, rect: { left: number; top: number; width: number; height: number }) => void;
};

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const width = Math.max(20, Math.min(54, 20 + (book.title.length % 35)));
  const height = Math.max(196, Math.min(255, 208 + (book.size % 48)));
  const rotation = ((book.id.length * 13) % 68) - 34;
  const tilt = ((book.id.length * 7) % 9) - 4;
  const palette = ["#6b5a4d", "#7b6a5c", "#5e6461", "#786e58", "#655f72", "#7d5b50", "#4f6263", "#85765f"];
  const spine = palette[book.id.length % palette.length];

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const vars = {
    "--book-w": `${width}px`,
    "--book-h": `${height}px`,
    "--book-rotation": `${rotation}deg`,
    "--book-tilt": `${tilt}deg`,
  } as CSSProperties;

  return (
    <button
      ref={ref}
      type="button"
      aria-label={`Open ${book.title}`}
      className="book-spine-hit shrink-0 self-end relative"
      style={vars}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={open}
    >
      <span
        className="book-spine-body absolute inset-0 rounded-[2px] overflow-hidden origin-bottom shadow-[inset_-3px_0_5px_rgba(0,0,0,.25),inset_2px_0_3px_rgba(255,255,255,.18),0_8px_15px_rgba(36,31,25,.14)] transition-transform duration-700 ease-out"
        style={{
          background: spine,
          transform: `perspective(1000px) rotateY(${hovered ? 0 : rotation}deg) rotateZ(${hovered ? 0 : tilt}deg) translateZ(${hovered ? 70 : 0}px) translateY(${hovered ? -22 : 0}px)`,
          zIndex: hovered ? 40 : 1,
        }}
      >
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,.16),transparent_22%,rgba(0,0,0,.09)_78%,rgba(0,0,0,.24))]" />
        {cover && (
          <img src={cover} alt="" onError={() => setFailed(true)} className="absolute inset-0 w-full h-full object-cover object-left opacity-65 mix-blend-multiply" />
        )}
        <span className="absolute inset-y-4 left-1/2 -translate-x-1/2 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-display text-[10px] tracking-[.06em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.72)] overflow-hidden">
          {book.title}
        </span>
        <span className="absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-mono text-[6px] uppercase tracking-[.12em] text-white/75 overflow-hidden">
          {book.author || "AIRBOOKS"}
        </span>
      </span>
    </button>
  );
}
