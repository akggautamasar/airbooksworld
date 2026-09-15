"use client";

import Link from "next/link";
import { BookOpen, ShieldCheck, Upload } from "lucide-react";
import { usePathname } from "next/navigation";

export function Header(){
  const pathname=usePathname();
  if(pathname?.includes("/read")) return null;
  return <header className="absolute inset-x-0 top-0 z-50">
    <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-5 sm:px-8">
      <Link href="/" className="group flex items-center gap-2 text-[#6f675e]">
        <BookOpen className="h-4 w-4 transition-transform group-hover:-rotate-6" />
        <span className="font-mono text-[9px] uppercase tracking-[.28em]">AirBooks</span>
      </Link>
      <nav className="flex items-center gap-1 rounded-full border border-[#bdb5ab]/50 bg-[#eeeae4]/65 p-1 backdrop-blur-md">
        <Link href="/" title="Library" className="rounded-full px-3 py-1.5 text-[#5e564d] hover:bg-white/60"><BookOpen className="h-3.5 w-3.5"/></Link>
        <Link href="/upload" title="Upload" className="rounded-full px-3 py-1.5 text-[#5e564d] hover:bg-white/60"><Upload className="h-3.5 w-3.5"/></Link>
        <Link href="/admin" title="Admin / settings" className="rounded-full px-3 py-1.5 text-[#5e564d] hover:bg-white/60"><ShieldCheck className="h-3.5 w-3.5"/></Link>
      </nav>
    </div>
  </header>;
}
