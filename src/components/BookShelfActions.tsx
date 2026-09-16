"use client";

import { useEffect, useState } from "react";
import { BookOpen, Bookmark, BookmarkCheck } from "lucide-react";
import Link from "next/link";
import type { Book } from "@/lib/api";

const SHELF_KEY = "airbooks_shelf";

export function BookShelfActions({ book, canRead }: { book: Book; canRead: boolean }) {
  const [shelved, setShelved] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]") as string[];
      setShelved(saved.includes(book.id));
    } catch {}
  }, [book.id]);

  function toggleShelf() {
    try {
      const saved = JSON.parse(localStorage.getItem(SHELF_KEY) || "[]") as string[];
      const next = saved.includes(book.id) ? saved.filter((id) => id !== book.id) : [...saved, book.id];
      localStorage.setItem(SHELF_KEY, JSON.stringify(next));
      setShelved(next.includes(book.id));
      window.dispatchEvent(new CustomEvent("airbooks:shelf-changed", { detail: { bookId: book.id, shelved: next.includes(book.id) } }));
    } catch {}
  }

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      {canRead && (
        <Link href={`/book/${book.id}/read`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors shadow-lg shadow-brand-600/25">
          <BookOpen className="w-4 h-4" />
          Read this book
        </Link>
      )}
      <button type="button" onClick={toggleShelf} className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors border shadow-sm ${shelved ? "border-brand-200 bg-brand-50 text-brand-700" : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-brand-50"}`}>
        {shelved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        {shelved ? "Shelved" : "Shelve this book"}
      </button>
    </div>
  );
}
