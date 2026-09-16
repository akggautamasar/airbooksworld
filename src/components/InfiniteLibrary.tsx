"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  const sentinel = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const booksRef = useRef(initialBooks);

  const shelves = useMemo(() => {
    const chunks: Book[][] = [];
    for (let i = 0; i < books.length; i += BATCH_SIZE) chunks.push(books.slice(i, i + BATCH_SIZE));
    return chunks;
  }, [books]);

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
      setBooks(current => [...current, ...next]);
      setHasMore(response.books.length === BATCH_SIZE && next.length > 0);
    } catch {
      // Keep the already-loaded shelves usable. The sentinel can retry on a later intersection.
      setHasMore(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [author, hasMore, q, tag]);

  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) loadMore();
    }, { rootMargin: "1200px 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="space-y-12 sm:space-y-16">
      {shelves.map((shelf, index) => (
        <section key={`${index}-${shelf[0]?.id || "shelf"}`} className="library-shelf">
          {index > 0 && <div className="mx-auto mb-3 max-w-6xl px-5 font-mono text-[8px] uppercase tracking-[.32em] text-[#a09486]">Collection · {String(index + 1).padStart(2, "0")}</div>}
          <Shelf books={shelf} />
        </section>
      ))}

      <div ref={sentinel} className="flex min-h-24 items-center justify-center" aria-live="polite">
        {loading && (
          <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-[.28em] text-[#8f8376]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#9e6b52]" />
            Turning the next shelf…
          </div>
        )}
        {!loading && !hasMore && books.length > 0 && (
          <p className="font-mono text-[9px] uppercase tracking-[.28em] text-[#a09486]">End of the archive</p>
        )}
      </div>
    </div>
  );
}
