import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Download,
  BookOpen,
  FileText,
  Calendar,
  HardDrive,
  Tag,
  User,
  ExternalLink,
} from "lucide-react";
import { fetchBook, formatSize, getDownloadUrl, getFileExt } from "@/lib/api";

type Props = { params: { id: string } };

export async function generateMetadata({ params }: Props) {
  try {
    const book = await fetchBook(params.id);
    return {
      title: `${book.title} — AirBooks`,
      description: book.description || `Download ${book.title} by ${book.author}`,
    };
  } catch {
    return { title: "Book — AirBooks" };
  }
}

export default async function BookPage({ params }: Props) {
  let book;
  try {
    book = await fetchBook(params.id);
  } catch {
    notFound();
  }

  const ext = getFileExt(book.filename);
  const downloadUrl = getDownloadUrl(book.id);
  const canRead = ["PDF", "EPUB", "TXT", "MOBI", "AZW3"].includes(ext);
  const uploaded = new Date(book.uploaded_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors mb-8"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to library
      </Link>

      <div className="grid md:grid-cols-[240px_1fr] gap-8">
        <div className="aspect-[3/4] rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex flex-col items-center justify-center shadow-lg shadow-slate-200/60">
          <FileText className="w-20 h-20 text-slate-300 mb-3" />
          <span className="text-xs font-bold tracking-widest text-slate-500 uppercase bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm">
            {ext}
          </span>
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 leading-tight">
              {book.title}
            </h1>
            {book.author && (
              <p className="mt-2 text-lg text-slate-500 flex items-center gap-2">
                <User className="w-4 h-4" />
                {book.author}
              </p>
            )}
          </div>

          {book.description && (
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">
              {book.description}
            </p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <HardDrive className="w-4 h-4" />
              {formatSize(book.size)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              {uploaded}
            </span>
            {book.language && (
              <span className="uppercase tracking-wide text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {book.language}
              </span>
            )}
          </div>

          {book.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Tag className="w-4 h-4 text-slate-400" />
              {book.tags.map((t) => (
                <Link
                  key={t}
                  href={`/?tag=${encodeURIComponent(t)}`}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-brand-50 hover:text-brand-700 transition-colors"
                >
                  {t}
                </Link>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {canRead && (
              <Link
                href={`/book/${book.id}/read`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-colors shadow-lg shadow-brand-600/25"
              >
                <BookOpen className="w-4 h-4" />
                Open in Viewer
              </Link>
            )}
            <a
              href={downloadUrl}
              download
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-colors ${
                canRead
                  ? "border border-slate-200 hover:border-slate-300 text-slate-700 bg-white shadow-sm"
                  : "bg-brand-600 hover:bg-brand-500 text-white shadow-lg shadow-brand-600/25"
              }`}
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            {ext === "PDF" && (
              <a
                href={downloadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-white font-medium transition-colors shadow-sm"
              >
                <ExternalLink className="w-4 h-4" />
                Open in browser
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
