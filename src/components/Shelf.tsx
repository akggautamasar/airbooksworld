"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import Link from "next/link";
import { Download, X } from "lucide-react";
import type { Book } from "@/lib/api";
import { getCoverUrl, getDownloadUrl } from "@/lib/api";
import { BookSpine } from "@/components/BookSpine";

type Rect = { left:number; top:number; width:number; height:number };

export function Shelf({ books }:{books:Book[]}) {
  const rail = useRef<HTMLDivElement>(null);
  const [open,setOpen] = useState<{book:Book;rect:Rect}|null>(null);
  const [drag,setDrag] = useState<{x:number;scroll:number}|null>(null);
  const copies = books.length > 24 ? 3 : 1;
  const items = useMemo(() => Array.from({length:copies}, () => books).flat(), [books,copies]);

  useEffect(() => {
    const el = rail.current;
    if (!el || copies !== 3) return;
    requestAnimationFrame(() => { el.scrollLeft = el.scrollWidth / 3; });
  }, [books.length,copies]);

  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const update = () => {
      const rr = el.getBoundingClientRect();
      const center = rr.left + rr.width / 2;
      const half = Math.max(1, rr.width / 2);
      el.querySelectorAll<HTMLElement>(".book-spine-hit").forEach(node => {
        const r = node.getBoundingClientRect();
        const c = r.left + r.width / 2;
        const dist = Math.max(-1, Math.min(1, (c - center) / half));
        const eased = Math.sign(dist) * Math.pow(Math.abs(dist), 1.35);
        node.style.setProperty("--swivel-y", `${(-eased * 34).toFixed(2)}deg`);
        node.style.setProperty("--swivel-z", `${((1-Math.abs(dist))*8).toFixed(1)}px`);
        node.style.setProperty("--swivel-scale", (1 + (1-Math.abs(dist))*0.018).toFixed(3));
      });
    };
    let frame = 0;
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
    update();
    el.addEventListener("scroll",schedule,{passive:true});
    window.addEventListener("resize",schedule,{passive:true});
    return () => { cancelAnimationFrame(frame); el.removeEventListener("scroll",schedule); window.removeEventListener("resize",schedule); };
  },[items.length]);

  function wheel(e:ReactWheelEvent<HTMLDivElement>) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); e.currentTarget.scrollLeft += e.deltaY; }
  }

  function move(e:ReactPointerEvent<HTMLDivElement>) {
    if (!drag) return;
    e.preventDefault();
    e.currentTarget.scrollLeft = drag.scroll - (e.clientX - drag.x) * 1.5;
  }

  function wrap() {
    const el = rail.current;
    if (!el || copies !== 3) return;
    const segment = el.scrollWidth / 3;
    if (el.scrollLeft < segment * .45) el.scrollLeft += segment;
    if (el.scrollLeft > segment * 1.55) el.scrollLeft -= segment;
  }

  return <>
    <div className="relative mx-auto my-6 w-full max-w-6xl px-2 sm:px-4">
      <div className="shelf-stage-3d shelf-edge-mask w-full overflow-hidden">
        <div ref={rail} className={`shelf-rail carollia-rail no-scrollbar flex cursor-grab items-end overflow-x-auto select-none ${drag ? "cursor-grabbing" : ""}`} onWheel={wheel} onScroll={wrap}
          onPointerDown={e => { if (e.button !== 0) return; setDrag({x:e.clientX,scroll:e.currentTarget.scrollLeft}); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
          <div className="shelf-row carollia-rail-row" style={{columnGap:"5px"}}>
            {items.map((book,i) => <BookSpine key={`${book.id}-${i}`} book={book} onOpen={(b,rect) => setOpen({book:b,rect})}/>)}
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
