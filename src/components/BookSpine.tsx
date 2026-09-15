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

// Saturated reference colours sampled from the supplied screenshots.
const SPINE_VARIANTS = [
  { light: "#7888A8", dark: "#182848" },
  { light: "#A83838", dark: "#480808" },
  { light: "#587888", dark: "#183848" },
  { light: "#D8D8D2", dark: "#8C8C86" },
  { light: "#D89888", dark: "#783828" },
  { light: "#A88868", dark: "#584028" },
  { light: "#C85898", dark: "#781838" },
  { light: "#78A098", dark: "#285850" },
  { light: "#8898B8", dark: "#283850" },
  { light: "#687888", dark: "#182830" },
  { light: "#C89878", dark: "#684828" },
  { light: "#E0DCD0", dark: "#98948A" },
  { light: "#506878", dark: "#101820" },
  { light: "#B87858", dark: "#582018" },
  { light: "#689878", dark: "#284828" },
  { light: "#B83848", dark: "#580818" },
  { light: "#D8A898", dark: "#784838" },
  { light: "#6890A8", dark: "#203848" },
] as const;

// If the API eventually exposes a real page count, it wins. Until then the
// stored file size is the best available physical-thickness signal and keeps
// small/large books visibly different without pretending it is a page count.
function getThickness(book: Book, seed: number) {
  const b = book as Book & { page_count?: number; pages?: number; num_pages?: number };
  const pages = Number(b.page_count ?? b.pages ?? b.num_pages ?? 0);
  if (pages > 0) return Math.round(Math.min(48, Math.max(18, 17 + Math.sqrt(pages) * 1.55));
  const mb = Math.max(0.05, book.size / (1024 * 1024));
  return Math.round(Math.min(48, Math.max(18, 19 + Math.log2(mb + 1) * 4.2 + (seed % 4))));
}

function getHeight(seed: number) {
  return 238 + (seed % 43);
}

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [textTone, setTextTone] = useState<"light" | "dark">("light");
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const seed = hash(book.id || book.title);
  const variant = SPINE_VARIANTS[seed % SPINE_VARIANTS.length];
  const width = getThickness(book, seed);
  const height = getHeight(seed);
  const depth = 5 + (seed % 6);

  function sampleCover(e: React.SyntheticEvent<HTMLImageElement>) {
    try {
      const img = e.currentTarget;
      const canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      setTextTone((0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "dark" : "light");
    } catch {
      setTextTone((seed % 3 === 0) ? "dark" : "light");
    }
  }

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  const vars = {
    "--book-w": `${width}px`,
    "--book-h": `${height}px`,
    "--book-rotation": "0deg",
    "--book-depth": `${depth}px`,
    "--spine-light": variant.light,
    "--spine-dark": variant.dark,
  } as CSSProperties;

  const ink = textTone === "dark" ? "#25221f" : "#f2eadb";
  const secondaryInk = textTone === "dark" ? "#5d5047" : "#dfd2bd";

  return (
    <button ref={ref} type="button" aria-label={`Open ${book.title}`} className="book-spine-hit shrink-0 self-end relative"
      style={vars} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={open}>
      <span className="book-spine-body absolute inset-0 origin-bottom overflow-visible rounded-[1px]"
        style={{ transform: `translate3d(0, ${hovered ? -18 : 0}px, ${hovered ? 70 : 0}px)`, zIndex: hovered ? 80 : 1 }}>
        <span className="book-spine-cover absolute inset-0 overflow-hidden rounded-[1px]" style={{ background: `linear-gradient(104deg, ${variant.light} 0%, ${variant.light} 52%, ${variant.dark} 100%)` }} />
        {cover && <img src={cover} alt="" onLoad={sampleCover} onError={() => setFailed(true)} className="absolute inset-0 z-[2] h-full w-full rounded-[1px] object-cover object-center opacity-100" />}
        {!cover && <span className="book-spine-art absolute inset-0 z-[2]" style={{ background: `linear-gradient(135deg, ${variant.light} 0%, ${variant.dark} 52%, ${variant.light} 100%)` }} />}

        {/* Premium lacquer/gloss streak seen on the reference books. */}
        <span className="pointer-events-none absolute inset-y-0 left-[18%] z-[6] w-[2px] -skew-x-[12deg] bg-gradient-to-r from-transparent via-white/55 to-transparent opacity-80" />
        <span className="pointer-events-none absolute inset-y-0 left-[24%] z-[6] w-px bg-gradient-to-b from-transparent via-white/30 to-transparent" />
        <span className="book-spine-cover-shade absolute inset-0 z-[3] rounded-[1px]" />
        <span className="book-spine-edge absolute inset-y-0 right-0 z-[4] w-[2px]" />
        <span className="book-spine-top absolute inset-x-0 top-0 z-[4] h-[3px]" />

        <span className="book-spine-title absolute inset-y-3 left-1/2 z-[7] -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-display text-[8px] leading-none tracking-[.045em] drop-shadow-[0_1px_1px_rgba(0,0,0,.45)]" style={{ color: ink }}>{book.title}</span>
        {book.author && <span className="absolute bottom-7 left-1/2 z-[7] -translate-x-1/2 overflow-hidden whitespace-nowrap [writing-mode:vertical-rl] rotate-180 font-mono text-[4.5px] uppercase tracking-[.09em]" style={{ color: secondaryInk }}>{book.author}</span>}
        <span className="absolute bottom-1 left-1/2 z-[7] -translate-x-1/2 font-mono text-[3.5px] uppercase tracking-[.18em]" style={{ color: secondaryInk }}>AirBooks</span>
      </span>
      {hovered && <span className="book-spine-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-36 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.12em] text-[#5f574e]">{book.title}{book.author ? <span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span> : null}</span>}
    </button>
  );
}
