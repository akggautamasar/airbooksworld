import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Recommendations } from "@/components/Recommendations";

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
      <style jsx global>{`
        .recommendations-page{position:relative;min-height:100vh;overflow:hidden;background:
          radial-gradient(circle at 50% 5%,rgba(255,252,246,.95),transparent 36%),
          linear-gradient(180deg,#f1ece4 0%,#e2d9cd 100%)}
        .recommendations-page:before{content:"";position:fixed;inset:0;pointer-events:none;opacity:.24;background:radial-gradient(ellipse at 50% 8%,transparent 20%,rgba(71,55,40,.11) 100%);mix-blend-mode:multiply}
        .recommendations-page-topbar{position:relative;z-index:20;height:82px;padding:0 42px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(65,55,45,.13);font:7px "Space Mono",monospace;letter-spacing:.28em;text-transform:uppercase;color:#82776c;background:rgba(242,237,229,.76);backdrop-filter:blur(10px)}
        .recommendations-back{display:inline-flex;align-items:center;gap:8px;color:#625950;transition:transform .25s ease,opacity .25s ease}.recommendations-back:hover{transform:translateX(-3px);opacity:.65}
        .recommendations-page-stage{position:relative;z-index:1}
        .recommendations-page .recommendations-section{margin-top:0;background:transparent}
        .recommendations-page .recommendations-heading{min-height:245px;padding-top:46px}
        .recommendations-page .recommendation-row{min-height:390px}
        .recommendations-page .recommendation-shelf-wrap{background:
          radial-gradient(ellipse at 50% 100%,rgba(255,215,159,.34),transparent 42%),
          linear-gradient(180deg,rgba(255,252,246,.28),rgba(196,174,148,.18))}
        .recommendations-page .recommendation-shelf-wrap:before{height:18px;bottom:29px;border-radius:2px;background:linear-gradient(180deg,#dfb27a 0%,#a97643 45%,#6b472b 100%);box-shadow:0 -5px 14px rgba(255,221,173,.7),0 8px 14px rgba(48,33,20,.27),inset 0 1px rgba(255,239,207,.55)}
        .recommendations-page .recommendation-shelf-wrap:after{bottom:47px;height:9px;filter:blur(4px);background:linear-gradient(90deg,transparent,rgba(255,225,174,.7),transparent)}
        .recommendations-page .recommendation-books{filter:drop-shadow(0 16px 12px rgba(48,36,25,.13))}
        .recommendations-page .recommendation-intro{background:linear-gradient(90deg,rgba(244,238,229,.94),rgba(236,229,219,.58));box-shadow:inset -10px 0 24px rgba(80,62,44,.025)}
        .recommendations-page .recommendation-quote{background:rgba(242,237,228,.82);box-shadow:0 18px 35px rgba(57,44,32,.1),inset 0 0 25px rgba(255,255,255,.25)}
        .recommendations-page .recommendations-footer-mark{padding-bottom:34px}
        @media(max-width:640px){
          .recommendations-page-topbar{height:68px;padding:0 16px;font-size:5px;letter-spacing:.18em}
          .recommendations-page-topbar>span{display:none}
          .recommendations-page .recommendations-heading{min-height:190px;padding-top:30px}
          .recommendations-page .recommendation-row{min-height:340px}
        }
      `}</style>
    </div>
  );
}
