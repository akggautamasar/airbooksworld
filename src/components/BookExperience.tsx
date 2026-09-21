"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Bookmark, Download, ExternalLink } from "lucide-react";
import type { Book } from "@/lib/api";
import { BookCoverImage } from "@/components/BookCoverImage";
import { getDownloadUrl } from "@/lib/api";

const RETURN_KEY = "airbooks_return_origin";
const SHELF_KEY = "airbooks_shelf";
type Props = { book: Book; ext: string; canRead: boolean; previousId: string | null; nextId: string | null };

export function BookExperience({ book, ext, canRead, previousId: initialPreviousId, nextId: initialNextId }: Props) {
  const [closing, setClosing] = useState(false);
  const [returning, setReturning] = useState(false);
  const [previousId, setPreviousId] = useState(initialPreviousId);
  const [nextId, setNextId] = useState(initialNextId);
  const [navLoading, setNavLoading] = useState(false);

  useEffect(() => {
    document.body.classList.add("airbooks-book-experience");
    return () => document.body.classList.remove("airbooks-book-experience");
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function resolveAdjacent() {
      try {
        const all: Book[] = [];
        let offset = 0;
        let total = Infinity;
        while (offset < total && offset < 5000) {
          const res = await fetch(`/api/books-navigation?limit=100&offset=${offset}`, { cache: "no-store" });
          if (!res.ok) throw new Error("navigation request failed");
          const response = await res.json() as { total?: number; books?: Book[] };
          const books = response.books || [];
          total = response.total || books.length;
          if (!books.length) break;
          all.push(...books);
          offset += books.length;
          if (books.length < 100) break;
        }
        const index = all.findIndex((item) => item.id === book.id);
        if (!cancelled && index >= 0) {
          setPreviousId(index > 0 ? all[index - 1].id : null);
          setNextId(index < all.length - 1 ? all[index + 1].id : null);
        }
      } catch {}
    }
    resolveAdjacent();
    return () => { cancelled = true; };
  }, [book.id]);

  function setOriginFor(bookId: string) {
    try {
      const raw = sessionStorage.getItem(RETURN_KEY);
      const current = raw ? JSON.parse(raw) : null;
      if (current?.scrollLeft !== undefined) sessionStorage.setItem(RETURN_KEY, JSON.stringify({ bookId, scrollLeft: current.scrollLeft, at: Date.now() }));
    } catch {}
  }

  async function navigate(direction: "previous" | "next", knownId: string | null) {
    if (navLoading) return;
    if (knownId) {
      setOriginFor(knownId);
      window.location.href = `/volume/${knownId}`;
      return;
    }
    setNavLoading(true);
    try {
      const all: Book[] = [];
      let offset = 0;
      let total = Infinity;
      while (offset < total && offset < 5000) {
        const res = await fetch(`/api/books-navigation?limit=100&offset=${offset}`, { cache: "no-store" });
        if (!res.ok) throw new Error("navigation request failed");
        const response = await res.json() as { total?: number; books?: Book[] };
        const books = response.books || [];
        total = response.total || books.length;
        if (!books.length) break;
        all.push(...books);
        offset += books.length;
        if (books.length < 100) break;
      }
      const index = all.findIndex((item) => item.id === book.id);
      const target = direction === "previous" ? (index > 0 ? all[index - 1] : null) : (index >= 0 && index < all.length - 1 ? all[index + 1] : null);
      if (target) {
        setOriginFor(target.id);
        window.location.href = `/volume/${target.id}`;
      }
    } catch {} finally {
      setNavLoading(false);
    }
  }

  function shelveIt() {
    if (closing || returning) return;
    setReturning(true);
    try {
      const saved = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]") as string[];
      if (!saved.includes(book.id)) localStorage.setItem(SHELF_KEY, JSON.stringify([...saved, book.id]));
      window.dispatchEvent(new CustomEvent("airbooks:shelf-changed", { detail: { bookId: book.id, shelved: true } }));
    } catch {}
    setClosing(true);
    window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem(RETURN_KEY);
        if (raw && JSON.parse(raw)?.bookId === book.id) {
          // A reader page sits between the volume and the shelf after
          // Read -> Back. history.back() would return to the reader again.
          // Go directly to the library so Shelf can run the physical
          // reshelving animation using the saved origin.
          window.location.href = "/";
          return;
        }
      } catch {}
      window.location.href = "/";
    }, 650);
  }

  const navButton = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc6ba] bg-[#F5F2EB] px-5 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#5d554c] shadow-[0_4px_12px_rgba(44,37,30,.05)] transition-all hover:-translate-y-0.5 hover:bg-white hover:border-[#a99787] active:translate-y-0 disabled:cursor-default disabled:opacity-35";
  const airPagesUrl = `/airpages-book.html?id=${encodeURIComponent(book.id)}`;

  return (
    <main className={`book-experience min-h-screen bg-[#F5F2EB] text-[#241F19] ${closing ? "is-closing" : ""}`}>
      <div className="book-experience-inner mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-12 pt-24 sm:px-10 sm:pt-28 lg:px-12">
        <Link href="/" className="mb-8 inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[.16em] text-[#756c61] transition-colors hover:text-[#241F19] sm:hidden"><ArrowLeft className="h-4 w-4" /> Library</Link>
        <div className="book-experience-cover mx-auto w-full max-w-[420px] sm:max-w-[460px]"><div className="book-experience-cover-image relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[2px] shadow-[18px_25px_45px_rgba(44,37,30,.20)]"><BookCoverImage bookId={book.id} title={book.title} ext={ext} updatedAt={book.updated_at} hasCover={!!book.cover_message_id} /></div></div>
        <section className="book-experience-info mt-12 sm:mt-14">
          <div className="font-mono text-[10px] uppercase tracking-[.34em] text-[#8f877c]">AirBooks collection</div>
          <h1 className="mt-5 max-w-4xl font-display text-[2.7rem] font-normal leading-[.94] tracking-[-.035em] sm:text-6xl lg:text-7xl">{book.title}</h1>
          {book.author && <div className="mt-5 font-display text-xl italic text-[#936d58] sm:text-2xl">{book.author}</div>}
          <p className="mt-7 max-w-3xl text-[15px] leading-7 text-[#6d665e] sm:text-base">{book.description || `${book.title}${book.author ? ` by ${book.author}` : ""}.`}</p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#d9d2c7] pt-6 font-mono text-[10px] uppercase tracking-[.2em] text-[#8c8479]"><span>{ext}</span><span>{new Date(book.uploaded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span><span>{Math.round(book.size / 1024 / 1024 * 10) / 10} MB</span></div>
        </section>
        <div className="book-experience-actions mt-10 border-t border-[#d9d2c7] pt-7">
          <div className="flex flex-wrap items-center gap-3">
            {canRead && <a href={`/book/${book.id}/read`} className="experience-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8f634e] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#fffaf2] shadow-[0_10px_24px_rgba(93,66,51,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#7d5542]"><BookOpen className="h-4 w-4" /> Read</a>}
            {canRead && <a href={airPagesUrl} className="experience-airpages inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#a99787] bg-[#ebe5dc] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#6d5142] shadow-[0_6px_18px_rgba(93,66,51,.08)] transition-all hover:-translate-y-0.5 hover:bg-white" aria-label="Read this book in AirPages"><BookOpen className="h-4 w-4" /> Read in AirPages</a>}
            <a href={getDownloadUrl(book.id)} download className="experience-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc6ba] bg-[#F5F2EB] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#5d554c] transition-colors hover:bg-white"><Download className="h-4 w-4" /> Download</a>
            {ext === "PDF" && <a href={getDownloadUrl(book.id)} target="_blank" rel="noopener noreferrer" className="experience-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc6ba] bg-[#F5F2EB] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#5d554c] transition-colors hover:bg-white"><ExternalLink className="h-4 w-4" /> Open PDF</a>}
          </div>
          <div className="mt-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => navigate("previous", previousId)} disabled={navLoading} className={navButton} aria-label="Previous book"><ArrowLeft className="h-4 w-4" /> Previous</button>
              <button type="button" onClick={() => navigate("next", nextId)} disabled={navLoading} className={navButton} aria-label="Next book">Next <ArrowRight className="h-4 w-4" /></button>
            </div>
            <button type="button" onClick={shelveIt} disabled={closing} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.2em] text-[#8f634e] transition-all hover:-translate-y-0.5 disabled:opacity-50"><Bookmark className="h-4 w-4" /> {returning ? "Shelving…" : "Shelve it"}</button>
          </div>
        </div>
      </div>
    </main>
  );
}