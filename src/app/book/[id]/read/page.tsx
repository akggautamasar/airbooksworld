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

const PdfReader = dynamic(
  () => import("@/components/readers/PdfReader").then((m) => m.PdfReader),
  { ssr: false }
);
const EpubReader = dynamic(
  () => import("@/components/readers/EpubReader").then((m) => m.EpubReader),
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
      // PDF files do not need the server-side reader conversion endpoint.
      // Keep the page alive so the PDF can be rendered directly from the
      // normal download endpoint instead of incorrectly showing "not found".
      setReaderError(true);
      return null;
    }
  }, [bookId]);

  useEffect(() => {
    fetchBook(bookId)
      .then(setBook)
      .catch(() => setNotFound(true));
  }, [bookId]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function loop() {
      const info = await poll();
      if (cancelled) return;
      if (info?.reader_status === "converting") {
        timer = setTimeout(loop, 2500);
      }
    }
    loop();

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [poll]);

  if (notFound) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 text-center">
        <p className="text-slate-500">Couldn&apos;t find that book.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 mt-4 text-brand-600 hover:text-brand-500"
        >
          <ArrowLeft className="w-4 h-4" /> Back to library
        </Link>
      </div>
    );
  }

  const ext = book ? getFileExt(book.filename) : null;
  const isPdf = ext === "PDF";
  const downloadUrl = book ? getDownloadUrl(book.id) : null;

  return (
    <div className="flex flex-col h-screen bg-stone-100">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-200 bg-white/95 backdrop-blur shadow-sm shrink-0 z-40">
        <Link
          href={book ? `/book/${book.id}` : "/"}
          className="flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 transition-colors min-w-0"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span className="truncate max-w-[50vw] font-medium text-slate-700">
            {book?.title || "Loading…"}
          </span>
        </Link>
        {book && (
          <a
            href={getDownloadUrl(book.id)}
            download
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-brand-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        )}
      </div>

      <div className="flex-1 min-h-0">
        {!book && (
          <div className="h-full flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> Loading…
          </div>
        )}

        {book && isPdf && (
          <PdfReader fileUrl={downloadUrl!} />
        )}

        {book && !isPdf && readerError && !readerInfo && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 px-6 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <p className="text-slate-700">
              The in-browser reader could not be prepared for this file.
            </p>
            <a
              href={downloadUrl!}
              download
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download instead
            </a>
          </div>
        )}

        {readerInfo?.reader_status === "converting" && book && !isPdf && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 px-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
            <p className="text-slate-700">
              Converting this book for the reader — usually takes under a minute.
            </p>
            <p className="text-sm text-slate-400">
              You can leave this open; it&apos;ll switch over automatically.
            </p>
          </div>
        )}

        {readerInfo?.reader_status === "failed" && book && !isPdf && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 px-6 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <p className="text-slate-700">
              Couldn&apos;t prepare this book for the in-browser reader.
            </p>
            <a
              href={downloadUrl!}
              download
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download instead
            </a>
          </div>
        )}

        {readerInfo?.reader_status === "unsupported" && book && !isPdf && (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-500 px-6 text-center">
            <p className="text-slate-700">
              This file type doesn&apos;t support in-browser reading yet.
            </p>
            <a
              href={downloadUrl!}
              download
              className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" /> Download instead
            </a>
          </div>
        )}

        {readerInfo?.reader_status === "ready" && readerInfo.reader_url && book && !isPdf && (
          <>
            {readerInfo.reader_format === "epub" && (
              <EpubReader fileUrl={getReaderFileUrl(bookId)} />
            )}
            {readerInfo.reader_format === "txt" && (
              <TextReader fileUrl={getReaderFileUrl(bookId)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
