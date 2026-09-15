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

// Rich, high-contrast colours sampled from the supplied reference shelf.
// The variants repeat deliberately so the rail feels like a curated physical
// collection rather than a row of randomly generated muted gradients.
const SPINE_VARIANTS = [
  { width: 30, height: 248, light: "#9a9995", dark: "#4f4e4b" },
  { width: 34, height: 266, light: "#83743a", dark: "#413a1f" },
  { width: 38, height: 258, light: "#a33a2f", dark: "#5b211c" },
  { width: 42, height: 270, light: "#e2e2dc", dark: "#a4a49e" },
  { width: 36, height: 254, light: "#536875", dark: "#263943" },
  { width: 40, height: 244, light: "#6796a4", dark: "#2e5968" },
  { width: 32, height: 272, light: "#252628", dark: "#070708" },
  { width: 44, height: 260, light: "#a18b69", dark: "#554632" },
  { width: 35, height: 250, light: "#a64b61", dark: "#642534" },
  { width: 39, height: 268, light: "#d06fa5", dark: "#8b2f68" },
  { width: 43, height: 256, light: "#55939e", dark: "#28565e" },
  { width: 31, height: 246, light: "#c5c9c5", dark: "#777b78" },
  { width: 37, height: 262, light: "#55565b", dark: "#191a1d" },
  { width: 41, height: 252, light: "#999993", dark: "#555550" },
  { width: 33, height: 260, light: "#c25a38", dark: "#713021" },
  { width: 45, height: 246, light: "#5f718b", dark: "#26384f" },
  { width: 36, height: 270, light: "#8f355d", dark: "#4b1832" },
  { width: 40, height: 255, light: "#6f9345", dark: "#3d5726" },
] as const;

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const seed = hash(book.id || book.title);
  const variant = SPINE_VARIANTS[seed % SPINE_VARIANTS.length];
  const depth = 5 + (seed % 5);

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const vars = {
    "--book-w": `${variant.width}px`,
    "--book-h": `${variant.height}px`,
    "--book-rotation": "0deg",
    "--book-depth": `${depth}px`,
    "--spine-light": variant.light,
    "--spine-dark": variant.dark,
  } as CSSProperties;

  return (
    <button ref={ref} type="button" aria-label={`Open ${book.title}`} className="book-spine-hit shrink-0 self-end relative"
      style={vars} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={open}>
      <span className="book-spine-body absolute inset-0 origin-bottom overflow-visible rounded-[1px]"
        style={{ transform: `translate3d(0, ${hovered ? -18 : 0}px, ${hovered ? 70 : 0}px)`, zIndex: hovered ? 80 : 1 }}>
        <span className="book-spine-cover absolute inset-0 overflow-hidden rounded-[1px]" style={{ background: `linear-gradient(100deg, ${variant.light}, ${variant.dark})` }} />
        {cover && <img src={cover} alt="" onError={() => setFailed(true)} className="absolute inset-0 z-[2] h-full w-full rounded-[1px] object-cover object-center opacity-100" />}
        {!cover && <span className="book-spine-art absolute inset-0 z-[2]" style={{ background: `linear-gradient(135deg, ${variant.light} 0%, ${variant.dark} 52%, ${variant.light} 100%)` }} />}
        <span className="book-spine-cover-shade absolute inset-0 z-[3] rounded-[1px]" />
        <span className="book-spine-edge absolute inset-y-0 right-0 z-[4] w-[2px]" />
        <span className="book-spine-top absolute inset-x-0 top-0 z-[4] h-[3px]" />
        <span className="book-spine-title absolute inset-y-3 left-1/2 z-[5] -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-display text-[8px] leading-none tracking-[.045em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">{book.title}</span>
        {book.author && <span className="absolute bottom-2 left-1/2 z-[5] -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-mono text-[4.5px] uppercase tracking-[.09em] text-white/75">{book.author}</span>}
      </span>
      {hovered && <span className="book-spine-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-36 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.12em] text-[#5f574e]">{book.title}{book.author ? <span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span> : null}</span>}
    </button>
  );
}