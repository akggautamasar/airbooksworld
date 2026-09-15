"use client";

import Link from "next/link";
import { BookOpen, Search, ShieldCheck, Sparkles, Upload } from "lucide-react";
import { usePathname } from "next/navigation";

export function Header(){
  const pathname=usePathname();
  if(pathname?.includes("/read")) return null;
  return <header className="airbooks-header absolute inset-x-0 top-0 z-50">
    <div className="mx-auto flex h-20 max-w-[1500px] items-center justify-between px-6 sm:px-10">
      <Link href="/" className="group flex items-center gap-3 text-[#4d4842]">
        <BookOpen className="h-[21px] w-[21px] stroke-[1.5] transition-transform group-hover:-rotate-6" />
        <span className="font-mono text-[10px] uppercase tracking-[.34em]">AirBooks</span>
      </Link>
      <nav className="flex items-center gap-5 text-[#4d4842] sm:gap-7">
        <Link href="/#library-search" aria-label="Search library" title="Search" className="transition-opacity hover:opacity-55"><Search className="h-[19px] w-[19px] stroke-[1.5]"/></Link>
        <Link href="/upload" aria-label="Upload a book" title="Upload" className="transition-opacity hover:opacity-55"><Upload className="h-[19px] w-[19px] stroke-[1.5]"/></Link>
        <Link href="/admin/recommendations" aria-label="Manage recommendations" title="Recommendations" className="transition-opacity hover:opacity-55"><Sparkles className="h-[19px] w-[19px] stroke-[1.5]"/></Link>
        <Link href="/admin" aria-label="Admin and settings" title="Admin / settings" className="transition-opacity hover:opacity-55"><ShieldCheck className="h-[19px] w-[19px] stroke-[1.5]"/></Link>
      </nav>
    </div>
  </header>;
}
