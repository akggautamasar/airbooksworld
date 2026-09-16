"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, Loader2, AlertTriangle } from "lucide-react";
import {
  fetchBook,
  fetchReaderInfo,
  getDownloadUrl,
  getReaderFileUrl,
  getFileExt,
  type Book,
  type ReaderInfo,
} from "@/lib/api";

const AdvancedFileReader = dynamic(
  () => import("@/components/readers/AdvancedFileReader").then((m) => m.AdvancedFileReader),
  { ssr: false }
);
const TextReader = dynamic(
  () => import("@/components/readers/TextReader").then((m) => m.TextReader),
  { ssr: false }
);

export default function ReadPage() {
  const params = useParams<{ id: string }>();
  const bookId = params.id;
  const [book, setBook] = useState<Book | null>(null);
  const [readerInfo, setReaderInfo] = useState<ReaderInfo | null>(null);
  const [readerError, setReaderError] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const poll = useCallback(async () => {
    try {
      const info = await fetchReaderInfo(bookId);
      setReaderInfo(info);
      setReaderError(false);
      return info;
    } catch {
      setReaderError(true);
      return null;
    }
  }, [bookId]);

  useEffect(() => {
    fetchBook(bookId).then(setBook).catch(() => setNotFound(true));
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function loop() {
      const info = await poll();
      if (cancelled) return;
      if (info?.reader_status === "converting") timer = setTimeout(loop, 2500);
    }
    loop();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [poll]);

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-slate-500">Couldn&apos;t find that book.</p>
        <Link href="/" className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:text-brand-500">
          <ArrowLeft className="w-4 h-4" /> Back to library
        </Link>
      </div>
    );
  }

  const ext = book ? getFileExt(book.filename) : null;
  const directViewer = ext === "PDF" || ext === "EPUB";
  const downloadUrl = book ? getDownloadUrl(book.id) : null;

  if (book && directViewer) {
    return <AdvancedFileReader fileUrl={`/api/viewer/${encodeURIComponent(book.id)}`} fileName={book.filename} format={ext} />;
  }

  return (
    <div className="flex h-screen flex-col bg-stone-100">
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white/95 px-4 py-2.5 shadow-sm backdrop-blur z-40">
        <Link href={book ? `/book/${book.id}` : "/"} className="flex min-w-0 items-center gap-2 text-sm text-slate-500 hover:text-brand-600">
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="max-w-[50vw] truncate font-medium text-slate-700">{book?.title || "Loading…"}</span>
        </Link>
        {book && <a href={downloadUrl!} download className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600"><Download className="h-4 w-4" /><span className="hidden sm:inline">Download</span></a>}
      </div>

      <div className="min-h-0 flex-1">
        {!book && <div className="flex h-full items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" /> Loading…</div>}

        {book && readerError && !readerInfo && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <p className="text-slate-700">The in-browser reader could not be prepared for this file.</p>
            <a href={downloadUrl!} download className="mt-2 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"><Download className="h-4 w-4" /> Download instead</a>
          </div>
        )}

        {readerInfo?.reader_status === "converting" && book && (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            <p className="text-slate-700">Converting this book for the reader — usually takes under a minute.</p>
          </div>
        )}

        {readerInfo?.reader_status === "ready" && readerInfo.reader_url && book && readerInfo.reader_format === "txt" && (
          <TextReader fileUrl={getReaderFileUrl(bookId)} />
        )}
      </div>
    </div>
  );
}
