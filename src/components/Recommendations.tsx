"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDownRight, ChevronRight, Loader2 } from "lucide-react";
import { fetchBooks, fetchTags, type Book } from "@/lib/api";
import { RECOMMENDATION_PREFIX, getRecommendations, type RecommendationCollection } from "@/lib/recommendations";
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
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    loadRecommendationBooks().then((result) => { if (!cancelled) setBooks(result); }).catch(() => { if (!cancelled) setBooks([]); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  const collections = useMemo(() => getRecommendations(books), [books]);

  if (loading) return <section className="recommendations-section" aria-label="Book recommendations"><RecommendationHeader /><div className="recommendations-loading"><Loader2 className="h-4 w-4 animate-spin" /><span>Opening the curated shelves…</span></div></section>;

  return <section className="recommendations-section" aria-label="Book recommendations">
    <RecommendationHeader />
    {collections.length === 0 ? <div className="recommendations-empty"><div className="font-mono text-[9px] uppercase tracking-[.28em] text-[#9b9186]">The recommendation shelves are waiting</div><p className="mt-3 font-display text-3xl text-[#403a34]">Curate your first collection.</p><p className="mx-auto mt-2 max-w-lg font-sans text-sm leading-6 text-[#81786e]">Collections created from the admin area will appear here with the real books from your AirBooks library.</p></div> : <div className="recommendations-list">{collections.map((collection, index) => <RecommendationRow key={collection.title} collection={collection} index={index} />)}</div>}
    <div className="recommendations-footer-mark"><span>BOOKS · PEOPLE · IDEAS · A BRIGHTER YOU</span><span className="font-display italic">Read More<br />Be More</span></div>
  </section>;
}

function RecommendationHeader() {
  return <header className="recommendations-heading">
    <div className="recommendations-side-note"><span>AIRBOOKS</span><span>IDEAS</span><span>PEOPLE</span><span>BOOKS</span><span>BETTER YOU</span></div>
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
