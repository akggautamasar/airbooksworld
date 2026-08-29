"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, List, Loader2, X } from "lucide-react";

type NavItem = { label: string; href: string };

export function EpubReader({ fileUrl }: { fileUrl: string }) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<any>(null);
  const bookRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const EpubCtor = (await import("epubjs")).default;
      if (cancelled || !viewerRef.current) return;

      const book = EpubCtor(fileUrl);
      bookRef.current = book;

      const rendition = book.renderTo(viewerRef.current, {
        width: "100%",
        height: "100%",
        flow: "paginated",
        spread: "auto",
      });
      renditionRef.current = rendition;

      rendition.themes.default({
        body: {
          background: "transparent !important",
          color: "#e2e8f0 !important",
        },
        "::selection": { background: "rgba(12,140,233,0.35)" },
      });
      rendition.themes.fontSize(`${fontSize}%`);

      rendition.on("relocated", (location: any) => {
        if (location?.start?.percentage != null) {
          setProgress(Math.round(location.start.percentage * 100));
        }
      });

      try {
        await rendition.display();
        if (cancelled) return;
        setLoading(false);
      } catch {
        if (!cancelled) setError(true);
        return;
      }

      book.loaded.navigation.then((nav: any) => {
        if (cancelled) return;
        setToc((nav?.toc || []).map((t: any) => ({ label: t.label?.trim() || "Untitled", href: t.href })));
      });
    }

    init().catch(() => !cancelled && setError(true));

    return () => {
      cancelled = true;
      try {
        bookRef.current?.destroy?.();
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileUrl]);

  useEffect(() => {
    renditionRef.current?.themes?.fontSize(`${fontSize}%`);
  }, [fontSize]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 py-20 text-center px-6">
        Couldn&apos;t render this EPUB. Try downloading it instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <button
          onClick={() => setTocOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-300 hover:text-brand-400 hover:bg-slate-800 transition-colors"
        >
          <List className="w-4 h-4" />
          Contents
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline">{progress}%</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setFontSize((s) => Math.max(70, s - 10))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
              aria-label="Decrease font size"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 w-10 text-center">{fontSize}%</span>
            <button
              onClick={() => setFontSize((s) => Math.min(180, s + 10))}
              className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
              aria-label="Increase font size"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Reading area */}
      <div className="flex-1 relative overflow-hidden">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-slate-500">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading book…
          </div>
        )}
        <div ref={viewerRef} className="h-full" />

        <button
          onClick={() => renditionRef.current?.prev?.()}
          className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-600 hover:text-brand-400 hover:bg-slate-900/40 transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => renditionRef.current?.next?.()}
          className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center text-slate-600 hover:text-brand-400 hover:bg-slate-900/40 transition-colors"
          aria-label="Next page"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Table of contents drawer */}
        {tocOpen && (
          <div className="absolute inset-y-0 left-0 w-72 max-w-[80%] bg-slate-900 border-r border-slate-800 shadow-2xl shadow-black/50 flex flex-col z-10">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-200">Contents</span>
              <button
                onClick={() => setTocOpen(false)}
                className="p-1 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              {toc.length === 0 && (
                <p className="px-4 py-3 text-sm text-slate-500">No table of contents in this file.</p>
              )}
              {toc.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    renditionRef.current?.display?.(item.href);
                    setTocOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-brand-300 transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
