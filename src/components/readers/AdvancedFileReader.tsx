"use client";

import { useEffect, useRef, useState } from "react";
import JSZip from "jszip";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  FileText,
} from "lucide-react";

// pdf.js is loaded from the same version used by the supplied PDFViewer.html.
type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
};
type PdfDocument = { numPages: number; getPage: (page: number) => Promise<PdfPage> };
type PdfLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (options: { data: ArrayBuffer; cMapUrl?: string; cMapPacked?: boolean }) => { promise: Promise<PdfDocument> };
};

declare global {
  interface Window {
    pdfjsLib?: PdfLib;
    __airbooksPdfPromise?: Promise<PdfLib>;
  }
}

const PDF_JS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
const PDF_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const PDF_CMAPS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/";

function loadPdfJs(): Promise<PdfLib> {
  if (typeof window === "undefined") return Promise.reject(new Error("PDF viewer requires a browser"));
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (window.__airbooksPdfPromise) return window.__airbooksPdfPromise;

  window.__airbooksPdfPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${PDF_JS}"]`);
    if (existing) {
      const timer = window.setInterval(() => {
        if (window.pdfjsLib) {
          window.clearInterval(timer);
          resolve(window.pdfjsLib);
        }
      }, 30);
      window.setTimeout(() => {
        window.clearInterval(timer);
        if (!window.pdfjsLib) reject(new Error("PDF.js failed to load"));
      }, 20000);
      return;
    }
    const script = document.createElement("script");
    script.src = PDF_JS;
    script.async = true;
    script.onload = () => window.pdfjsLib ? resolve(window.pdfjsLib) : reject(new Error("PDF.js loaded without its API"));
    script.onerror = () => reject(new Error("Could not load PDF.js"));
    document.head.appendChild(script);
  });
  return window.__airbooksPdfPromise;
}

type Props = {
  fileUrl: string;
  fileName?: string;
  format: "PDF" | "EPUB";
};

type EpubState = {
  zip: JSZip;
  spine: string[];
  current: number;
};

function resolveZipPath(base: string, href: string) {
  const clean = href.split("#")[0].split("?")[0];
  const parts = `${base}${clean}`.split("/");
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") out.pop();
    else out.push(part);
  }
  return out.join("/");
}

function sanitizeEpubHtml(html: string, css: string) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, iframe, object, embed, form").forEach((el) => el.remove());
  doc.querySelectorAll("link[rel=stylesheet]").forEach((el) => el.remove());
  doc.querySelectorAll("style").forEach((el) => {
    el.textContent = el.textContent?.replace(/@font-face\s*\{[^}]*\}/gi, "") || "";
  });
  return `${css ? `<style>${css}</style>` : ""}${doc.body?.innerHTML || html}`;
}

export function AdvancedFileReader({ fileUrl, fileName = "document", format }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<PdfDocument | null>(null);
  const epubRef = useRef<EpubState | null>(null);
  const renderId = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [scale, setScale] = useState(1);
  const [epubHtml, setEpubHtml] = useState("");

  const renderPdf = async (doc: PdfDocument, number: number, requestedScale = scale) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const id = ++renderId.current;
    const pdfPage = await doc.getPage(number);
    if (id !== renderId.current) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const viewport = pdfPage.getViewport({ scale: requestedScale * dpr });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    canvas.style.width = `${viewport.width / dpr}px`;
    canvas.style.height = `${viewport.height / dpr}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create PDF canvas");
    await pdfPage.render({ canvasContext: ctx, viewport }).promise;
    if (id !== renderId.current) return;
    setPage(number);
    viewerRef.current?.scrollTo({ top: 0, behavior: "auto" });
  };

  const fitPdf = async (doc: PdfDocument) => {
    const first = await doc.getPage(1);
    const viewport = first.getViewport({ scale: 1 });
    const viewer = viewerRef.current;
    const width = (viewer?.clientWidth || window.innerWidth) - 32;
    const height = (viewer?.clientHeight || window.innerHeight) - 80;
    const next = Math.min(width / viewport.width, height / viewport.height, 3);
    setScale(next);
    await renderPdf(doc, pdfRef.current ? page : 1, next);
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(fileUrl, { cache: "no-store" });
        if (!response.ok) throw new Error(`File request failed (${response.status})`);
        const data = await response.arrayBuffer();
        if (cancelled) return;

        if (format === "PDF") {
          const pdfjs = await loadPdfJs();
          pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER;
          const doc = await pdfjs.getDocument({ data: data.slice(0), cMapUrl: PDF_CMAPS, cMapPacked: true }).promise;
          if (cancelled) return;
          pdfRef.current = doc;
          setTotal(doc.numPages);
          const first = await doc.getPage(1);
          const vp = first.getViewport({ scale: 1 });
          const width = (viewerRef.current?.clientWidth || window.innerWidth) - 32;
          const height = (viewerRef.current?.clientHeight || window.innerHeight) - 80;
          const fit = Math.min(width / vp.width, height / vp.height, 3);
          setScale(fit);
          await renderPdf(doc, 1, fit);
        } else {
          const zip = await JSZip.loadAsync(data);
          const containerFile = zip.file("META-INF/container.xml");
          if (!containerFile) throw new Error("Invalid EPUB: container.xml is missing");
          const container = new DOMParser().parseFromString(await containerFile.async("string"), "text/xml");
          const root = container.querySelector("rootfile")?.getAttribute("full-path");
          if (!root) throw new Error("Invalid EPUB: OPF package is missing");
          const opfDir = root.includes("/") ? root.slice(0, root.lastIndexOf("/") + 1) : "";
          const opf = new DOMParser().parseFromString(await zip.file(root)!.async("string"), "text/xml");
          const manifest = new Map<string, string>();
          opf.querySelectorAll("manifest item").forEach((item) => {
            const id = item.getAttribute("id");
            const href = item.getAttribute("href");
            if (id && href) manifest.set(id, href);
          });
          const spine = Array.from(opf.querySelectorAll("spine itemref"))
            .map((item) => manifest.get(item.getAttribute("idref") || ""))
            .filter(Boolean)
            .map((href) => resolveZipPath(opfDir, href!));
          if (!spine.length) throw new Error("EPUB has no readable chapters");
          epubRef.current = { zip, spine, current: 0 };
          setTotal(spine.length);

          const renderChapter = async (index: number) => {
            const state = epubRef.current;
            if (!state || index < 0 || index >= state.spine.length) return;
            const path = state.spine[index];
            const file = state.zip.file(path) || state.zip.file(decodeURIComponent(path));
            if (!file) throw new Error("EPUB chapter not found");
            let html = await file.async("string");
            const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
            const doc = new DOMParser().parseFromString(html, "text/html");

            const imageNodes = Array.from(doc.querySelectorAll("img"));
            await Promise.all(imageNodes.map(async (img) => {
              const src = img.getAttribute("src");
              if (!src || src.startsWith("data:") || src.startsWith("http")) return;
              const image = state.zip.file(resolveZipPath(dir, src));
              if (!image) return;
              const bytes = await image.async("base64");
              const lower = src.toLowerCase();
              const mime = lower.endsWith(".png") ? "image/png" : lower.endsWith(".gif") ? "image/gif" : lower.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
              img.setAttribute("src", `data:${mime};base64,${bytes}`);
            }));

            let css = "";
            const links = Array.from(doc.querySelectorAll("link[rel=stylesheet]"));
            for (const link of links) {
              const href = link.getAttribute("href");
              if (!href) continue;
              const cssFile = state.zip.file(resolveZipPath(dir, href.split("?")[0]));
              if (cssFile) css += `${await cssFile.async("string")}\n`;
            }
            css = css.replace(/@font-face\s*\{[^}]*\}/gi, "");
            css = css.replace(/background(?:-color)?\s*:\s*(?:black|#000(?:000)?|rgb\([^)]*\))/gi, "background:transparent");
            css = css.replace(/color\s*:\s*(?:white|#fff(?:fff)?)/gi, "color:#111");
            setEpubHtml(sanitizeEpubHtml(doc.documentElement.outerHTML, css));
            state.current = index;
            setPage(index + 1);
            viewerRef.current?.scrollTo({ top: 0, behavior: "auto" });
          };

          await renderChapter(0);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unable to open this file");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      renderId.current++;
    };
  }, [fileUrl, format]);

  const go = async (direction: number) => {
    if (format === "PDF" && pdfRef.current) {
      const next = page + direction;
      if (next < 1 || next > total) return;
      await renderPdf(pdfRef.current, next, scale);
    } else if (format === "EPUB" && epubRef.current) {
      const next = epubRef.current.current + direction;
      if (next < 0 || next >= epubRef.current.spine.length) return;
      // Reuse the loaded component by changing the EPUB state through a small local loader.
      const state = epubRef.current;
      const path = state.spine[next];
      const file = state.zip.file(path) || state.zip.file(decodeURIComponent(path));
      if (!file) return;
      const html = await file.async("string");
      const doc = new DOMParser().parseFromString(html, "text/html");
      const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/") + 1) : "";
      await Promise.all(Array.from(doc.querySelectorAll("img")).map(async (img) => {
        const src = img.getAttribute("src");
        if (!src || src.startsWith("data:") || src.startsWith("http")) return;
        const image = state.zip.file(resolveZipPath(dir, src));
        if (!image) return;
        const b64 = await image.async("base64");
        const lower = src.toLowerCase();
        const mime = lower.endsWith(".png") ? "image/png" : lower.endsWith(".gif") ? "image/gif" : lower.endsWith(".svg") ? "image/svg+xml" : "image/jpeg";
        img.setAttribute("src", `data:${mime};base64,${b64}`);
      }));
      let css = "";
      for (const link of Array.from(doc.querySelectorAll("link[rel=stylesheet]"))) {
        const href = link.getAttribute("href");
        if (!href) continue;
        const cssFile = state.zip.file(resolveZipPath(dir, href.split("?")[0]));
        if (cssFile) css += `${await cssFile.async("string")}\n`;
      }
      state.current = next;
      setEpubHtml(sanitizeEpubHtml(doc.documentElement.outerHTML, css));
      setPage(next + 1);
      viewerRef.current?.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  const zoom = (factor: number) => {
    if (format !== "PDF" || !pdfRef.current) return;
    const next = Math.min(Math.max(scale * factor, 0.15), 6);
    setScale(next);
    void renderPdf(pdfRef.current, page, next);
  };

  const fullscreen = () => {
    if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
    else void document.exitFullscreen();
  };

  const download = () => {
    const a = document.createElement("a");
    a.href = fileUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-[#0a0a0a] text-[#e2e2e2]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
      <div className="flex h-12 shrink-0 items-center border-b border-white/[0.08] bg-[#0a0a0a]/95 px-2.5 backdrop-blur-xl max-sm:h-11">
        <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
          <FileText className="h-4 w-4 shrink-0 text-[#b9f751]" />
          <span className="truncate text-xs font-semibold text-white/80 max-sm:hidden">{fileName}</span>
          <span className="rounded border border-white/[0.08] bg-[#111] px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-white/45">{format}</span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button className="h-8 w-8 rounded-md text-white/55 hover:bg-white/[0.06] disabled:opacity-20" onClick={() => void go(-1)} disabled={page <= 1} aria-label="Previous page"><ChevronLeft className="mx-auto h-4 w-4" /></button>
          <div className="flex items-center gap-1 text-[11px] text-white/45">
            <input className="h-7 w-9 rounded border border-white/[0.08] bg-white/[0.05] text-center text-xs text-white outline-none focus:border-[#b9f751]" type="number" min={1} max={total} value={page} onChange={(e) => { const n = Number(e.target.value); if (n >= 1 && n <= total) void (format === "PDF" ? renderPdf(pdfRef.current!, n, scale) : go(n - page)); }} />
            <span>/ {total || "—"}</span>
          </div>
          <button className="h-8 w-8 rounded-md text-white/55 hover:bg-white/[0.06] disabled:opacity-20" onClick={() => void go(1)} disabled={page >= total} aria-label="Next page"><ChevronRight className="mx-auto h-4 w-4" /></button>

          {format === "PDF" && (
            <>
              <span className="mx-1 h-5 w-px bg-white/[0.08]" />
              <button className="h-8 w-8 rounded-md text-white/55 hover:bg-white/[0.06]" onClick={() => zoom(1 / 1.2)} aria-label="Zoom out"><Minus className="mx-auto h-4 w-4" /></button>
              <span className="w-10 text-center text-[10px] text-white/45">{Math.round(scale * 100)}%</span>
              <button className="h-8 w-8 rounded-md text-white/55 hover:bg-white/[0.06]" onClick={() => zoom(1.2)} aria-label="Zoom in"><Plus className="mx-auto h-4 w-4" /></button>
            </>
          )}
        </div>

        <div className="flex flex-1 justify-end gap-1">
          <a className="hidden h-8 items-center gap-1.5 rounded-md px-2 text-[10px] text-white/50 hover:bg-white/[0.06] hover:text-white sm:flex" href={fileUrl} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" />Open</a>
          <button className="h-8 rounded-md px-2 text-[10px] text-white/50 hover:bg-white/[0.06] hover:text-white" onClick={download}><Download className="mr-1 inline h-3.5 w-3.5" />Save</button>
          <button className="h-8 w-8 rounded-md bg-[#b9f751]/10 text-[#b9f751] hover:bg-[#b9f751]/15" onClick={fullscreen} aria-label="Fullscreen"><Maximize2 className="mx-auto h-3.5 w-3.5" /></button>
        </div>
      </div>

      <div ref={viewerRef} className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[#0a0a0a]">
        {loading && <div className="flex min-h-full items-center justify-center text-xs text-white/45">Loading {format}…</div>}
        {error && !loading && <div className="flex min-h-full flex-col items-center justify-center gap-3 px-6 text-center"><div className="text-sm text-white/70">Couldn&apos;t open this {format}.</div><div className="max-w-md text-xs text-white/35">{error}</div><a href={fileUrl} download className="rounded-md border border-white/10 px-4 py-2 text-xs text-white/60 hover:bg-white/5">Download file</a></div>}
        {format === "PDF" && <canvas ref={canvasRef} className={`mx-auto my-4 block rounded-[3px] bg-white shadow-[0_4px_60px_rgba(0,0,0,.8)] ${loading || error ? "hidden" : ""}`} />}
        {format === "EPUB" && !loading && !error && (
          <article className="mx-auto my-4 min-h-full w-full max-w-[760px] bg-[#faf9f7] px-4 py-8 text-[15px] leading-[1.85] text-[#111] shadow-[0_4px_60px_rgba(0,0,0,.75)] sm:px-16 sm:py-14 sm:text-[18px] [&_h1]:font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:leading-tight [&_h1]:text-[#0a0a0a] [&_h2]:font-sans [&_h2]:font-bold [&_h2]:text-[#0a0a0a] [&_p]:mb-4 [&_a]:text-blue-700 [&_a]:underline [&_img]:mx-auto [&_img]:my-6 [&_img]:max-w-full [&_img]:rounded" dangerouslySetInnerHTML={{ __html: epubHtml }} />
        )}
      </div>
    </div>
  );
}
