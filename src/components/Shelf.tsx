"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import type { Book } from "@/lib/api";
import { getCoverUrl, getDownloadUrl } from "@/lib/api";
import { BookSpine } from "@/components/BookSpine";

type Rect = { left:number; top:number; width:number; height:number };

type Props = {
  books: Book[];
  onReachEnd?: () => void;
  loadingMore?: boolean;
};

export function Shelf({ books, onReachEnd, loadingMore = false }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const lastScrollLeft = useRef(0);
  const [open,setOpen] = useState<{book:Book;rect:Rect}|null>(null);
  const [drag,setDrag] = useState<{x:number;scroll:number}|null>(null);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;

    const closeCovers = () => {
      el.querySelectorAll<HTMLElement>(".carollia-front-cover").forEach(node => {
        node.style.setProperty("--cover-angle", "90deg");
      });
    };

    closeCovers();
    lastScrollLeft.current = el.scrollLeft;
    return () => closeCovers();
  },[books.length]);

  function animateCovers(direction:number) {
    const el = rail.current;
    if (!el) return;
    const angle = direction > 0 ? "52deg" : "90deg";
    el.querySelectorAll<HTMLElement>(".carollia-front-cover").forEach(node => {
      node.style.setProperty("--cover-angle", angle);
    });
  }

  function checkEnd(el: HTMLDivElement) {
    if (!onReachEnd || loadingMore) return;
    const remaining = el.scrollWidth - (el.scrollLeft + el.clientWidth);
    if (remaining <= Math.max(900, el.clientWidth * 1.5)) onReachEnd();
  }

  function handleScroll(el: HTMLDivElement) {
    const delta = el.scrollLeft - lastScrollLeft.current;
    if (Math.abs(delta) > 0.5) animateCovers(delta);
    lastScrollLeft.current = el.scrollLeft;
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
    <style>{`\n      @media (max-width: 640px) {\n        .carollia-mobile-shelf .shelf-row {\n          height: 286px !important;\n          min-height: 286px !important;\n          align-items: flex-end;\n        }\n        .carollia-mobile-shelf .book-spine-hit {\n          width: clamp(22px, calc(var(--book-w) * .76), 40px) !important;\n          height: clamp(210px, var(--book-h), 258px) !important;\n        }\n        .carollia-mobile-shelf .carollia-front-cover {\n          width: clamp(72px, 24vw, 108px) !important;\n        }\n        .carollia-mobile-shelf .shelf-rail {\n          padding-bottom: 10px !important;\n          perspective: 760px;\n        }\n      }\n    `}</style>
    <div className="carollia-mobile-shelf relative mx-auto my-6 w-full max-w-6xl px-2 sm:px-4">
      <div className="shelf-stage-3d shelf-edge-mask w-full overflow-hidden">
        <div ref={rail} className={`shelf-rail carollia-rail no-scrollbar flex cursor-grab items-end overflow-x-auto select-none ${drag ? "cursor-grabbing" : ""}`} onWheel={wheel} onScroll={e => { handleScroll(e.currentTarget); }}
          onPointerDown={e => { if (e.button !== 0) return; setDrag({x:e.clientX,scroll:e.currentTarget.scrollLeft}); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
          <div className="shelf-row carollia-rail-row" style={{columnGap:"8px"}}>
            {books.map(book => <BookSpine key={book.id} book={book} onOpen={(b,rect) => setOpen({book:b,rect})}/>)}
            {loadingMore && <div className="flex h-[242px] w-20 shrink-0 items-center justify-center self-end"><span className="h-2 w-2 animate-pulse rounded-full bg-[#9e6b52]" /></div>}
          </div>
          {!books.length && <div className="flex w-full items-center justify-center py-20 font-display text-lg italic text-[#756852]">No volumes found matching your query.</div>}
        </div>
      </div>
      <div className="relative mt-[-1px] w-full px-6 pointer-events-none"><div className="h-px w-full bg-gradient-to-r from-transparent via-[#C5BDAF]/70 to-transparent"/><div className="h-8 w-full bg-gradient-to-b from-black/[0.07] via-black/[0.02] to-transparent blur-[3px]"/></div>
    </div>
    {open && <BookDetail book={open.book} rect={open.rect} onClose={() => setOpen(null)}/>} 
  </>;
}

function BookDetail({book,rect,onClose}:{book:Book;rect:Rect;onClose:()=>void}) {
  const [ready,setReady] = useState(false); const [failed,setFailed] = useState(false);
  useEffect(() => { const id=requestAnimationFrame(()=>setReady(true)); const key=(e:KeyboardEvent)=>{if(e.key==="Escape")onClose()}; window.addEventListener("keydown",key); return()=>{cancelAnimationFrame(id);window.removeEventListener("keydown",key)}; },[onClose]);
  const cover=book.cover_message_id&&!failed?getCoverUrl(book.id,book.updated_at):null;
  return <div className="fixed inset-0 z-[200] bg-[#24211d]/65 backdrop-blur-xl transition-opacity duration-500" onClick={onClose}>
    <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-8" onClick={e=>e.stopPropagation()}>
      <button aria-label="Close" onClick={onClose} className="absolute right-5 top-5 z-40 grid h-9 w-9 place-items-center rounded-full border border-white/50 bg-[#FAF8F5]/80 text-[#4d453c] hover:bg-white"><X className="h-4 w-4"/></button>
      <div className={`detail-card w-full max-w-4xl grid md:grid-cols-[minmax(210px,330px)_1fr] gap-8 md:gap-12 items-center ${ready?"detail-open":""}`} style={{"--origin-x":`${rect.left+rect.width/2}px`,"--origin-y":`${rect.top+rect.height/2}px`} as CSSProperties}>
        <div className="detail-cover-wrap">{cover?<img src={cover} alt={`Cover of ${book.title}`} onError={()=>setFailed(true)} className="detail-cover"/>:<div className="detail-cover detail-fallback"><span>{book.title}</span><small>{book.author}</small></div>}</div>
        <div className="rounded-2xl border border-[#d4cbc0] bg-[#FAF8F5]/95 p-7 sm:p-10 shadow-[0_30px_90px_rgba(34,29,24,.18)]">
          <div className="font-mono text-[9px] uppercase tracking-[.22em] text-[#93897d]">AIRBOOKS · {book.filename.split(".").pop()?.toUpperCase()}</div>
          <h2 className="mt-4 font-display text-4xl leading-[.95] text-[#29241f] sm:text-5xl">{book.title}</h2>
          {book.author&&<p className="mt-3 font-sans text-lg text-[#70675d]">{book.author}</p>}{book.description&&<p className="mt-6 max-h-40 overflow-auto font-sans text-[15px] leading-7 text-[#625a51]">{book.description}</p>}
          <div className="mt-6 flex flex-wrap gap-2">{book.tags.map(t=><span key={t} className="rounded-full border border-[#cfc6bb] px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-[#756c62]">{t}</span>)}</div>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={`/book/${book.id}`} onClick={onClose} className="rounded-full bg-[#29241f] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[.16em] text-[#f7f3ed]">Open details</Link><Link href={`/book/${book.id}/read`} onClick={onClose} className="rounded-full border border-[#bdb3a8] px-5 py-2.5 font-mono text-[10px] uppercase tracking-[.16em] text-[#4f473f]">Read</Link><a href={getDownloadUrl(book.id)} onClick={onClose} download className="inline-flex items-center gap-2 rounded-full border border-[#bdb3a8] px-4 py-2.5 font-mono text-[10px] uppercase tracking-[.16em] text-[#4f473f]"><Download className="h-3.5 w-3.5"/>Download</a></div>
        </div>
      </div>
    </div>
  </div>;
}
