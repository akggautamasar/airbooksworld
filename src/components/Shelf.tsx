"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/api";
import { getCoverUrl } from "@/lib/api";
import { BookSpine } from "@/components/BookSpine";

type Rect = { left:number; top:number; width:number; height:number };
type Props = { books: Book[]; onReachEnd?: () => void; loadingMore?: boolean };
const RETURN_KEY = "airbooks_return_origin";
type ReturnOrigin = { bookId:string; rect:Rect; scrollLeft:number; at:number };

export function Shelf({ books, onReachEnd, loadingMore = false }: Props) {
  const rail = useRef<HTMLDivElement>(null);
  const lastScrollLeft = useRef(0);
  const [scrollPos,setScrollPos] = useState(0);
  const [drag,setDrag] = useState<{x:number;scroll:number}|null>(null);
  const [pullout,setPullout] = useState<{book:Book;rect:Rect}|null>(null);
  const [reshelve,setReshelve] = useState<{book:Book;origin:ReturnOrigin}|null>(null);
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

  useEffect(() => {
    let cancelled = false;
    const checkReturn = () => {
      if (cancelled || reshelve) return;
      try {
        const raw = sessionStorage.getItem(RETURN_KEY);
        if (!raw) return;
        const origin = JSON.parse(raw) as ReturnOrigin;
        if (!origin?.bookId || Date.now() - origin.at > 120000) { sessionStorage.removeItem(RETURN_KEY); return; }
        const book = books.find(b => b.id === origin.bookId);
        if (!book) return;
        const el = rail.current;
        if (el && Number.isFinite(origin.scrollLeft)) el.scrollLeft = origin.scrollLeft;
        const nodes = el?.querySelectorAll<HTMLElement>(".carollia-book-hit") || [];
        let target: HTMLElement | null = null;
        nodes.forEach(node => { if (node.dataset.bookId === origin.bookId) target = node; });
        if (!target) return;
        sessionStorage.removeItem(RETURN_KEY);
        const rect = (target as HTMLElement).getBoundingClientRect();
        setReshelve({book,origin:{...origin,rect}});
      } catch {}
    };
    const timers = [80,220,500,900].map(ms => window.setTimeout(checkReturn,ms));
    window.addEventListener("pageshow",checkReturn);
    return () => { cancelled=true; timers.forEach(window.clearTimeout); window.removeEventListener("pageshow",checkReturn); };
  },[books,reshelve]);

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

  function openBook(book:Book,rect:Rect) {
    try { sessionStorage.setItem(RETURN_KEY,JSON.stringify({bookId:book.id,rect,scrollLeft:rail.current?.scrollLeft || 0,at:Date.now()} satisfies ReturnOrigin)); } catch {}
    setPullout({book,rect});
  }

  return <>
    <style>{`\n      @media (max-width: 640px) {\n        .carollia-mobile-shelf .shelf-row { height: 420px !important; min-height: 420px !important; align-items: flex-end; }\n        .carollia-mobile-shelf .carollia-rail-row { column-gap: 2px !important; }\n        .carollia-mobile-shelf .book-spine-hit { width: clamp(30px, calc(var(--book-w) * 1.38), 72px) !important; height: clamp(320px, calc(var(--book-h) * 1.52), 390px) !important; }\n        .carollia-mobile-shelf .carollia-front-cover { width: clamp(70px, 22vw, 105px) !important; }\n        .carollia-mobile-shelf .shelf-rail { padding: 48px 40px 8px !important; perspective: 900px; }\n      }\n    `}</style>
    <div className="carollia-mobile-shelf relative mx-auto my-6 w-full max-w-6xl px-2 sm:px-4">
      <div className="shelf-stage-3d shelf-edge-mask w-full overflow-hidden">
        <div ref={rail} className={`shelf-rail carollia-rail no-scrollbar flex cursor-grab items-end overflow-x-auto select-none ${drag ? "cursor-grabbing" : ""}`} style={{padding:"48px 40px 8px",gap:"0"}} onWheel={wheel} onScroll={e => handleScroll(e.currentTarget)}
          onPointerDown={e => { if (e.button !== 0) return; setDrag({x:e.clientX,scroll:e.currentTarget.scrollLeft}); e.currentTarget.setPointerCapture(e.pointerId); }}
          onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)} onPointerLeave={() => setDrag(null)}>
          <div className="shelf-row carollia-rail-row" style={{columnGap:"2px"}}>
            {books.map((book,idx) => <BookSpine key={book.id} book={book} rotateY={computeRotation(idx)} onOpen={openBook} />)}
            {loadingMore && <div className="flex h-[242px] w-20 shrink-0 items-center justify-center self-end"><span className="h-2 w-2 animate-pulse rounded-full bg-[#9e6b52]" /></div>}
          </div>
          {!books.length && <div className="flex w-full items-center justify-center py-20 font-display text-lg italic text-[#756852]">No volumes found matching your query.</div>}
        </div>
      </div>
      <div className="relative mt-[-1px] w-full px-6 pointer-events-none"><div className="h-px w-full bg-gradient-to-r from-transparent via-[#C5BDAF]/70 to-transparent"/><div className="h-8 w-full bg-gradient-to-b from-black/[0.07] via-black/[0.02] to-transparent blur-[3px]"/></div>
    </div>
    {pullout && <PhysicalBookPullout book={pullout.book} rect={pullout.rect} onCancel={() => setPullout(null)} onOpenDetails={() => router.push(`/book/${pullout.book.id}`)} />}
    {reshelve && <PhysicalBookReshelve book={reshelve.book} origin={reshelve.origin} onDone={() => setReshelve(null)} />}
  </>;
}

function PhysicalBookPullout({book,rect,onCancel,onOpenDetails}:{book:Book;rect:Rect;onCancel:()=>void;onOpenDetails:()=>void}) {
  const [pulled,setPulled] = useState(false);
  const [closing,setClosing] = useState(false);
  const cover = book.cover_message_id ? getCoverUrl(book.id,book.updated_at) : null;
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vpH = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = vpW < 768;
  const targetH = isMobile ? Math.min(vpH * .40,320) : Math.min(vpH * .52,440);
  const scale = targetH / Math.max(1,rect.height);
  const coverW = 178 * scale;
  const targetLeft = (vpW - coverW) / 2;
  const currentY = rect.top + rect.height / 2;
  const deltaX = targetLeft - rect.left;
  const deltaY = (isMobile ? vpH * .32 : vpH * .40) - currentY;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPulled(true));
    const timer = window.setTimeout(onOpenDetails,1100);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  },[]);

  function cancel() { if (closing) return; setClosing(true); window.setTimeout(onCancel,800); }
  const transform = closing ? "translate3d(0,0,0) scale(1) rotateY(0deg)" : pulled ? `translate3d(${deltaX}px,${deltaY}px,260px) scale(${scale}) rotateY(-90deg)` : "translate3d(0,0,0) scale(1) rotateY(0deg)";

  return <div className="fixed inset-0 z-[300] pointer-events-auto" onClick={cancel}>
    <div className={`absolute inset-0 bg-[#FAF8F5]/85 backdrop-blur-md transition-opacity duration-700 ${pulled&&!closing?"opacity-100":"opacity-0"}`} />
    <div className="fixed pointer-events-none z-10" style={{left:rect.left,top:rect.top,width:Math.max(1,rect.width),height:rect.height,perspective:"2200px",perspectiveOrigin:"50% 50%"}}>
      <div className="relative h-full w-full" style={{transformStyle:"preserve-3d",transformOrigin:"center center",transform,transition:"transform 900ms cubic-bezier(.16,1,.3,1)"}}>
        <div className="absolute inset-0 overflow-hidden rounded-[2px] shadow-[0_8px_24px_rgba(0,0,0,.38)]" style={{background:"linear-gradient(105deg,rgba(255,255,255,.2),transparent 18%,rgba(0,0,0,.16) 84%,rgba(0,0,0,.36)),linear-gradient(90deg,#d8d1c4,#806f5e 45%,#3d3027)"}}>
          {cover&&<img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply"/>}<span className="absolute inset-0 spine-cylindrical-sheen"/><span className="absolute inset-y-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-semibold text-[9px] text-[#faf7ef]" style={{writingMode:"vertical-rl",transform:"translateX(-50%) rotate(180deg)"}}>{book.title}</span><span className="absolute inset-y-0 left-[3px] w-px bg-black/30"/><span className="absolute inset-y-0 right-[3px] w-px bg-black/30"/>
        </div>
        <div className="absolute left-full top-0 h-full overflow-hidden rounded-r-sm border border-[#d3c8b8] bg-[#f8f5ee] shadow-[0_15px_35px_rgba(0,0,0,.25)]" style={{width:178,transformOrigin:"left center",transform:"rotateY(90deg)",backfaceVisibility:"hidden"}}>{cover?<img src={cover} alt="" className="h-full w-full object-cover"/>:<div className="h-full w-full bg-gradient-to-br from-[#8f7863] to-[#3f3128]"/>}<div className="absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/35 via-black/10 to-transparent"/><div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/20"/></div>
      </div>
    </div>
    <div className={`absolute bottom-5 left-1/2 z-20 w-full max-w-md -translate-x-1/2 px-4 transition-all duration-500 ${pulled&&!closing?"translate-y-0 opacity-100":"translate-y-5 opacity-0"}`}><div className="rounded-2xl border border-[#dcd4c8] bg-[#FAF8F5]/90 p-4 text-center shadow-xl backdrop-blur-md" onClick={e=>e.stopPropagation()}><div className="font-mono text-[9px] uppercase tracking-[.22em] text-[#8c8478]">Opening volume</div><div className="mt-1 font-display text-xl text-[#29241f] line-clamp-1">{book.title}</div><div className="mt-0.5 font-display italic text-sm text-[#756852]">{book.author}</div><button type="button" onClick={cancel} className="mt-3 rounded-full border border-[#c5bdaf] px-3 py-1.5 font-mono text-[9px] uppercase tracking-[.15em] text-[#51493f] hover:bg-white/70">Cancel</button></div></div>
  </div>;
}

function PhysicalBookReshelve({book,origin,onDone}:{book:Book;origin:ReturnOrigin;onDone:()=>void}) {
  const [returning,setReturning] = useState(false);
  const [finished,setFinished] = useState(false);
  const cover = book.cover_message_id ? getCoverUrl(book.id,book.updated_at) : null;
  const vpW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vpH = typeof window !== "undefined" ? window.innerHeight : 800;
  const isMobile = vpW < 768;
  const target = origin.rect;
  const targetH = isMobile ? Math.min(vpH*.40,320) : Math.min(vpH*.52,440);
  const scale = targetH / Math.max(1,target.height);
  const coverW = 178 * scale;
  const targetLeft = (vpW - coverW) / 2;
  const targetCenterY = target.top + target.height/2;
  const deltaX = targetLeft - target.left;
  const deltaY = (isMobile ? vpH*.32 : vpH*.40) - targetCenterY;

  useEffect(() => {
    const frame = requestAnimationFrame(() => setReturning(true));
    const timer = window.setTimeout(() => { setFinished(true); window.setTimeout(onDone,280); },1050);
    return () => { cancelAnimationFrame(frame); window.clearTimeout(timer); };
  },[]);

  const transform = returning ? "translate3d(0,0,0) scale(1) rotateY(0deg)" : `translate3d(${deltaX}px,${deltaY}px,260px) scale(${scale}) rotateY(-90deg)`;
  return <div className="fixed inset-0 z-[310] pointer-events-none">
    <div className={`absolute inset-0 bg-[#FAF8F5]/75 backdrop-blur-[2px] transition-opacity duration-900 ${finished?"opacity-0":"opacity-100"}`} />
    <div className="fixed pointer-events-none z-10" style={{left:target.left,top:target.top,width:Math.max(1,target.width),height:target.height,perspective:"2200px",perspectiveOrigin:"50% 50%"}}>
      <div className="relative h-full w-full" style={{transformStyle:"preserve-3d",transformOrigin:"center center",transform,transition:"transform 1050ms cubic-bezier(.16,1,.3,1)"}}>
        <div className="absolute inset-0 overflow-hidden rounded-[2px] shadow-[0_18px_45px_rgba(0,0,0,.3)]" style={{background:"linear-gradient(105deg,rgba(255,255,255,.2),transparent 18%,rgba(0,0,0,.16) 84%,rgba(0,0,0,.36)),linear-gradient(90deg,#d8d1c4,#806f5e 45%,#3d3027)"}}>{cover&&<img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 mix-blend-multiply"/>}<span className="absolute inset-0 spine-cylindrical-sheen"/><span className="absolute inset-y-4 left-1/2 -translate-x-1/2 whitespace-nowrap font-display font-semibold text-[9px] text-[#faf7ef]" style={{writingMode:"vertical-rl",transform:"translateX(-50%) rotate(180deg)"}}>{book.title}</span></div>
        <div className="absolute left-full top-0 h-full overflow-hidden rounded-r-sm border border-[#d3c8b8] bg-[#f8f5ee]" style={{width:178,transformOrigin:"left center",transform:"rotateY(90deg)",backfaceVisibility:"hidden"}}>{cover?<img src={cover} alt="" className="h-full w-full object-cover"/>:<div className="h-full w-full bg-gradient-to-br from-[#8f7863] to-[#3f3128]"/>}</div>
      </div>
    </div>
    <div className={`absolute left-1/2 bottom-7 z-20 -translate-x-1/2 rounded-full border border-[#d8cfc2] bg-[#faf8f5]/90 px-4 py-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#766b5e] shadow-lg backdrop-blur-sm transition-all duration-500 ${returning&&!finished?"translate-y-0 opacity-100":"translate-y-3 opacity-0"}`}>Reshelving · {book.title}</div>
  </div>;
}
