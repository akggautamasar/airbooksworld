import { Suspense } from "react";
import { fetchBooks, fetchTags } from "@/lib/api";
import { BookCard } from "@/components/BookCard";
import { SearchBar } from "@/components/SearchBar";
import { BookOpen, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type Props = {
  searchParams: { q?: string; tag?: string; author?: string; page?: string };
};

// Matches the backend's per-request cap (utils/books_routes.py: limit ≤ 200)
// so a page here always maps to exactly one backend call.
const PAGE_SIZE = 60;

export default async function HomePage({ searchParams }: Props) {
  const q = searchParams.q || "";
  const tag = searchParams.tag || "";
  const author = searchParams.author || "";
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  let books: Awaited<ReturnType<typeof fetchBooks>>["books"] = [];
  let total = 0;
  let tags: string[] = [];
  let error: string | null = null;

  try {
    const [booksRes, tagsRes] = await Promise.all([
      fetchBooks({ q, tag, author, limit: PAGE_SIZE, offset }),
      fetchTags(),
    ]);
    books = booksRes.books;
    total = booksRes.total;
    tags = tagsRes;
  } catch (e: any) {
    error = e?.message || "Failed to load books. Is the backend running?";
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    if (author) params.set("author", author);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <section className="text-center space-y-4 py-6">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Your free ebook library
        </h1>
        <p className="text-slate-500 max-w-lg mx-auto">
          Browse, read and download PDFs &amp; EPUBs. All files stored securely
          on Telegram.
        </p>
        <div className="flex justify-center pt-2">
          <Suspense fallback={<div className="h-11 w-full max-w-xl rounded-xl bg-slate-200 animate-pulse" />}>
            <SearchBar />
          </Suspense>
        </div>
      </section>

      {/* Tags filter */}
      {tags.length > 0 && (
        <section className="flex flex-wrap items-center gap-2 justify-center">
          <Tag className="w-4 h-4 text-slate-500" />
          <Link
            href="/"
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !tag
                ? "border-brand-300 bg-brand-50 text-brand-700"
                : "border-slate-200 text-slate-500 hover:border-slate-600"
            }`}
          >
            All
          </Link>
          {tags.slice(0, 20).map((t) => (
            <Link
              key={t}
              href={`/?tag=${encodeURIComponent(t)}`}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                tag === t
                  ? "border-brand-300 bg-brand-50 text-brand-700"
                  : "border-slate-200 text-slate-500 hover:border-slate-600"
              }`}
            >
              {t}
            </Link>
          ))}
        </section>
      )}

      {/* Results info */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {error
            ? "—"
            : total > 0
            ? `Showing ${offset + 1}–${Math.min(offset + books.length, total)} of ${total} book${total !== 1 ? "s" : ""}`
            : "0 books"}
        </span>
        {(q || tag || author) && (
          <Link href="/" className="text-brand-400 hover:underline">
            Clear filters
          </Link>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center space-y-2">
          <p className="text-amber-800 font-medium">Could not load library</p>
          <p className="text-sm text-amber-700/80">{error}</p>
          <p className="text-xs text-slate-500 pt-2">
            Make sure <code className="text-slate-500">NEXT_PUBLIC_API_URL</code>{" "}
            points to your backend and <code className="text-slate-500">BOOKS_CHANNEL</code> is set.
          </p>
        </div>
      )}

      {/* Empty */}
      {!error && books.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3">
          <BookOpen className="w-12 h-12 text-slate-400 mx-auto" />
          <p className="text-slate-700 font-medium">No books yet</p>
          <p className="text-sm text-slate-500">
            {q || tag
              ? "Try a different search."
              : "Upload your first PDF or EPUB to get started."}
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
          >
            Upload a book
          </Link>
        </div>
      )}

      {/* Grid */}
      {books.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}

      {/* Pagination — every book beyond PAGE_SIZE lived only past this
          point before: the page always requested the same fixed window
          and nothing let you reach the rest. */}
      {!error && totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2 pt-4">
          <Link
            href={pageHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={`p-2 rounded-lg border ${
              page <= 1
                ? "border-slate-100 text-slate-300 pointer-events-none"
                : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
          <span className="text-sm text-slate-500 px-2">
            Page {page} of {totalPages}
          </span>
          <Link
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={`p-2 rounded-lg border ${
              page >= totalPages
                ? "border-slate-100 text-slate-300 pointer-events-none"
                : "border-slate-200 text-slate-500 hover:border-brand-300 hover:text-brand-600"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </nav>
      )}
    </div>
  );
}
