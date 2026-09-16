"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bookmark, BookmarkCheck, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Book } from "@/lib/api";

const SHELF_KEY = "airbooks_shelf";
const RETURN_KEY = "airbooks_return_origin";

type ReturnOrigin = { bookId:string; rect:{left:number;top:number;width:number;height:number}; scrollLeft:number; at:number };

export function BookShelfActions({ book, canRead }: { book: Book; canRead: boolean }) {
  const [shelved, setShelved] = useState(false);
  const [returning, setReturning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]") as string[];
      setShelved(saved.includes(book.id));
    } catch {}
  }, [book.id]);

  function toggleShelf() {
    if (returning) return;
    try {
      const saved = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]") as string[];
      const wasShelved = saved.includes(book.id);
      if (wasShelved) {
        const next = saved.filter((id) => id !== book.id);
        localStorage.setItem(SHELF_KEY, JSON.stringify(next));
        setShelved(false);
        window.dispatchEvent(new CustomEvent("airbooks:shelf-changed", { detail: { bookId: book.id, shelved: false } }));
        return;
      }

      const next = [...saved, book.id];
      localStorage.setItem(SHELF_KEY, JSON.stringify(next));
      setShelved(true);
      window.dispatchEvent(new CustomEvent("airbooks:shelf-changed", { detail: { bookId: book.id, shelved: true } }));

      let hasOrigin = false;
      try {
        const raw = sessionStorage.getItem(RETURN_KEY);
        if (raw) {
          const origin = JSON.parse(raw) as ReturnOrigin;
          hasOrigin = origin.bookId === book.id && Date.now() - origin.at < 120000;
        }
      } catch {}

      if (hasOrigin) {
        setReturning(true);
        window.setTimeout(() => router.back(), 180);
      }
    } catch {}
  }

  function clearReturnOrigin() {
    try { sessionStorage.removeItem(RETURN_KEY); } catch {}
  }

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {canRead && (
        <Link href={`/book/${book.id}/read`} onClick={clearReturnOrigin} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors shadow-lg shadow-brand-600/25">
          <BookOpen className="w-4 h-4" />
          Read this book
        </Link>
      )}
      <button type="button" disabled={returning} onClick={toggleShelf} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all border shadow-sm ${returning ? "border-[#c8b9a7] bg-[#f2ece4] text-[#77695a]" : shelved ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"}`}>
        {returning ? <RotateCcw className="w-4 h-4 animate-spin" /> : shelved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        {returning ? "Returning to shelf…" : shelved ? "Shelved" : "Shelve this book"}
      </button>
    </div>
  );
}
