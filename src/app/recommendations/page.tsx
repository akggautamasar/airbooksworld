import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Recommendations } from "@/components/Recommendations";
import styles from "./reading-room.module.css";

export const metadata: Metadata = {
  title: "Book Recommendations — AirBooks",
  description: "A curated library of books chosen for you.",
};

export default function RecommendationsPage() {
  return (
    <div className={`${styles.readingRoom} recommendations-page grain min-h-screen bg-[#17130f]`}>
      <div className="recommendations-page-topbar">
        <Link href="/" className="recommendations-topbar-brand" aria-label="AirBooks home">
          <span className="recommendations-topbar-brand-mark">◫</span>
          <span>AirBooks</span>
        </Link>
        <nav className="recommendations-topbar-nav" aria-label="Primary navigation">
          <Link href="/">Home</Link>
          <Link href="/#library-search">Explore</Link>
          <Link href="/#library-search">Collections</Link>
          <Link href="/recommendations" aria-current="page">Recommendations</Link>
          <Link href="/">About</Link>
        </nav>
        <Link href="/#library-search" className="recommendations-topbar-search" aria-label="Search books">
          <Search className="h-3.5 w-3.5" />
          <span>Search books, authors...</span>
        </Link>
        <Link href="/" className="recommendations-back" aria-label="Back to library">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Library</span>
        </Link>
      </div>
      <div className="recommendations-page-stage">
        <Recommendations />
      </div>
    </div>
  );
}
