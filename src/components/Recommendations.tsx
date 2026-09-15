"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ChevronRight, Loader2 } from "lucide-react";
import { fetchBooks, fetchTags, type Book } from "@/lib/api";
import { RECOMMENDATION_PREFIX, getRecommendations, type RecommendationCollection } from "@/lib/recommendations";
import { loadCuratedRecommendations } from "@/lib/curated-recommendations";
import { Shelf } from "@/components/Shelf";

async function loadRecommendationBooks(): Promise<Book[]> {
  const tags = await fetchTags();
  const titles = Array.from(new Set(tags.filter((tag) => tag.startsWith(RECOMMENDATION_PREFIX)).map((tag) => tag.slice(RECOMMENDATION_PREFIX.length).trim()).filter(Boolean)));
  if (!titles.length) return [];
  const responses = await Promise.all(titles.map((title) => fetchBooks({ tag: `${RECOMMENDATION_PREFIX}${title}`, limit: 200, offset: 0 }).catch(() => ({ books: [] as Book[] }))));
  const byId = new Map<string, Book>();
  for (const response of responses) for (const book of response.books) byId.set(book.id, book);
  return Array.from(byId.values());
}

export function Recommendations() {
  const [books, setBooks] = useState<Book[]>([]);
  const [curated, setCurated] = useState<RecommendationCollection[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      loadRecommendationBooks().catch(() => [] as Book[]),
      loadCuratedRecommendations().catch(() => [] as RecommendationCollection[]),
    ]).then(([result, presets]) => {
      if (cancelled) return;
      setBooks(result);
      setCurated(presets);
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const collections = useMemo(() => {
    const tagged = getRecommendations(books);
    const merged = new Map<string, RecommendationCollection>();
    for (const collection of [...curated, ...tagged]) {
      const existing = merged.get(collection.title);
      if (!existing) {
        merged.set(collection.title, { ...collection, books: [...collection.books] });
      } else {
        const byId = new Map(existing.books.map((book) => [book.id, book]));
        for (const book of collection.books) byId.set(book.id, book);
        merged.set(collection.title, { ...existing, books: Array.from(byId.values()) });
      }
    }
    return Array.from(merged.values());
  }, [books, curated]);

  if (loading) return <section className="recommendations-section" aria-label="Book recommendations"><RecommendationHeader /><div className="recommendations-loading"><Loader2 className="h-4 w-4 animate-spin" /><span>Opening the curated shelves…</span></div><RecommendationStyles /></section>;

  return <section className="recommendations-section" aria-label="Book recommendations">
    <RecommendationHeader />
    {collections.length === 0 ? <div className="recommendations-empty"><div className="font-mono text-[9px] uppercase tracking-[.28em] text-[#9b9186]">The recommendation shelves are waiting</div><p className="mt-3 font-display text-3xl text-[#403a34]">Curate your first collection.</p><p className="mx-auto mt-2 max-w-lg font-sans text-sm leading-6 text-[#81786e]">Collections created from the admin area will appear here with the real books from your AirBooks library.</p></div> : <div className="recommendations-list">{collections.map((collection, index) => <RecommendationRow key={collection.title} collection={collection} index={index} />)}</div>}
    <div className="recommendations-footer-mark"><span>BOOKS · PEOPLE · IDEAS · A BRIGHTER YOU</span><span className="font-display italic">Read More<br />Be More</span></div>
    <RecommendationStyles />
  </section>;
}

function RecommendationHeader() {
  return <header className="recommendations-heading">
    <div className="recommendations-side-note"><span>AIRBOOKS</span><span>IDEAS</span><span>PEOPLE</span><span>BOOKS</span><span>BETTER YOU</span><i /></div>
    <div className="recommendations-heading-main"><div className="recommendations-kicker">Curated for you</div><h2 className="font-display">Book Recommendations</h2><p className="font-display">Timeless books, chosen by great minds.</p></div>
    <div className="recommendations-header-quote"><span>“</span><em>A room without books<br />is a body without a soul.</em><small>— CICERO</small></div>
  </header>;
}

function RecommendationRow({ collection, index }: { collection: RecommendationCollection; index: number }) {
  const anchor = `recommendation-${collection.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  function explore() { document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth", block: "center" }); }
  return <article id={anchor} className="recommendation-row">
    <aside className="recommendation-intro">
      <div className="recommendation-number">0{index + 1}</div>
      <div className="recommendation-intro-label">Recommended reading</div>
      <h3 className="font-display">{collection.title}</h3>
      <p>{collection.description}</p>
      <button type="button" onClick={explore} className="recommendation-explore">Explore <ArrowDownRight className="h-3.5 w-3.5" /></button>
      {collection.curator && <div className="recommendation-curator">Recommended by<strong>{collection.curator}</strong></div>}
    </aside>
    <div className="recommendation-shelf-wrap">
      <div className="recommendation-decor recommendation-decor-left"><span className="decor-plant">♧</span></div>
      <div className="recommendation-books"><Shelf books={collection.books} /></div>
      <div className="recommendation-decor recommendation-decor-right"><span className="decor-orb" /></div>
      <div className="recommendation-wood-glow" />
    </div>
    <aside className="recommendation-quote"><div className="recommendation-quote-mark">“</div><p className="font-display">{collection.quote || "Good books build better humans."}</p>{collection.curator && <span>— {collection.curator}</span>}<Link href="#library-search" className="recommendation-quote-link">Browse library <ChevronRight className="h-3 w-3" /></Link></aside>
  </article>;
}

function RecommendationStyles() {
  return <style jsx global>{`
    .recommendations-section{max-width:100%;margin-top:118px;padding-top:0;background:linear-gradient(180deg,rgba(255,255,255,.28),rgba(235,229,219,.12));overflow:hidden}
    .recommendations-heading{position:relative;min-height:184px;padding:28px 240px 30px;border-bottom:1px solid rgba(65,55,45,.14);display:flex;align-items:center;justify-content:center}
    .recommendations-heading-main{text-align:center;max-width:850px}
    .recommendations-heading h2{font-size:clamp(3.4rem,5.4vw,5.8rem);margin:8px 0 0;letter-spacing:-.055em;line-height:.84}
    .recommendations-heading p{font-size:clamp(1.1rem,1.7vw,1.65rem);margin-top:13px;color:#94897d}
    .recommendations-side-note{position:absolute;left:52px;top:31px;display:flex;flex-direction:column;gap:7px;font-family:"Space Mono",monospace;font-size:8px;letter-spacing:.32em;color:#776e65;text-align:left}
    .recommendations-side-note span:first-child{margin-bottom:6px;color:#4e4841}
    .recommendations-side-note i{height:1px;width:28px;background:#8c8175;margin-top:5px}
    .recommendations-header-quote{position:absolute;right:48px;top:27px;width:190px;text-align:left;color:#50483f}
    .recommendations-header-quote span{font:34px "Cormorant Garamond",serif;line-height:.4}
    .recommendations-header-quote em{display:block;font:italic 17px/1.02 "Cormorant Garamond",serif;margin-top:4px}
    .recommendations-header-quote small{display:block;margin-top:12px;font:7px "Space Mono",monospace;letter-spacing:.2em;color:#857b70}
    .recommendations-list{border-top:0}
    .recommendation-row{position:relative;display:grid;grid-template-columns:220px minmax(0,1fr) 190px;min-height:360px;border-bottom:1px solid rgba(68,56,44,.18);background:linear-gradient(180deg,rgba(249,246,240,.68),rgba(230,223,211,.32));align-items:stretch}
    .recommendation-intro{padding:31px 22px 25px 38px;border-right:1px solid rgba(73,65,56,.15);background:linear-gradient(90deg,rgba(245,240,232,.72),rgba(239,233,224,.34));position:relative;z-index:4}
    .recommendation-number{font:8px "Space Mono",monospace;letter-spacing:.28em;color:#a09589}
    .recommendation-intro-label{margin-top:30px;font:11px "Cormorant Garamond",serif;color:#72675c}
    .recommendation-intro h3{font-size:31px;line-height:.92;margin:5px 0 0;color:#302a24;max-width:180px}
    .recommendation-intro p{font-size:13px;line-height:1.42;color:#746a60;max-width:155px;margin:12px 0 0}
    .recommendation-explore{margin-top:22px;padding:8px 15px;border-color:#aaa096;background:rgba(255,255,255,.38);font-size:7px;letter-spacing:.2em}
    .recommendation-curator{font-size:7px;line-height:1.45;letter-spacing:.12em}
    .recommendation-curator strong{font-size:9px;letter-spacing:.08em;color:#554d45}
    .recommendation-shelf-wrap{position:relative;min-width:0;overflow:hidden;padding:20px 0 42px;display:flex;align-items:flex-end;background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(205,190,172,.12) 74%,rgba(174,133,86,.06))}
    .recommendation-shelf-wrap:before{content:"";position:absolute;left:0;right:0;bottom:29px;height:14px;background:linear-gradient(180deg,#d2a26b,#9a6a3d 48%,#6d492d);box-shadow:0 -3px 7px rgba(255,228,185,.62),0 5px 9px rgba(65,40,23,.24);z-index:1}
    .recommendation-shelf-wrap:after{content:"";position:absolute;left:0;right:0;bottom:43px;height:4px;background:linear-gradient(90deg,transparent 0%,rgba(255,242,214,.75) 25%,rgba(255,236,200,.35) 55%,transparent 100%);filter:blur(2px);z-index:1}
    .recommendation-books{position:relative;z-index:3;width:100%;min-width:0}
    .recommendation-shelf-wrap .library-shelf{width:100%;max-width:none}
    .recommendation-shelf-wrap .shelf-rail{width:100%;padding:0 4px 5px;overflow-x:auto;overflow-y:visible}
    .recommendation-shelf-wrap .shelf-row{height:300px;min-width:max-content;justify-content:flex-start;padding:0 26px}
    .recommendation-shelf-wrap .book-spine-hit{transform:translateY(var(--book-lift,0)) translateZ(var(--swivel-z,0px)) rotateY(var(--swivel-y,0deg)) rotate(var(--book-rotation,0deg)) scale(var(--swivel-scale,1))}
    .recommendation-decor{position:absolute;z-index:4;pointer-events:none;bottom:49px}
    .recommendation-decor-left{left:13px}.recommendation-decor-right{right:13px}
    .decor-plant{display:block;font-size:74px;line-height:.6;transform:rotate(-12deg);filter:drop-shadow(3px 6px 4px rgba(38,30,22,.18));color:#65725d}
    .decor-orb{display:block;width:43px;height:43px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#f8f0d9 0 9%,#cfc5ac 34%,#857c6b 100%);box-shadow:0 4px 8px rgba(46,35,25,.2)}
    .recommendation-wood-glow{position:absolute;left:0;right:0;bottom:40px;height:30px;background:radial-gradient(ellipse at 50% 0,rgba(255,218,160,.4),transparent 62%);pointer-events:none;z-index:2}
    .recommendation-quote{margin:32px 28px 28px 16px;border:1px solid rgba(73,65,56,.2);background:rgba(247,243,235,.72);padding:18px 16px;box-shadow:0 12px 25px rgba(52,43,35,.08);z-index:5}
    .recommendation-quote p{font-size:19px}
    .recommendations-footer-mark{padding:44px 42px 10px}
    @media(max-width:900px){.recommendations-heading{padding-left:170px;padding-right:170px}.recommendation-row{grid-template-columns:170px minmax(520px,1fr) 165px}.recommendation-intro{padding-left:24px}.recommendation-header-quote{right:20px;width:135px}.recommendations-side-note{left:22px}}
    @media(max-width:640px){
      .recommendations-section{margin-top:88px}
      .recommendations-heading{min-height:175px;padding:30px 22px 26px;display:block}
      .recommendations-heading-main{padding-top:6px}
      .recommendations-heading h2{font-size:clamp(2.8rem,13vw,4rem);line-height:.82}
      .recommendations-heading p{font-size:1.05rem}
      .recommendations-side-note{left:17px;top:17px;font-size:6px;gap:4px;letter-spacing:.22em}
      .recommendations-header-quote{display:none}
      .recommendation-row{display:grid;grid-template-columns:112px minmax(420px,1fr) 115px;min-height:330px}
      .recommendation-intro{padding:24px 10px 20px 14px}
      .recommendation-intro-label{margin-top:20px;font-size:9px}
      .recommendation-intro h3{font-size:23px}
      .recommendation-intro p{font-size:10px;max-width:90px}
      .recommendation-explore{font-size:6px;padding:7px 9px;margin-top:15px}
      .recommendation-curator{font-size:5px}
      .recommendation-curator strong{font-size:7px}
      .recommendation-shelf-wrap{padding-bottom:34px}
      .recommendation-shelf-wrap .shelf-row{height:275px;padding:0 8px}
      .recommendation-shelf-wrap .book-spine-hit{height:clamp(210px,calc(var(--book-h) * .9),275px);width:clamp(27px,calc(var(--book-w) * .9),50px)}
      .recommendation-decor{display:none}
      .recommendation-quote{margin:28px 10px 24px 7px;padding:11px 8px}
      .recommendation-quote p{font-size:13px}
      .recommendation-quote-link{font-size:5px}
      .recommendations-footer-mark{padding:30px 18px 8px;font-size:5px}
    }
  `}</style>;
}
