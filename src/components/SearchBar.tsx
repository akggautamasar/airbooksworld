"use client";

import { X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";

export function SearchBar(){
  const router=useRouter(); const searchParams=useSearchParams();
  const [query,setQuery]=useState(searchParams.get("q")||""); const [pending,startTransition]=useTransition();
  function submit(e:FormEvent){e.preventDefault();const p=new URLSearchParams(searchParams.toString());query.trim()?p.set("q",query.trim()):p.delete("q");p.delete("page");startTransition(()=>router.push(`/?${p.toString()}`))}
  function clear(){setQuery("");const p=new URLSearchParams(searchParams.toString());p.delete("q");p.delete("page");startTransition(()=>router.push(`/?${p.toString()}`))}
  return <form onSubmit={submit} className="relative mx-auto w-full max-w-[760px]">
    <input aria-label="Search your library" type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="What are you looking for?" className="h-12 w-full border-0 border-b border-[#a79e94]/55 bg-transparent px-2 text-center font-display text-[20px] italic text-[#514941] outline-none placeholder:text-[#a49a8f] focus:border-[#6d6359]"/>
    {query && <button type="button" onClick={clear} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-2 text-[#91877c] hover:text-[#403931]"><X className="h-4 w-4"/></button>}
    {pending && <span className="absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin rounded-full border border-[#9c9389] border-t-transparent"/>}
  </form>
}
