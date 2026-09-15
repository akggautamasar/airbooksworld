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

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const seed = hash(book.id || book.title);

  // Physical-looking spines: narrow, tightly packed, with small deterministic differences.
  const width = 18 + (seed % 11); // 18–28px
  const height = 218 + ((seed >> 4) % 67); // 218–284px
  const rotation = ((seed % 17) - 8) * 0.68; // about -5.4° to +5.4°
  const depth = 2 + (seed % 5);
  const palettes = [
    ["#58635f", "#303b38"],
    ["#75675c", "#433a34"],
    ["#8b6f61", "#57453c"],
    ["#68758a", "#414c5d"],
    ["#8b7c68", "#594e43"],
    ["#6f7773", "#3f4845"],
    ["#8c6662", "#563f3c"],
    ["#706d7d", "#474552"],
  ] as const;
  const [light, dark] = palettes[seed % palettes.length];

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const vars = {
    "--book-w": `${width}px`,
    "--book-h": `${height}px`,
    "--book-rotation": `${rotation}deg`,
    "--book-depth": `${depth}px`,
    "--spine-light": light,
    "--spine-dark": dark,
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
        className="book-spine-body absolute inset-0 origin-bottom overflow-hidden rounded-[1px]"
        style={{
          transform: `translateZ(${hovered ? 80 : 0}px) translateY(${hovered ? -18 : 0}px) rotateZ(${hovered ? 0 : rotation}deg)`,
          zIndex: hovered ? 80 : 1,
        }}
      >
        <span className="book-spine-cover absolute inset-0" style={{ background: `linear-gradient(100deg, ${light}, ${dark})` }} />
        {cover && (
          <img
            src={cover}
            alt=""
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-left opacity-[.92] mix-blend-multiply"
          />
        )}
        <span className="book-spine-edge absolute inset-y-0 right-0 w-[2px]" />
        <span className="book-spine-top absolute inset-x-0 top-0 h-[3px]" />
        <span className="book-spine-title absolute inset-y-3 left-1/2 -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-display text-[8px] leading-none tracking-[.045em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.8)]">
          {book.title}
        </span>
        {book.author && (
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-mono text-[4.5px] uppercase tracking-[.09em] text-white/75">
            {book.author}
          </span>
        )}
      </span>
      {hovered && (
        <span className="book-spine-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-36 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.12em] text-[#5f574e]">
          {book.title}
          {book.author ? <span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span> : null}
        </span>
      )}
    </button>
  );
}
