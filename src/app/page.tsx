import { Suspense } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fetchBooks, fetchTags } from "@/lib/api";
import { SearchBar } from "@/components/SearchBar";
import { Shelf } from "@/components/Shelf";
import { TypedTitle } from "@/components/TypedTitle";

type Props={searchParams:{q?:string;tag?:string;author?:string;page?:string}};
const PAGE_SIZE=60;

export default async function HomePage({searchParams}:Props){
  const q=searchParams.q||"", tag=searchParams.tag||"", author=searchParams.author||"";
  const page=Math.max(1,parseInt(searchParams.page||"1",10)||1); const offset=(page-1)*PAGE_SIZE;
  let books:Awaited<ReturnType<typeof fetchBooks>>["books"]=[], total=0, tags:string[]=[], error:string|null=null;
  try{const [booksRes,tagsRes]=await Promise.all([fetchBooks({q,tag,author,limit:PAGE_SIZE,offset}),fetchTags()]);books=booksRes.books;total=booksRes.total;tags=tagsRes}catch(e:any){error=e?.message||"Failed to load books. Is the backend running?"}
  const totalPages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  function pageHref(p:number){const params=new URLSearchParams();if(q)params.set("q",q);if(tag)params.set("tag",tag);if(author)params.set("author",author);if(p>1)params.set("page",String(p));const qs=params.toString();return qs?`/?${qs}`:"/"}
  return <div className="grain min-h-[calc(100vh-4rem)] overflow-hidden">
    <section className="mx-auto max-w-[1500px] px-5 pt-24 text-center sm:pt-28">
      <p className="font-mono text-[9px] uppercase tracking-[.38em] text-[#8d847a]">A personal archive</p>
      <div className="mt-7"><TypedTitle/></div>
      <p className="mt-7 font-mono text-[9px] uppercase tracking-[.36em] text-[#927f6d]">{total || "—"} volumes</p>
      <div className="mt-6 flex justify-center">
        <Link href="/upload" className="rounded-full border border-[#c5bdb3] bg-[#eeeae4]/55 px-6 py-2.5 font-mono text-[9px] uppercase tracking-[.24em] text-[#5f574e] shadow-sm transition hover:border-[#8e8478] hover:bg-[#f7f4ef]">Upload a book</Link>
      </div>
      <div className="mx-auto mt-9"><Suspense fallback={<div className="h-12"/>}><SearchBar/></Suspense></div>
      {tags.length>0 && <div className="mt-5 flex justify-center overflow-x-auto no-scrollbar"><div className="flex min-w-max gap-2 px-1">{["All",...tags.slice(0,14)].map(t=>{const active=t==="All"?!tag:tag===t;return <Link key={t} href={t==="All"?"/":`/?tag=${encodeURIComponent(t)}`} className={`rounded-full border px-4 py-1.5 font-mono text-[9px] uppercase tracking-[.18em] transition ${active?"border-[#7e756b] bg-[#ded8d0] text-[#403a34]":"border-[#c8c0b7] text-[#81786e] hover:border-[#93897e] hover:text-[#4c453e]"}`}>{t}</Link>})}</div></div>}
    </section>

    {error ? <div className="mx-auto mt-20 max-w-xl rounded-2xl border border-[#cfc3b6] bg-[#f7f3ed] p-8 text-center"><p className="font-display text-2xl text-[#4a4139]">The shelves are quiet.</p><p className="mt-2 font-sans text-sm text-[#81776c]">{error}</p></div> : books.length>0 ? <section className="mt-6"><Shelf books={books}/></section> : <div className="mx-auto mt-20 max-w-md text-center"><p className="font-display text-3xl text-[#514940]">No books match.</p><p className="mt-2 font-sans text-sm text-[#8b8278]">Try another title, author or tag.</p></div>}

    {!error && totalPages>1 && <nav className="flex items-center justify-center gap-5 pb-14 pt-5"><Link href={pageHref(Math.max(1,page-1))} aria-disabled={page<=1} className={`rounded-full border p-2 ${page<=1?"pointer-events-none border-[#ddd7cf] text-[#c8c0b7]":"border-[#c1b8ae] text-[#5f574e] hover:bg-white/50"}`}><ChevronLeft className="h-4 w-4"/></Link><span className="font-mono text-[9px] uppercase tracking-[.2em] text-[#81786e]">Page {page} of {totalPages}</span><Link href={pageHref(Math.min(totalPages,page+1))} aria-disabled={page>=totalPages} className={`rounded-full border p-2 ${page>=totalPages?"pointer-events-none border-[#ddd7cf] text-[#c8c0b7]":"border-[#c1b8ae] text-[#5f574e] hover:bg-white/50"}`}><ChevronRight className="h-4 w-4"/></Link></nav>}
  </div>
}
