"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.includes("/read")) return null;

  return (
    <footer className="border-t border-slate-200 py-8 mt-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 text-center text-slate-500 text-sm">
        <p>
          <span className="text-brand-600 font-semibold">AirBooks</span> —
          Free ebook library powered by Telegram
        </p>
      </div>
    </footer>
  );
}
