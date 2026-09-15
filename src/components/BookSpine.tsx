"use client";

import { useRef, useState } from "react";
import type { CSSProperties, SyntheticEvent } from "react";
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

type SpineVariant = { light: string; mid: string; dark: string; ink: string };

// Rich colours taken directly from the uploaded shelf references.
const SPINE_VARIANTS: SpineVariant[] = [
  { light: "#e7e3dc", mid: "#c7c1b7", dark: "#7c756b", ink: "#241f19" },
  { light: "#9a9995", mid: "#706f6b", dark: "#3f3e3b", ink: "#f7f2e9" },
  { light: "#7f6d32", mid: "#6a5a28", dark: "#302914", ink: "#fbf5e7" },
  { light: "#b94a3b", mid: "#8e2f27", dark: "#4c1715", ink: "#fff6ed" },
  { light: "#5d7782", mid: "#3c5965", dark: "#1d343e", ink: "#f6f1e8" },
  { light: "#6f9da9", mid: "#46727e", dark: "#234c58", ink: "#f8f5ed" },
  { light: "#292b2d", mid: "#17191b", dark: "#070809", ink: "#faf7ef" },
  { light: "#b29a78", mid: "#866d4f", dark: "#4e3d2c", ink: "#fff7e9" },
  { light: "#b55a70", mid: "#87384f", dark: "#4d1c2b", ink: "#fff3f4" },
  { light: "#d977a9", mid: "#b54c83", dark: "#6d2459", ink: "#fff5fb" },
  { light: "#58a0a7", mid: "#337b83", dark: "#1d555c", ink: "#f3fbf7" },
  { light: "#c9ccc8", mid: "#a1a6a2", dark: "#696e6b", ink: "#25231f" },
  { light: "#60636a", mid: "#3d4046", dark: "#191b20", ink: "#f8f4eb" },
  { light: "#c1beb5", mid: "#96938a", dark: "#5a5852", ink: "#292620" },
  { light: "#d06845", mid: "#a6432d", dark: "#5e2018", ink: "#fff7ef" },
  { light: "#6680a0", mid: "#405b79", dark: "#21354e", ink: "#f5f4ef" },
  { light: "#963e61", mid: "#682442", dark: "#3d1428", ink: "#fff4f5" },
  { light: "#78994e", mid: "#55722f", dark: "#2d431b", ink: "#f7f8ed" },
];

function getPhysicalSize(book: Book, seed: number) {
  const pages = book.page_count ?? book.pages ?? null;
  if (typeof pages === "number" && pages > 0) {
    return {
      width: Math.round(Math.max(18, Math.min(58, pages * 0.055 + ((seed % 9) - 4) * 0.7))),
      height: pages > 420 ? 252 : pages < 260 ? 204 : 226,
    };
  }
  return { width: 26 + (seed % 27), height: 214 + ((seed >> 4) % 61) };
}

function richColor(hex: string) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16) / 255;
  const g = Number.parseInt(value.slice(2, 4), 16) / 255;
  const b = Number.parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2, d = max - min;
  let h = 0, sat = 0;
  if (d) {
    sat = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return `hsl(${Math.round(h)} ${Math.round(Math.max(52, Math.min(82, sat * 125)))}% ${Math.round(Math.max(25, Math.min(68, l * 100)))}%)`;
}

function readableInk(hex: string) {
  const value = hex.replace("#", "");
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.62 ? "#241f19" : "#faf7ef";
}

export function BookSpine({ book, onOpen }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [failed, setFailed] = useState(false);
  const [coverColor, setCoverColor] = useState<string | null>(null);
  const [coverInk, setCoverInk] = useState<string | null>(null);
  const cover = book.cover_message_id && !failed ? getCoverUrl(book.id, book.updated_at) : null;
  const seed = hash(book.id || book.title);
  const variant = SPINE_VARIANTS[seed % SPINE_VARIANTS.length];
  const { width, height } = getPhysicalSize(book, seed);
  const depth = 4 + (seed % 6);
  const lean = -5.2 + ((seed >> 3) % 11) * 1.02;
  const ink = coverInk || variant.ink;
  const spineBase = coverColor || variant.mid;

  function open() {
    const r = ref.current?.getBoundingClientRect();
    if (r) onOpen(book, { left: r.left, top: r.top, width: r.width, height: r.height });
  }

  function sampleCover(e: SyntheticEvent<HTMLImageElement>) {
    try {
      const img = e.currentTarget;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 24;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 24, 24);
      const pixels = ctx.getImageData(0, 0, 24, 24).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] < 140) continue;
        const max = Math.max(pixels[i], pixels[i + 1], pixels[i + 2]);
        const min = Math.min(pixels[i], pixels[i + 1], pixels[i + 2]);
        if (max > 238 && max - min < 12) continue;
        r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; count++;
      }
      if (count) {
        const hex = `#${[r, g, b].map(v => Math.round(v / count).toString(16).padStart(2, "0")).join("")}`;
        setCoverColor(richColor(hex));
        setCoverInk(readableInk(hex));
      }
    } catch {
      // CORS-protected covers keep the deterministic reference treatment.
    }
  }

  const vars = {
    "--book-w": `${width}px`,
    "--book-h": `${height}px`,
    "--book-rotation": `${lean}deg`,
    "--book-depth": `${depth}px`,
    "--spine-light": variant.light,
    "--spine-mid": variant.mid,
    "--spine-dark": variant.dark,
  } as CSSProperties;

  return (
    <button ref={ref} type="button" aria-label={`Open ${book.title}`} className="book-spine-hit shrink-0 self-end relative" style={vars}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocus={() => setHovered(true)} onBlur={() => setHovered(false)} onClick={open}>
      <span className="book-spine-body absolute inset-0 origin-bottom overflow-visible rounded-[1px]" style={{ transform: `translate3d(0, ${hovered ? -16 : 0}px, ${hovered ? 65 : 0}px) rotateY(${hovered ? 0 : lean * 0.18}deg)`, zIndex: hovered ? 80 : 1 }}>
        <span className="book-spine-cover absolute inset-0 overflow-hidden rounded-[1px]" style={{ background: cover ? `linear-gradient(105deg, rgba(255,255,255,.22), transparent 20%, rgba(0,0,0,.13) 82%, rgba(0,0,0,.27)), linear-gradient(115deg, color-mix(in srgb, ${spineBase} 78%, white), ${spineBase} 46%, color-mix(in srgb, ${spineBase} 68%, black))` : `linear-gradient(105deg, ${variant.light}, ${variant.mid} 42%, ${variant.dark})` }} />
        {cover && <img src={cover} alt="" crossOrigin="anonymous" onLoad={sampleCover} onError={() => setFailed(true)} className="absolute inset-0 z-[1] h-full w-full rounded-[1px] object-cover object-center opacity-0" />}
        {!cover && <span className="book-spine-art absolute inset-0 z-[2]" style={{ background: `linear-gradient(135deg, ${variant.light} 0%, ${variant.mid} 44%, ${variant.dark} 78%, ${variant.light} 100%)` }} />}

        {/* The narrow lacquer highlight and broad sheen are the premium detail visible in the uploaded reference. */}
        <span className="book-spine-material absolute inset-0 z-[3] rounded-[1px]" />
        <span className="book-spine-gloss absolute inset-y-0 left-[18%] z-[4] w-px" />
        <span className="book-spine-gloss-wide absolute inset-y-0 left-[22%] z-[4] w-[5px]" />
        <span className="book-spine-edge absolute inset-y-0 right-0 z-[5] w-[2px]" />
        <span className="book-spine-top absolute inset-x-0 top-0 z-[5] h-[3px]" />

        <span className="book-spine-title absolute inset-y-3 left-1/2 z-[6] -translate-x-1/2 overflow-hidden whitespace-nowrap font-display leading-none" style={{ color: ink, fontSize: `${Math.max(7, Math.min(10, width * 0.22))}px`, letterSpacing: ".035em", writingMode: "vertical-rl", transform: "translateX(-50%) rotate(180deg)", textShadow: ink === "#faf7ef" ? "0 1px 2px rgba(0,0,0,.45)" : "0 1px 1px rgba(255,255,255,.35)" }}>{book.title}</span>
        {book.author && <span className="absolute bottom-7 left-1/2 z-[6] -translate-x-1/2 overflow-hidden whitespace-nowrap font-mono uppercase" style={{ color: ink, opacity: .78, fontSize: "4.5px", letterSpacing: ".08em", writingMode: "vertical-rl", transform: "translateX(-50%) rotate(180deg)" }}>{book.author}</span>}
        <span className="absolute bottom-1 left-1/2 z-[6] -translate-x-1/2 whitespace-nowrap font-mono uppercase" style={{ color: ink, opacity: .68, fontSize: "3.2px", letterSpacing: ".16em" }}>AirBooks</span>
      </span>
      {hovered && <span className="book-spine-caption pointer-events-none absolute left-1/2 top-full z-[90] mt-3 w-36 -translate-x-1/2 text-center font-mono text-[7px] uppercase leading-3 tracking-[.12em] text-[#5f574e]">{book.title}{book.author ? <span className="block normal-case tracking-normal text-[#8a8177]">{book.author}</span> : null}</span>}
    </button>
  );
}
