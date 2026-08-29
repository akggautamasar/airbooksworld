"use client";

import Link from "next/link";
import { BookOpen, Search, Upload } from "lucide-react";
import { usePathname } from "next/navigation";
import clsx from "clsx";

export function Header() {
  const pathname = usePathname();

  const nav = [
    { href: "/", label: "Library", icon: BookOpen },
    { href: "/upload", label: "Upload", icon: Upload },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-[#0a0e17]/80 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Air<span className="text-brand-400">Books</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {nav.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-500/15 text-brand-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
