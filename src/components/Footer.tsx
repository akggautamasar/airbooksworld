"use client";

import { usePathname } from "next/navigation";

export function Footer() {
  const pathname = usePathname();
  if (pathname?.includes("/read")) return null;

  return (
    <footer className="airbooks-footer">
      <div className="mx-auto max-w-[1500px] px-6 text-center sm:px-10">
        <p className="font-mono text-[8px] uppercase tracking-[.24em] text-[#8b8278]">
          <span className="text-[#5d554c]">AirBooks</span> · Free ebook library powered by Telegram
        </p>
      </div>
    </footer>
  );
}
