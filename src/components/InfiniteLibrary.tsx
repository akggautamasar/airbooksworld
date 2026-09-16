"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Book } from "@/lib/api";
import { fetchBooks } from "@/lib/api";
import { Shelf } from "@/components/Shelf";

const BATCH_SIZE = 60;

type Props = {
  initialBooks: Book[];
  q?: string;
  tag?: string;
  author?: string;
};

export function InfiniteLibrary({ initialBooks, q = "", tag = "", author = "" }: Props) {
  const [books, setBooks] = useState<Book[]>(initialBooks);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialBooks.length === BATCH_SIZE);
  const loadingRef = useRef(false);
  const booksRef = useRef(initialBooks);

  useEffect(() => {
    booksRef.current = books;
  }, [books]);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const offset = booksRef.current.length;
      const response = await fetchBooks({ q, tag, author, limit: BATCH_SIZE, offset });
      const existing = new Set(booksRef.current.map(book => book.id));
      const next = response.books.filter(book => !existing.has(book.id));

      if (next.length > 0) {
        booksRef.current = [...booksRef.current, ...next];
        setBooks(booksRef.current);
      }

      setHasMore(response.books.length === BATCH_SIZE && next.length > 0);
    } catch {
      // Keep the current shelf usable; a later scroll can retry.
      setHasMore(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [author, hasMore, q, tag]);

  useEffect(() => {
    if (!hasMore || books.length < BATCH_SIZE) return;
    const id = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(".carollia-rail");
      if (el && el.scrollWidth <= el.clientWidth + 900) loadMore();
    }, 350);
    return () => window.clearTimeout(id);
  }, [books.length, hasMore, loadMore]);

  useEffect(() => {
    booksRef.current = initialBooks;
    setBooks(initialBooks);
    setHasMore(initialBooks.length === BATCH_SIZE);
  }, [initialBooks, q, tag, author]);

  return (
    <div className="w-full">
      <Shelf books={books} onReachEnd={loadMore} loadingMore={loading} />
      <div className="flex min-h-12 items-center justify-center" aria-live="polite">
        {loading && (
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.28em] text-[#8f8376]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#9e6b52]" />
            Adding more volumes…
          </div>
        )}
        {!loading && !hasMore && books.length > 0 && (
          <p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#a09486]">End of the archive</p>
        )}
      </div>
    </div>
  );
}
