import Link from "next/link";
import { BookOpen, Download, FileText } from "lucide-react";
import type { Book } from "@/lib/api";
import { formatSize, getFileExt, getDownloadUrl } from "@/lib/api";

export function BookCard({ book }: { book: Book }) {
  const ext = getFileExt(book.filename);
  const canRead = ["PDF", "EPUB", "TXT", "MOBI", "AZW3"].includes(ext);

  return (
    <article className="book-card group relative rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      <Link href={`/book/${book.id}`} className="block">
        <div className="aspect-[3/4] bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-brand-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileText className="w-14 h-14 text-slate-300 group-hover:text-brand-400 transition-colors mb-2" />
          <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase bg-white/90 border border-slate-200 px-2 py-0.5 rounded shadow-sm">
            {ext}
          </span>
        </div>
      </Link>

      <div className="p-4 space-y-2">
        <Link href={`/book/${book.id}`}>
          <h3 className="font-semibold text-slate-800 line-clamp-2 leading-snug group-hover:text-brand-600 transition-colors">
            {book.title}
          </h3>
        </Link>
        {book.author && (
          <p className="text-sm text-slate-500 truncate">{book.author}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-slate-400">{formatSize(book.size)}</span>
          <div className="flex items-center gap-1.5">
            {canRead && (
              <Link
                href={`/book/${book.id}/read`}
                className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                title="Read in browser"
              >
                <BookOpen className="w-4 h-4" />
              </Link>
            )}
            <a
              href={getDownloadUrl(book.id)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
              title="Download"
              download
            >
              <Download className="w-4 h-4" />
            </a>
          </div>
        </div>

        {book.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {book.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
