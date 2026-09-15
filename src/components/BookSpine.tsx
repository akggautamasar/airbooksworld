"use client";

import { useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { Book } from "@/lib/api";
import { getCoverUrl } from "@/lib/api";

type Props = {
  book: Book;
  onOpen: (book: Book, onRect: { left: number; top: number; width: number; height: number }) => void;
};

function hash(value: string) {
  let n = 17;
  for (let i = 0; i < value.length; i++) n = (n * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(n);
}

// Fixed physical-spine variants sampled from the supplied reference: broad,
// tightly packed, upright books with a small repeating set of widths/heights
// and muted olive, red, blue, cream, charcoal, yellow, pink and teal tones.
const SPINE_VARIANTS = [
  { width: 30, height: 248, light: "#6f7773", dark: "#3f4845" },
  { width: 34, height: 266, light: "#897b3e", dark: "#5e5328" },
  { width: 38, height: 258, light: "#7c2e27", dark: "#4d211d" },
  { width: 42, height: 270, light: "#d1d0c8", dark: "#989891" },
  { width: 36, height: 254, light: "#50606d", dark: "#303941" },
  { width: 40, height: 244, light: "#789daa", dark: "#486a77" },
  { width: 32, height: 272, light: "#252628", dark: "#0d0d0e" },
  { width: 44, height: 260, light: "#8d7d66", dark: "#594c3e" },
  { width: 35, height: 250, light: "#964a60", dark: "#642f3e" },
  { width: 39, height: 268, light: "#c36e9e", dark: "#8f3f6d" },
  { width: 43, height: 256, light: "#558389", dark: "#31565a" },
  { width: 31, height: 246, light: "#b7bbb6", dark: "#777c79" },
  { width: 37, height: 262, light: "#54565a", dark: "#242528" },
  { width: 41, height: 252, light: "#8f8f89", dark: "#5e5e59" },
] as const;

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const seed = hash(book.id || book.title);
  const variant = SPINE_VARIANTS[seed % SPINE_VARIANTS.length];

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const vars = {
    "--book-w": `${variant.width}px`,
    "--book-h": `${variant.height}px`,
    // Every spine is upright. The reference has visual variation from width,
    // height, covers and edge shading, not from tilted books.
    "--book-rotation": "0deg",
    "--book-depth": "3px",
    "--spine-light": variant.light,
    "--spine-dark": variant.dark,
  } as CSSProperties;

  return (
    <button ref={ref} type="button" aria-label={`Open ${book.title}`} className="book-spine-hit shrink-0 self-end relative"
      style={vars} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={open}>
      <span className="book-spine-body absolute inset-0 origin-bottom overflow-hidden rounded-[1px]"
        style={{ transform: `translateZ(${hovered ? 80 : 0}px) translateY(${hovered ? -18 : 0}px)`, zIndex: hovered ? 80 : 1 }}>
        <span className="book-spine-cover absolute inset-0" style={{ background: `linear-gradient(100deg, ${variant.light}, ${variant.dark})` }} />
        {cover && <img src={cover} alt="" onError={() => setFailed(true)} className="absolute inset-0 h-full w-full object-cover object-center opacity-100" />}
        <span className="book-spine-cover-shade absolute inset-0" />
        <span className="book-spine-edge absolute inset-y-0 right-0 w-[2px]" />
        <span className="book-spine-top absolute inset-x-0 top-0 h-[3px]" />
        <span className="book-spine-title absolute inset-y-3 left-1/2 -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-display text-[8px] leading-none tracking-[.045em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">{book.title}</span>
        {book.author && <span className="absolute bottom-2 left-1/2 -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-mono text-[4.5px] uppercase tracking-[.09em] text-white/75">{book.author}</span>}
      </span>
      {hovered && <span className="book-spine-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-36 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.12em] text-[#5f574e]">{book.title}{book.author ? <span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span> : null}</span>}
    </button>
  );
}
