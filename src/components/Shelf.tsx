"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/api";
import { BookSpine } from "@/components/BookSpine";

type Props = { books: Book[]; onReachEnd?: () => void; loadingMore?: boolean };

export function Shelf({ books, onReachEnd, loadingMore = false }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const lastScrollLeft = useRef(0);
  const [scrollPos,setScrollPos] = useState(0);
  const [drag,setDrag] = useState<{x:number;scroll:number}|null>(null);
  const router = useRouter();

  const computeRotation = useCallback((index:number) => {
    const el = rail.current;
    if (!el) return 0;
    const nodes = el.querySelectorAll<HTMLElement>(".carollia-book-hit");
    const node = nodes[index];
    if (!node) return 0;
    const railRect = el.getBoundingClientRect();
    const bookRect = node.getBoundingClientRect();
    const center = railRect.left + railRect.width / 2;
    const bookCenter = bookRect.left + bookRect.width / 2;
    const distance = Math.max(-1, Math.min(1, (bookCenter - center) / Math.max(1, railRect.width / 2)));
    const eased = Math.sign(distance) * Math.pow(Math.abs(distance), 1.35);
    return Math.round(-eased * 34);
  },[scrollPos]);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    el.querySelectorAll<HTMLElement>(".carollia-front-cover").forEach(node => node.style.setProperty("--cover-angle","90deg"));
    lastScrollLeft.current = el.scrollLeft;
  },[books.length]);

  function animateCovers(direction:number) {
    const el = rail.current;
    if (!el) return;
    const angle = direction > 0 ? "52deg" : "90deg";
    el.querySelectorAll<HTMLElement>(".carollia-front-cover").forEach(node => node.style.setProperty("--cover-angle",angle));
  }

  function checkEnd(el:HTMLDivElement) {
    if (!onReachEnd || loadingMore) return;
    const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    if (remaining <= Math.max(900,el.clientWidth * 1.5)) onReachEnd();
  }

  function handleScroll(el:HTMLDivElement) {
    const delta = el.scrollLeft - lastScrollLeft.current;
    if (Math.abs(delta) > .5) animateCovers(delta);
    lastScrollLeft.current = el.scrollLeft;
    setScrollPos(el.scrollLeft);
    checkEnd(el);
  }

  function wheel(e:ReactWheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }
    handleScroll(e.currentTarget);
  }

  function move(e:ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    e.preventDefault();
    e.currentTarget.scrollLeft = drag.scroll - (e.clientX - drag.x) * 1.5;
    handleScroll(e.currentTarget);
  }

  return <>
    <style>{`\n      @media (max-width: 640px) {\n        .carollia-mobile-shelf .shelf-row { height: 420px !important; min-height: 420px !important; align-items: flex-end; }\n        .carollia-mobile-shelf .carollia-rail-row { column-gap: 2px !important; }\n        .carollia-mobile-shelf .book-spine-hit { width: clamp(30px, calc(var(--book-w) * 1.38), 72px) !important; height: clamp(320px, calc(var(--book-h) * 1.52), 390px) !important; }\n        .carollia-mobile-shelf .carollia-front-cover { width: clamp(70px, 22vw, 105px) !important; }\n        .carollia-mobile-shelf .shelf-rail { padding: 48px 40px 8px !important; perspective: 900px; }\n      }\n    `}</style>
    <div className="carollia-mobile-shelf relative mx-auto my-6 w-full max-w-6xl px-2 sm:px-4">
      <div className="shelf-stage-3d shelf-edge-mask w-full overflow-hidden">
        <div ref={rail} className={`shelf-rail carollia-rail no-scrollbar flex cursor-grab items-end overflow-x-auto select-none ${drag ? "cursor-grabbing" : ""}`} style={{padding:"48px 40px 8px",gap:"0"}} onWheel={wheel} onScroll={e => handleScroll(e.currentTarget)}
          onPointerDown={e => { if (e.button !== 0) return; setDrag({x:e.clientX,scroll:e.currentTarget.scrollLeft}); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
          <div className="shelf-row carollia-rail-row" style={{columnGap:"2px"}}>
            {books.map((book,idx) => <BookSpine key={book.id} book={book} rotateY={computeRotation(idx)} onOpen={() => router.push(`/book/${book.id}/read`)} />)}
            {loadingMore && <div className="flex h-[242px] w-20 shrink-0 items-center justify-center self-end"><span className="h-2 w-2 animate-pulse rounded-full bg-[#9e6b52]" /></div>}
          </div>
          {!books.length && <div className="flex w-full items-center justify-center py-20 font-display text-lg italic text-[#756852]">No volumes found matching your query.</div>}
        </div>
      </div>
      <div className="relative mt-[-1px] w-full px-6 pointer-events-none"><div className="h-px w-full bg-gradient-to-r from-transparent via-[#C5BDAF]/70 to-transparent"/><div className="h-8 w-full bg-gradient-to-b from-black/[0.07] via-black/[0.02] to-transparent blur-[3px]"/></div>
    </div>
  </>;
}
