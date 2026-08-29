"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  List,
  Loader2,
  X,
} from "lucide-react";

type NavItem = { label: string; href: string; index: number };

/**
 * Reliable EPUB reader inspired by the working BeyondDrive PDFViewer.html.
 * Uses JSZip + chapter extraction instead of epubjs iframe (avoids height/CORS/theme issues).
 */
export function EpubReader({ fileUrl }: { fileUrl: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const generationRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(100);
  const [toc, setToc] = useState<NavItem[]>([]);
  const [tocOpen, setTocOpen] = useState(false);
  const [spine, setSpine] = useState<string[]>([]);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [html, setHtml] = useState("");
  const [zipRef, setZipRef] = useState<any>(null);
  const [opfDir, setOpfDir] = useState("");
  const [chapterLoading, setChapterLoading] = useState(false);

  const parserRef = useRef<DOMParser | null>(null);
  if (typeof window !== "undefined" && !parserRef.current) {
    parserRef.current = new DOMParser();
  }

  const sanitizeCSS = (css: string) => {
    let out = css.replace(/@font-face\s*\{[^}]*\}/gi, "");
    out = out.replace(
      /(body|html|\*)\s*\{[^}]*(background(-color)?:\s*(#[0-9a-fA-F]{3,8}|rgb[^)]+\)|black|dark)[^}]*)\}/gi,
      ""
    );
    out = out.replace(
      /color\s*:\s*(white|#fff|#ffffff|rgba?\([^)]*255[^)]*\))/gi,
      "color:#1e293b"
    );
    return out;
  };

  const loadChapter = useCallback(
    async (zip: any, paths: string[], dir: string, idx: number) => {
      if (idx < 0 || idx >= paths.length) return;
      setChapterLoading(true);
      try {
        const path = paths[idx];
        const file = zip.file(path) || zip.file(decodeURIComponent(path));
        if (!file) {
          setError("Chapter not found in this EPUB.");
          return;
        }
        let chapterHtml: string = await file.async("string");
        const chapterDir = path.includes("/")
          ? path.slice(0, path.lastIndexOf("/") + 1)
          : "";

        const imgMatches = [...chapterHtml.matchAll(/src=["']([^"'#?]+)["']/g)];
        await Promise.all(
          imgMatches
            .filter((m) => !m[1].startsWith("data:") && !m[1].startsWith("http"))
            .map(async (m) => {
              const ip = chapterDir + m[1];
              const img = zip.file(ip) || zip.file(decodeURIComponent(ip));
              if (!img) return;
              const b64 = await img.async("base64");
              const mt = /\.png$/i.test(ip)
                ? "image/png"
                : /\.gif$/i.test(ip)
                ? "image/gif"
                : /\.svg$/i.test(ip)
                ? "image/svg+xml"
                : /\.webp$/i.test(ip)
                ? "image/webp"
                : "image/jpeg";
              chapterHtml = chapterHtml.replace(m[0], `src="data:${mt};base64,${b64}"`);
            })
        );

        const cssMatches = [...chapterHtml.matchAll(/href=["']([^"']+\.css[^"']*)["']/g)];
        const cssParts = await Promise.all(
          cssMatches.map(async (m) => {
            const cp = chapterDir + m[1].split("?")[0];
            const cf = zip.file(cp) || zip.file(decodeURIComponent(cp));
            if (!cf) return "";
            return sanitizeCSS(await cf.async("string")) + "\n";
          })
        );
        const iStyle = cssParts.join("");

        const parser = parserRef.current;
        if (!parser) {
          setHtml(chapterHtml);
          setChapterIndex(idx);
          return;
        }

        const parsed = parser.parseFromString(chapterHtml, "text/html");
        parsed.querySelectorAll('link[rel="stylesheet"]').forEach((el) => el.remove());
        parsed.querySelectorAll("style").forEach((el) => {
          el.textContent = sanitizeCSS(el.textContent || "");
        });
        const body = parsed.body ? parsed.body.innerHTML : chapterHtml;
        setHtml((iStyle ? `<style>${iStyle}</style>` : "") + body);
        setChapterIndex(idx);
        scrollRef.current?.scrollTo({ top: 0 });
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to render chapter");
      } finally {
        setChapterLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!fileUrl) return;
    let cancelled = false;
    const gen = ++generationRef.current;

    async function init() {
      setLoading(true);
      setError(null);
      setHtml("");
      setToc([]);
      setSpine([]);
      setChapterIndex(0);

      try {
        const JSZip = (await import("jszip")).default;
        const res = await fetch(fileUrl);
        if (!res.ok) {
          throw new Error(
            res.status === 0
              ? "Could not load file (CORS). Use same-origin or proxy."
              : `Failed to load EPUB (${res.status})`
          );
        }
        const ab = await res.arrayBuffer();
        if (cancelled || gen !== generationRef.current) return;

        const zip = await JSZip.loadAsync(ab);
        if (cancelled || gen !== generationRef.current) return;

        const containerFile = zip.file("META-INF/container.xml");
        if (!containerFile) throw new Error("Invalid EPUB: missing container.xml");

        const cont = await containerFile.async("string");
        const parser = parserRef.current!;
        const contDoc = parser.parseFromString(cont, "text/xml");
        const rootfile = contDoc.querySelector("rootfile");
        const opfPath = rootfile?.getAttribute("full-path");
        if (!opfPath) throw new Error("Invalid EPUB: no package path");

        const dir = opfPath.includes("/")
          ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
          : "";
        setOpfDir(dir);

        const opfXml = await zip.file(opfPath)!.async("string");
        const opfDoc = parser.parseFromString(opfXml, "text/xml");

        const mani: Record<string, string> = {};
        opfDoc.querySelectorAll("manifest item").forEach((item) => {
          const id = item.getAttribute("id");
          const href = item.getAttribute("href");
          if (id && href) mani[id] = href;
        });

        const spinePaths: string[] = [];
        opfDoc.querySelectorAll("spine itemref").forEach((ref) => {
          const idref = ref.getAttribute("idref");
          const h = idref ? mani[idref] : null;
          if (h) spinePaths.push(dir + h);
        });

        if (spinePaths.length === 0) {
          throw new Error("This EPUB has no readable chapters.");
        }

        const tocItems: NavItem[] = [];
        const ncxId = opfDoc.querySelector("spine")?.getAttribute("toc");
        if (ncxId && mani[ncxId]) {
          try {
            const ncxPath = dir + mani[ncxId];
            const ncxXml = await zip.file(ncxPath)?.async("string");
            if (ncxXml) {
              const ncxDoc = parser.parseFromString(ncxXml, "text/xml");
              ncxDoc.querySelectorAll("navPoint").forEach((np) => {
                const label =
                  np.querySelector("navLabel text")?.textContent?.trim() || "Untitled";
                const src = np.querySelector("content")?.getAttribute("src");
                if (!src) return;
                const hrefOnly = src.split("#")[0];
                const full = dir + hrefOnly;
                const idx = spinePaths.findIndex(
                  (p) => p === full || p.endsWith(hrefOnly) || decodeURIComponent(p) === full
                );
                if (idx >= 0) tocItems.push({ label, href: full, index: idx });
              });
            }
          } catch {
            /* ignore */
          }
        }

        if (tocItems.length === 0) {
          spinePaths.forEach((p, i) => {
            const name =
              p.split("/").pop()?.replace(/\.(x?html?)$/i, "") || `Chapter ${i + 1}`;
            tocItems.push({
              label: name.replace(/[-_]/g, " "),
              href: p,
              index: i,
            });
          });
        }

        setZipRef(zip);
        setSpine(spinePaths);
        setToc(tocItems);
        await loadChapter(zip, spinePaths, dir, 0);
        if (cancelled || gen !== generationRef.current) return;
        setLoading(false);
      } catch (e: any) {
        console.error("[EpubReader]", e);
        if (!cancelled && gen === generationRef.current) {
          setError(e?.message || "Couldn't render this EPUB. Try downloading it instead.");
          setLoading(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [fileUrl, loadChapter]);

  const go = (dir: number) => {
    if (!zipRef || spine.length === 0) return;
    const next = chapterIndex + dir;
    if (next < 0 || next >= spine.length) return;
    loadChapter(zipRef, spine, opfDir, next);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (tocOpen) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterIndex, spine, zipRef, tocOpen]);

  const progress =
    spine.length > 0 ? Math.round(((chapterIndex + 1) / spine.length) * 100) : 0;

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-500 py-20 text-center px-6">
        <p className="text-slate-600">{error}</p>
        <a href={fileUrl} download className="text-sm text-brand-600 hover:underline font-medium">
          Download file instead
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 relative bg-stone-100">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-stone-200 bg-white/90 backdrop-blur shrink-0 shadow-sm">
        <button
          type="button"
          onClick={() => setTocOpen((v) => !v)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm text-slate-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
        >
          <List className="w-4 h-4" />
          Contents
        </button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 hidden sm:inline tabular-nums">
            {spine.length > 0
              ? `Ch. ${chapterIndex + 1} / ${spine.length} · ${progress}%`
              : "—"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.max(70, s - 10))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              aria-label="Decrease font size"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 w-10 text-center tabular-nums">
              {fontSize}%
            </span>
            <button
              type="button"
              onClick={() => setFontSize((s) => Math.min(180, s + 10))}
              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
              aria-label="Increase font size"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 overflow-hidden">
        {(loading || chapterLoading) && (
          <div className="absolute inset-0 z-20 flex items-center justify-center gap-2 text-slate-500 bg-stone-100/80">
            <Loader2 className="w-5 h-5 animate-spin text-brand-500" />
            {loading ? "Loading book…" : "Loading chapter…"}
          </div>
        )}

        <div ref={scrollRef} className="h-full overflow-y-auto overflow-x-hidden">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24">
            <article
              className="epub-page bg-white rounded-xl shadow-lg shadow-stone-300/40 border border-stone-200/80 px-6 sm:px-12 py-10 sm:py-14"
              style={{ fontSize: `${fontSize}%` }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          </div>

          {spine.length > 1 && !loading && (
            <div className="flex items-center justify-center gap-4 pb-10 px-4">
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={chapterIndex <= 0}
                className="flex items-center gap-2 h-10 px-4 rounded-xl border border-stone-200 bg-white text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Prev chapter
              </button>
              <span className="text-xs text-slate-400 tabular-nums">
                {chapterIndex + 1} / {spine.length}
              </span>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={chapterIndex >= spine.length - 1}
                className="flex items-center gap-2 h-10 px-4 rounded-xl border border-stone-200 bg-white text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 disabled:opacity-30 disabled:pointer-events-none shadow-sm transition-colors"
              >
                Next chapter
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {tocOpen && (
          <>
            <div
              className="absolute inset-0 z-20 bg-black/20"
              onClick={() => setTocOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 w-72 max-w-[85%] bg-white border-r border-stone-200 shadow-2xl flex flex-col z-30">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 shrink-0">
                <span className="text-sm font-semibold text-slate-800">Contents</span>
                <button
                  type="button"
                  onClick={() => setTocOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-stone-100"
                  aria-label="Close contents"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-2">
                {toc.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-slate-400">
                    No table of contents in this file.
                  </p>
                ) : (
                  toc.map((item, i) => (
                    <button
                      key={`${item.href}-${i}`}
                      type="button"
                      onClick={() => {
                        if (zipRef) loadChapter(zipRef, spine, opfDir, item.index);
                        setTocOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                        item.index === chapterIndex
                          ? "bg-brand-50 text-brand-700 font-medium"
                          : "text-slate-600 hover:bg-stone-50 hover:text-brand-600"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
