"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2 } from "lucide-react";

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

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => goTo(pageNumber - 1)}
            disabled={pageNumber <= 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goTo(parseInt(pageInput, 10) || 1);
            }}
            className="flex items-center gap-1.5 text-sm text-slate-300"
          >
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => goTo(parseInt(pageInput, 10) || 1)}
              className="w-10 bg-slate-800 border border-slate-700 rounded-md px-1.5 py-1 text-center text-sm focus:outline-none focus:border-brand-500"
              inputMode="numeric"
            />
            <span className="text-slate-500">/ {numPages ?? "…"}</span>
          </form>
          <button
            onClick={() => goTo(pageNumber + 1)}
            disabled={!numPages || pageNumber >= numPages}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setScale((s) => Math.max(0.5, s - 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale((s) => Math.min(2.5, s + 0.15))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Page */}
      <div ref={containerRef} className="flex-1 overflow-auto bg-slate-950/60 flex justify-center py-6">
        <Document
          file={fileUrl}
          onLoadSuccess={onLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-slate-500 py-20">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading PDF…
            </div>
          }
          error={
            <div className="text-slate-500 py-20 text-center px-6">
              Couldn&apos;t render this PDF. Try downloading it instead.
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="shadow-2xl shadow-black/50 rounded-sm overflow-hidden"
            renderAnnotationLayer
            renderTextLayer
          />
        </Document>
      </div>
    </div>
  );
}
