"use client";

import { useEffect, useState } from "react";
import { Minus, Plus, Loader2 } from "lucide-react";

export function TextReader({ fileUrl }: { fileUrl: string }) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  useEffect(() => {
    let cancelled = false;
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("failed");
        return res.text();
      })
      .then((t) => !cancelled && setText(t))
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 py-20 text-center px-6">
        Couldn&apos;t load this file. Try downloading it instead.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-end gap-1 px-4 py-2.5 border-b border-slate-800 bg-slate-900/70 backdrop-blur">
        <button
          onClick={() => setFontSize((s) => Math.max(12, s - 2))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
          aria-label="Decrease font size"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 w-8 text-center">{fontSize}px</span>
        <button
          onClick={() => setFontSize((s) => Math.min(28, s + 2))}
          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
          aria-label="Increase font size"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-slate-950/60">
        {text === null ? (
          <div className="flex items-center gap-2 text-slate-500 justify-center py-20">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading text…
          </div>
        ) : (
          <pre
            style={{ fontSize: `${fontSize}px` }}
            className="max-w-3xl mx-auto px-6 py-10 whitespace-pre-wrap break-words font-sans text-slate-200 leading-relaxed"
          >
            {text}
          </pre>
        )}
      </div>
    </div>
  );
}
