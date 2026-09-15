import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Recommendations } from "@/components/Recommendations";
import "./reading-room.module.css";

export const metadata: Metadata = {
  title: "Book Recommendations — AirBooks",
  description: "A curated library of books chosen for you.",
};

export default function RecommendationsPage() {
  return (
    <div className="recommendations-page grain min-h-screen bg-[#eee9e1]">
      <div className="recommendations-page-topbar">
        <Link href="/" className="recommendations-back">
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to library
        </Link>
        <span>THE AIRBOOKS READING ROOM</span>
      </div>
      <div className="recommendations-page-stage">
        <Recommendations />
      </div>
    </div>
  );
}
