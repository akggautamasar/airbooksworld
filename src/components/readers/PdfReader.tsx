"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Loader2,
  Maximize2,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export function PdfReader({ fileUrl }: { fileUrl: string }) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.1);
  const [pageInput, setPageInput] = useState("1");
  const containerRef = useRef<HTMLDivElement>(null);

  const onLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  }, []);

  useEffect(() => {
    setPageInput(String(pageNumber));
  }, [pageNumber]);

  const goTo = (n: number) => {
    if (!numPages) return;
    const clamped = Math.min(Math.max(1, n), numPages);
    setPageNumber(clamped);
    containerRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        goTo(pageNumber + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        goTo(pageNumber - 1);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setScale((s) => Math.min(2.5, s + 0.15));
      } else if (e.key === "-") {
        e.preventDefault();
        setScale((s) => Math.max(0.5, s - 0.15));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, numPages]);

  const fitWidth = () => {
    if (!containerRef.current) return;
    const w = containerRef.current.clientWidth - 48;
    setScale(Math.max(0.5, Math.min(2.5, w / 612)));
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-stone-100">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-200 bg-white/90 backdrop-blur shrink-0 shadow-sm">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => goTo(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goTo(parseInt(pageInput, 10) || 1);
            }}
            className="flex items-center gap-1.5 text-sm text-slate-600"
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => goTo(parseInt(pageInput, 10) || 1)}
              className="w-11 bg-stone-50 border border-stone-200 rounded-md px-1.5 py-1 text-center text-sm focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
              inputMode="numeric"
            />
            <span className="text-slate-400">/ {numPages ?? "…"}</span>
          </form>
          <button
            type="button"
            onClick={() => goTo(pageNumber + 1)}
            disabled={!numPages || pageNumber >= numPages}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={fitWidth}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            aria-label="Fit width"
            title="Fit width"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 overflow-auto flex justify-center py-6 px-3">
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-slate-500 py-20">
              <Loader2 className="w-5 h-5 animate-spin text-brand-500" /> Loading PDF…
            </div>
          }
          error={
            <div className="text-slate-500 py-20 text-center px-6 space-y-2">
              <p>Couldn&apos;t render this PDF. Try downloading it instead.</p>
              <a href={fileUrl} download className="text-sm text-brand-600 hover:underline font-medium">
                Download
              </a>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-xl shadow-stone-400/30 rounded-sm overflow-hidden bg-white"
            renderAnnotationLayer
            renderTextLayer
          />
        </Document>
      </div>
    </div>
  );
}
