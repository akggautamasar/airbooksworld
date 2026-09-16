"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, Maximize2, ZoomIn, ZoomOut } from "lucide-react";

/**
 * Browser-native PDF reader.
 *
 * Using an iframe here is intentional: the PDF is served by the separate
 * BeyondBooks backend. A native browser PDF viewer does not require the
 * frontend to fetch the PDF through JavaScript/CORS, so it is much more
 * reliable for cross-origin PDF files than react-pdf.
 */
export function PdfReader({ fileUrl }: { fileUrl: string }) {
  const [scale, setScale] = useState(1);

  return (
    <div className="flex flex-col h-full min-h-0 bg-stone-100">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-200 bg-white/95 backdrop-blur shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => setScale((s) => Math.max(0.7, +(s - 0.1).toFixed(1)))} disabled={scale <= 0.7} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 transition-colors" aria-label="Zoom out">
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-12 text-center tabular-nums">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => setScale((s) => Math.min(1.5, +(s + 0.1).toFixed(1)))} disabled={scale >= 1.5} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 disabled:opacity-30 transition-colors" aria-label="Zoom in">
            <ZoomIn className="w-4 h-4" />
          </button>
          <button type="button" onClick={() => setScale(1)} className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors" aria-label="Fit to screen" title="Fit to screen">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">Open PDF</span>
          </a>
          <a href={fileUrl} download className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download</span>
          </a>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden bg-stone-200">
        <iframe
          key={fileUrl}
          src={fileUrl}
          title="PDF reader"
          className="absolute inset-0 h-full w-full border-0 bg-white"
          style={{ transform: `scale(${scale})`, transformOrigin: "top center", width: `${100 / scale}%`, height: `${100 / scale}%` }}
          allow="fullscreen"
        />
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
          Use the PDF viewer controls to turn pages
        </div>
      </div>
    </div>
  );
}
