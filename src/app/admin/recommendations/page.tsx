"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import { adminUpdateBook, fetchBooks, getCoverUrl, getStoredAdminPassword, storeAdminPassword, verifyAdminPassword, type Book } from "@/lib/api";
import { getRecommendations, recommendationTags, withoutCollectionTags, type RecommendationCollection } from "@/lib/recommendations";

async function loadBooks(): Promise<Book[]> {
  const all: Book[] = [];
  let offset = 0;
  while (true) {
    const res = await fetchBooks({ limit: 200, offset });
    all.push(...res.books);
    offset += res.books.length;
    if (res.books.length < 200 || offset >= res.total) return all;
  }
}

export default function RecommendationAdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curator, setCurator] = useState("");
  const [quote, setQuote] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const saved = getStoredAdminPassword();
    if (saved) setPassword(saved);
  }, []);

  useEffect(() => {
    if (!password) return;
    setBusy(true);
    loadBooks().then(setBooks).catch((e) => setStatus(e instanceof Error ? e.message : "Couldn't load books.")).finally(() => setBusy(false));
  }, [password]);

  const collections = useMemo(() => getRecommendations(books), [books]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(q)) : books;
  }, [books, query]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setLoginError("");
    try {
      if (!(await verifyAdminPassword(passwordInput))) return setLoginError("Incorrect password.");
      storeAdminPassword(passwordInput);
      setPassword(passwordInput);
    } catch {
      setLoginError("Couldn't reach the server.");
    }
  }

  function reset() {
    setEditing(null); setTitle(""); setDescription(""); setCurator(""); setQuote(""); setSelected([]); setStatus("");
  }

  function edit(collection: RecommendationCollection) {
    setEditing(collection.title); setTitle(collection.title); setDescription(collection.description); setCurator(collection.curator); setQuote(collection.quote); setSelected(collection.books.map((book) => book.id)); setStatus("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggle(id: string) {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
  }

  async function save() {
    if (!password || !title.trim() || !selected.length) return setStatus("Enter a title and select at least one book.");
    const name = title.trim();
    if (!editing && collections.some((item) => item.title.toLowerCase() === name.toLowerCase())) return setStatus("That collection already exists.");
    if (editing && name.toLowerCase() !== editing.toLowerCase() && collections.some((item) => item.title.toLowerCase() === name.toLowerCase())) return setStatus("That collection title is already in use.");
    setBusy(true); setStatus("");
    try {
      const old = editing ? collections.find((item) => item.title === editing) : undefined;
      const ids = new Set([...(old?.books.map((book) => book.id) || []), ...selected]);
      const selectedSet = new Set(selected);
      const meta = recommendationTags({ title: name, description, curator, quote });
      const map = new Map(books.map((book) => [book.id, book]));
      for (const id of ids) {
        const book = map.get(id);
        if (!book) continue;
        let tags = editing ? withoutCollectionTags(book.tags || [], editing) : [...(book.tags || [])];
        if (selectedSet.has(id)) {
          tags = withoutCollectionTags(tags, name);
          tags = Array.from(new Set([...tags, ...meta]));
        }
        map.set(id, await adminUpdateBook(id, password, { tags }));
      }
      setBooks(Array.from(map.values()));
      setEditing(name);
      setStatus(`Saved “${name}” with ${selected.length} book${selected.length === 1 ? "" : "s"}.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Couldn't save collection.");
    } finally { setBusy(false); }
  }

  async function remove(collection: RecommendationCollection) {
    if (!password || !confirm(`Remove “${collection.title}” from recommendations?`)) return;
    setBusy(true); setStatus("");
    try {
      const map = new Map(books.map((book) => [book.id, book]));
      for (const book of collection.books) map.set(book.id, await adminUpdateBook(book.id, password, { tags: withoutCollectionTags(book.tags || [], collection.title) }));
      setBooks(Array.from(map.values()));
      if (editing === collection.title) reset();
      setStatus(`Removed “${collection.title}”.`);
    } catch (e) { setStatus(e instanceof Error ? e.message : "Couldn't remove collection."); }
    finally { setBusy(false); }
  }

  if (!password) return <main className="min-h-screen bg-[#11100f] px-5 py-20 text-white"><form onSubmit={login} className="mx-auto max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-7"><p className="font-mono text-[9px] uppercase tracking-[.3em] text-slate-500">AirBooks · Curated shelves</p><h1 className="mt-4 text-2xl font-semibold">Recommendation admin</h1><p className="mt-2 text-sm text-slate-500">Use your existing admin password.</p><input autoFocus type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Admin password" className="mt-5 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm" />{loginError && <p className="mt-3 text-sm text-rose-400">{loginError}</p>}<button disabled={!passwordInput} className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">Enter</button></form></main>;

  return <main className="min-h-screen bg-[#11100f] px-4 py-6 text-slate-100 sm:px-7"><div className="mx-auto max-w-[1450px]"><div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5"><div><Link href="/admin" className="inline-flex items-center gap-2 text-xs text-slate-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Book admin</Link><h1 className="mt-3 text-2xl font-semibold">Recommendation shelves</h1><p className="mt-1 text-sm text-slate-500">Create a title, choose real books, and publish an editorial shelf.</p></div><button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs"><Plus className="h-3.5 w-3.5" /> New collection</button></div>
  <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]"><section className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">{editing ? "Edit collection" : "New collection"}</p><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Collection title" className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm" /><textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Short description" rows={3} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm" /><input value={curator} onChange={(e)=>setCurator(e.target.value)} placeholder="Recommended by · optional" className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm" /><textarea value={quote} onChange={(e)=>setQuote(e.target.value)} placeholder="Quote · optional" rows={3} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm" /><p className="mt-3 rounded-xl border border-slate-800 p-3 text-xs text-slate-500">{selected.length} book{selected.length===1?"":"s"} selected</p><button type="button" onClick={save} disabled={busy} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}{editing?"Save changes":"Publish collection"}</button>{status&&<p className="mt-3 text-xs leading-5 text-slate-400">{status}</p>}</section>
  <section><div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600"/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search books" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-10 py-2.5 text-sm"/></div><span className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-500">{visible.length} books</span></div><div className="mt-3 grid max-h-[600px] grid-cols-3 gap-2 overflow-auto sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">{visible.map((book)=><button key={book.id} type="button" onClick={()=>toggle(book.id)} className={`relative overflow-hidden rounded-2xl border text-left ${selected.includes(book.id)?"border-white bg-slate-800":"border-slate-800 bg-slate-950"}`}><div className="aspect-[3/4] bg-slate-900">{book.cover_message_id?<img src={getCoverUrl(book.id,book.updated_at)} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-end p-2 font-display text-sm text-slate-400">{book.title}</div>}</div><div className="p-2"><p className="line-clamp-2 text-[11px] leading-4">{book.title}</p><p className="mt-1 line-clamp-1 text-[9px] text-slate-600">{book.author}</p></div>{selected.includes(book.id)&&<span className="absolute right-2 top-2 rounded-full bg-white p-1 text-black"><Check className="h-3 w-3"/></span>}</button>)}</div></section></div>
  <section className="mt-10 border-t border-slate-800 pt-7"><p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">Published collections</p><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{collections.map((collection)=><div key={collection.title} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl">{collection.title}</h2><p className="mt-1 text-xs text-slate-500">{collection.books.length} books{collection.curator?` · ${collection.curator}`:""}</p></div><div className="flex gap-1"><button type="button" onClick={()=>edit(collection)} className="rounded-lg border border-slate-800 px-3 py-2 text-xs">Edit</button><button type="button" onClick={()=>remove(collection)} disabled={busy} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button></div></div><p className="mt-3 text-xs leading-5 text-slate-500">{collection.description}</p></div>)}{!collections.length&&<p className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-600">No collections yet.</p>}</div></section></div></main>;
}
