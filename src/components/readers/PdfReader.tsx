"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Keep the worker on the same pdfjs version bundled by react-pdf.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type Props = { fileUrl: string };

export function PdfReader({ fileUrl }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState(1);
  const [fitWidth, setFitWidth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [pageInput, setPageInput] = useState("1");
  const viewerRef = useRef<HTMLDivElement>(null);

  const pageWidth = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    const width = viewerRef.current?.clientWidth ?? window.innerWidth;
    return Math.max(280, Math.min(width - (width < 640 ? 20 : 56), 1100));
  }, [fitWidth, fullscreen]);

  const go = useCallback((delta: number) => {
    setPage((p) => Math.min(Math.max(p + delta, 1), numPages || 1));
  }, [numPages]);

  const submitPage = useCallback(() => {
    const value = Number.parseInt(pageInput, 10);
    if (Number.isFinite(value) && value >= 1 && value <= numPages) {
      setPage(value);
    } else {
      setPageInput(String(page));
    }
  }, [pageInput, numPages, page]);

  useEffect(() => setPageInput(String(page)), [page]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        go(1);
      } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        go(-1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setPage(1);
      } else if (event.key === "End") {
        event.preventDefault();
        if (numPages) setPage(numPages);
      } else if (event.key === "0") {
        setFitWidth(true);
      } else if (event.key === "+" || event.key === "=") {
        setFitWidth(false);
        setScale((s) => Math.min(2.5, +(s + 0.1).toFixed(2)));
      } else if (event.key === "-") {
        setFitWidth(false);
        setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2)));
      } else if (event.key.toLowerCase() === "f") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, numPages]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await viewerRef.current?.requestFullscreen();
    } catch {}
  };

  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setNumPages(0);
    setPage(1);
    setPageInput("1");
  }, [fileUrl]);

  return (
    <div ref={viewerRef} className="flex h-full min-h-0 flex-col bg-[#0a0a0a] text-[#e2e2e2]">
      <div className="flex h-12 shrink-0 items-center gap-1 border-b border-white/[0.08] bg-[#0a0a0a]/95 px-2 backdrop-blur-xl sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
          <button type="button" onClick={() => go(-1)} disabled={page <= 1 || loading} className="reader-btn" aria-label="Previous page" title="Previous page (←)">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#666]">
            <input
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitPage(); }}
              onBlur={submitPage}
              inputMode="numeric"
              aria-label="Page number"
              className="h-7 w-9 rounded border border-white/[0.08] bg-white/[0.05] text-center font-mono text-[11px] text-[#e2e2e2] outline-none focus:border-[#b9f751]"
            />
            <span>/ {numPages || "—"}</span>
          </div>
          <button type="button" onClick={() => go(1)} disabled={page >= numPages || loading} className="reader-btn" aria-label="Next page" title="Next page (→)">
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="mx-1 h-5 w-px bg-white/[0.08]" />
          <button type="button" onClick={() => { setFitWidth(false); setScale((s) => Math.max(0.5, +(s - 0.1).toFixed(2))); }} disabled={loading} className="reader-btn" aria-label="Zoom out"><ZoomOut className="h-4 w-4" /></button>
          <span className="hidden min-w-10 text-center font-mono text-[10px] text-[#666] sm:inline">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => { setFitWidth(false); setScale((s) => Math.min(2.5, +(s + 0.1).toFixed(2))); }} disabled={loading} className="reader-btn" aria-label="Zoom in"><ZoomIn className="h-4 w-4" /></button>
          <button type="button" onClick={() => setFitWidth(true)} className={`reader-btn hidden sm:flex ${fitWidth ? "reader-active" : ""}`} title="Fit width">Fit</button>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="reader-btn hidden sm:flex" title="Open PDF"><ExternalLink className="h-4 w-4" /><span>Open</span></a>
          <a href={fileUrl} download className="reader-btn" title="Download PDF"><Download className="h-4 w-4" /><span className="hidden sm:inline">Save</span></a>
          <button type="button" onClick={() => { setPage(1); setFitWidth(true); }} className="reader-btn hidden sm:flex" title="Reset reader"><RotateCcw className="h-4 w-4" /></button>
          <button type="button" onClick={toggleFullscreen} className="reader-btn reader-active" title="Fullscreen (F)">{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto bg-[#111]" onDoubleClick={() => setFitWidth(true)}>
        <div className="flex min-h-full w-full justify-center px-2 py-3 sm:px-4 sm:py-5">
          <Document
            key={fileUrl}
            file={{ url: fileUrl }}
            loading={<div className="flex h-full min-h-[60vh] items-center justify-center font-mono text-xs text-[#666]">Loading PDF…</div>}
            onLoadSuccess={({ numPages: total }) => { setNumPages(total); setLoading(false); setError(null); }}
            onLoadError={(err) => { setLoading(false); setError(err?.message || "Could not load this PDF."); }}
            error={<div className="flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center"><p className="font-display text-lg text-white/80">Couldn&apos;t open this PDF</p><p className="mt-2 text-xs leading-6 text-[#666]">{error || "The file could not be loaded in the new reader."}</p><a href={fileUrl} target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-md border border-white/10 px-4 py-2 font-mono text-[11px] text-[#b9f751] hover:bg-white/5"><ExternalLink className="h-4 w-4" /> Open original PDF</a></div>}
          >
            {numPages > 0 && (
              <Page
                pageNumber={page}
                width={fitWidth ? pageWidth : undefined}
                scale={fitWidth ? undefined : scale}
                renderTextLayer
                renderAnnotationLayer
                loading={<div className="flex min-h-[60vh] items-center justify-center font-mono text-xs text-[#666]">Rendering page…</div>}
                className="overflow-hidden rounded shadow-[0_10px_60px_rgba(0,0,0,.7)]"
              />
            )}
          </Document>
        </div>
      </div>

      <div className="flex h-9 shrink-0 items-center justify-center border-t border-white/[0.06] bg-[#0a0a0a] font-mono text-[9px] tracking-[0.12em] text-[#3f3f3f]">
        ← → TURN PAGES &nbsp;·&nbsp; HOME / END &nbsp;·&nbsp; F FULLSCREEN
      </div>

      <style jsx>{`
        .reader-btn{height:32px;min-width:32px;padding:0 7px;background:transparent;border:1px solid transparent;border-radius:6px;color:#666;cursor:pointer;font-family:monospace;font-size:10px;display:flex;align-items:center;justify-content:center;gap:4px;white-space:nowrap;transition:all .18s ease;flex-shrink:0}
        .reader-btn:hover{background:rgba(255,255,255,.06);color:#e2e2e2;border-color:rgba(255,255,255,.08)}
        .reader-btn:disabled{opacity:.2;cursor:not-allowed;pointer-events:none}
        .reader-active{background:rgba(185,247,81,.08);color:#b9f751;border-color:rgba(185,247,81,.18)}
        :global(.react-pdf__Page__canvas){display:block!important;height:auto!important;max-width:none!important}
        :global(.react-pdf__Page__textContent){user-select:text}
        @media(max-width:640px){.reader-btn{height:30px;min-width:30px;padding:0 5px}.reader-btn span{display:none}}
      `}</style>
    </div>
  );
}
