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

export function BookExperience({ book, ext, canRead, previousId, nextId }: Props) {
  const [closing, setClosing] = useState(false);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    document.body.classList.add("airbooks-book-experience");
    return () => document.body.classList.remove("airbooks-book-experience");
  }, []);

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
          window.history.back();
          return;
        }
      } catch {}
      window.location.href = "/";
    }, 650);
  }

  function clearOrigin() {
    try { sessionStorage.removeItem(RETURN_KEY); } catch {}
  }

  return (
    <main className={`book-experience min-h-screen bg-[#F5F2EB] text-[#241F19] ${closing ? "is-closing" : ""}`}>
      <div className="book-experience-inner mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pb-12 pt-24 sm:px-10 sm:pt-28 lg:px-12">
        <Link href="/" onClick={clearOrigin} className="mb-8 inline-flex w-fit items-center gap-2 font-mono text-[11px] uppercase tracking-[.16em] text-[#756c61] transition-colors hover:text-[#241F19] sm:hidden">
          <ArrowLeft className="h-4 w-4" /> Library
        </Link>

        <div className="book-experience-cover mx-auto w-full max-w-[420px] sm:max-w-[460px]">
          <div className="book-experience-cover-image relative mx-auto aspect-[3/4] w-full overflow-hidden rounded-[2px] shadow-[18px_25px_45px_rgba(44,37,30,.20)]">
            <BookCoverImage bookId={book.id} title={book.title} ext={ext} updatedAt={book.updated_at} hasCover={!!book.cover_message_id} />
          </div>
        </div>

        <section className="book-experience-info mt-12 sm:mt-14">
          <div className="font-mono text-[10px] uppercase tracking-[.34em] text-[#8f877c]">AirBooks collection</div>
          <h1 className="mt-5 max-w-4xl font-display text-[2.7rem] font-normal leading-[.94] tracking-[-.035em] sm:text-6xl lg:text-7xl">{book.title}</h1>
          {book.author && <div className="mt-5 font-display text-xl italic text-[#936d58] sm:text-2xl">{book.author}</div>}
          <p className="mt-7 max-w-3xl text-[15px] leading-7 text-[#6d665e] sm:text-base">
            {book.description || `${book.title}${book.author ? ` by ${book.author}` : ""}.`}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-3 border-t border-[#d9d2c7] pt-6 font-mono text-[10px] uppercase tracking-[.2em] text-[#8c8479]">
            <span>{ext}</span><span>{new Date(book.uploaded_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span><span>{Math.round(book.size / 1024 / 1024 * 10) / 10} MB</span>
          </div>
        </section>

        <div className="book-experience-actions mt-10 border-t border-[#d9d2c7] pt-7">
          <div className="flex flex-wrap items-center gap-3">
            {canRead && <Link href={`/book/${book.id}/read`} className="experience-primary inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#8f634e] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#fffaf2] shadow-[0_10px_24px_rgba(93,66,51,.16)] transition-all hover:-translate-y-0.5 hover:bg-[#7d5542]">
              <BookOpen className="h-4 w-4" /> Read
            </Link>}
            <a href={getDownloadUrl(book.id)} download className="experience-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc6ba] bg-[#F5F2EB] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#5d554c] transition-colors hover:bg-white"><Download className="h-4 w-4" /> Download</a>
            {ext === "PDF" && <a href={getDownloadUrl(book.id)} target="_blank" rel="noopener noreferrer" className="experience-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#cfc6ba] bg-[#F5F2EB] px-6 py-3 font-mono text-[10px] uppercase tracking-[.18em] text-[#5d554c] transition-colors hover:bg-white"><ExternalLink className="h-4 w-4" /> Open PDF</a>}
          </div>

          <div className="mt-8 flex items-center justify-between gap-4 font-mono text-[10px] uppercase tracking-[.2em] text-[#6f665c]">
            <div className="flex items-center gap-5">
              {previousId ? <Link href={`/book/${previousId}`} onClick={clearOrigin} className="inline-flex items-center gap-2 transition-colors hover:text-[#9a6c55]"><ArrowLeft className="h-4 w-4" /> Previous</Link> : <span className="opacity-30">Previous</span>}
              {nextId ? <Link href={`/book/${nextId}`} onClick={clearOrigin} className="inline-flex items-center gap-2 transition-colors hover:text-[#9a6c55]">Next <ArrowRight className="h-4 w-4" /></Link> : <span className="opacity-30">Next</span>}
            </div>
            <button type="button" onClick={shelveIt} disabled={closing} className="inline-flex items-center gap-2 text-[#8f634e] transition-all hover:-translate-y-0.5 disabled:opacity-50">
              <Bookmark className="h-4 w-4" /> {returning ? "Shelving…" : "Shelve it"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
