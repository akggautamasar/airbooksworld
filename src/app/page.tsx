import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { fetchBooks, fetchTags } from "@/lib/api";
import { isRecommendationTag } from "@/lib/recommendations";
import { SearchBar } from "@/components/SearchBar";
import { InfiniteLibrary } from "@/components/InfiniteLibrary";
import { TypedTitle } from "@/components/TypedTitle";

type Props={searchParams:{q?:string;tag?:string;author?:string}};
const INITIAL_BATCH=60;

export default async function HomePage({searchParams}:Props){
  const q=searchParams.q||"",tag=searchParams.tag||"",author=searchParams.author||"";
  let books:Awaited<ReturnType<typeof fetchBooks>>["books"]=[],total=0,tags:string[]=[],error:string|null=null;
  try{const [booksRes,tagsRes]=await Promise.all([fetchBooks({q,tag,author,limit:INITIAL_BATCH,offset:0}),fetchTags()]);books=booksRes.books;total=booksRes.total;tags=tagsRes.filter(item=>!isRecommendationTag(item))}catch(e:any){error=e?.message||"Failed to load books. Is the backend running?"}

  return <div className="grain min-h-screen overflow-hidden bg-transparent">
    <section className="carollia-hero mx-auto max-w-[1500px] px-5 text-center">
      <p className="font-mono text-[10px] uppercase tracking-[.42em] text-[#756852]">A personal archive</p>
      <div className="mt-6 sm:mt-8"><TypedTitle/></div>
      <p className="carollia-volume mt-7 font-mono text-[10px] uppercase text-[#9E6B52]">{total||"—"} volumes</p>
      <div className="mt-6 flex flex-wrap justify-center gap-2.5">
        <Link href="/upload" className="rounded-full border border-[#C5BDAF] bg-[#FAF8F5]/45 px-7 py-2.5 font-mono text-[10px] uppercase tracking-[.22em] text-[#4A4133] shadow-sm transition hover:border-[#9E6B52] hover:bg-white/70">Upload a book</Link>
        <Link href="/recommendations" className="inline-flex items-center gap-2 rounded-full border border-[#C5BDAF] bg-[#FAF8F5]/45 px-7 py-2.5 font-mono text-[10px] uppercase tracking-[.22em] text-[#4A4133] shadow-sm transition hover:border-[#9E6B52] hover:bg-white/70"><Sparkles className="h-3 w-3"/>Recommendations</Link>
      </div>
      <div id="library-search" className="carollia-search mx-auto mt-11 sm:mt-14">
        <p className="mb-2 font-display text-xl italic text-[#8C8478] sm:text-2xl">What are you looking for?</p>
        <Suspense fallback={<div className="h-12"/>}><SearchBar/></Suspense>
      </div>
      {tags.length>0&&<div className="mt-5 flex justify-center overflow-x-auto no-scrollbar"><div className="flex min-w-max gap-2 px-1">
        {["All",...tags.slice(0,14)].map(t=>{const active=t==="All"?!tag:tag===t;return <Link key={t} href={t==="All"?"/":`/?tag=${encodeURIComponent(t)}`} className={`rounded-full border px-3.5 py-1.5 font-mono text-[9px] uppercase tracking-[.18em] transition ${active?"border-[#241F19] bg-[#241F19] text-white":"border-[#DCD6C9] bg-transparent text-[#756852] hover:border-[#9E6B52] hover:bg-white/50"}`}>{t}</Link>})}
      </div></div>}
    </section>

    {error?<div className="mx-auto mt-20 max-w-xl rounded-2xl border border-[#cfc3b6] bg-[#FAF8F5]/80 p-8 text-center"><p className="font-display text-2xl text-[#4a4139]">The shelves are quiet.</p><p className="mt-2 font-sans text-sm text-[#81776c]">{error}</p></div>:books.length>0?<section className="library-shelf mt-10 sm:mt-8"><InfiniteLibrary initialBooks={books} q={q} tag={tag} author={author}/></section>:<div className="mx-auto mt-20 max-w-md text-center"><p className="font-display text-3xl text-[#514940]">No books match.</p><p className="mt-2 font-sans text-sm text-[#8b8278]">Try another title, author or tag.</p></div>}

    <section className="mx-auto max-w-[1180px] px-5 pb-24 pt-10"><Link href="/recommendations" className="recommendations-door group relative mx-auto flex max-w-3xl items-center justify-between overflow-hidden rounded-[2px] border border-[#b8a996] bg-[#ddd0c0] px-7 py-7 shadow-[0_22px_55px_rgba(68,49,31,.13)] transition duration-500 hover:-translate-y-1 hover:shadow-[0_30px_70px_rgba(68,49,31,.18)] sm:px-10 sm:py-9"><span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_110%,rgba(255,218,165,.62),transparent_55%)] opacity-80"/><span className="relative flex items-center gap-4"><span className="grid h-11 w-11 place-items-center rounded-full border border-[#9f8e7b] bg-[#eee5d8]/70"><Sparkles className="h-4 w-4 text-[#665747]"/></span><span><span className="block font-mono text-[7px] uppercase tracking-[.3em] text-[#857565]">Step into the reading room</span><span className="mt-1 block font-display text-3xl text-[#332c25] sm:text-4xl">Book Recommendations</span></span></span><span className="relative hidden font-display text-lg italic text-[#776858] sm:block">Open the shelves →</span></Link></section>
  </div>;
}
