"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, RefreshCw, Trash2 } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const TITLE = "__airbooks_rec_title__:";
const DESC = "__airbooks_rec_desc__:";
const CURATOR = "__airbooks_rec_curator__:";
const QUOTE = "__airbooks_rec_quote__:";
const PAGE_SIZE = 200;

type Book = { id: string; title: string; author: string; tags?: string[]; cover_message_id?: number | null; updated_at?: string };
type Collection = { title: string; description: string; curator: string; quote: string; books: Book[] };

function base() { return API_URL.replace(/\/$/, ""); }
function encoded(value: string) { return encodeURIComponent(value.trim()); }
function cleanTitle(tag: string) { return tag.startsWith(TITLE) ? tag.slice(TITLE.length).trim() : ""; }
function metadata(tags: string[], prefix: string, title: string) { const marker = `${prefix}${encoded(title)}|`; const tag = tags.find((item) => item.startsWith(marker)); return tag ? decodeURIComponent(tag.slice(marker.length)).trim() : ""; }
function collectionTags(title: string, description: string, curator: string, quote: string) { const name = title.trim(); const tags = [TITLE + name]; if (description.trim()) tags.push(`${DESC}${encoded(name)}|${encoded(description)}`); if (curator.trim()) tags.push(`${CURATOR}${encoded(name)}|${encoded(curator)}`); if (quote.trim()) tags.push(`${QUOTE}${encoded(name)}|${encoded(quote)}`); return tags; }
function removeCollection(tags: string[], title: string) { const marker = encoded(title); return tags.filter((tag) => tag !== TITLE + title && !tag.startsWith(`${DESC}${marker}|`) && !tag.startsWith(`${CURATOR}${marker}|`) && !tag.startsWith(`${QUOTE}${marker}|`)); }
function makeCollection(title: string, books: Book[]): Collection { const first = books[0]; return { title, description: first ? metadata(first.tags || [], DESC, title) || "Books chosen to inspire a brighter, more curious life." : "Books chosen to inspire a brighter, more curious life.", curator: first ? metadata(first.tags || [], CURATOR, title) : "", quote: first ? metadata(first.tags || [], QUOTE, title) : "", books }; }

export default function RecommendationAdminPage() {
  const [password, setPassword] = useState("");
  const [savedPassword, setSavedPassword] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBookMap, setSelectedBookMap] = useState<Record<string, Book>>({});
  const [published, setPublished] = useState<Collection[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curator, setCurator] = useState("");
  const [quote, setQuote] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState("");

  useEffect(() => { const value = window.sessionStorage.getItem("airbooks_admin_password"); if (value) setSavedPassword(value); }, []);

  async function api(path: string, init: RequestInit = {}) {
    const response = await fetch(`${base()}${path}`, { cache: "no-store", ...init });
    if (response.ok) return response.json();
    let detail = "";
    try { const body = await response.json(); detail = body?.detail || body?.message || ""; } catch {}
    if (response.status === 401) throw new Error("Invalid admin password");
    throw new Error(detail || `Request failed (${response.status})`);
  }

  async function loadPublished(): Promise<Collection[]> {
    if (!savedPassword) return [];
    const discovered = new Map<string, Book>();
    let offset = 0;
    do {
      const data = await api(`/api/books?q=${encodeURIComponent(TITLE)}&limit=${PAGE_SIZE}&offset=${offset}`);
      const items = (data.books || []) as Book[];
      for (const book of items) discovered.set(book.id, book);
      offset += items.length;
      // The backend's `total` is the whole library size, not the filtered count,
      // so the only reliable pagination stop is an empty/short filtered page.
      if (!items.length || items.length < PAGE_SIZE) break;
    } while (offset < 100000);

    const titles = Array.from(new Set(Array.from(discovered.values()).flatMap((book) => (book.tags || []).map(cleanTitle).filter(Boolean))));
    const result: Collection[] = [];
    for (const name of titles) {
      try {
        const data = await api(`/api/books?tag=${encodeURIComponent(TITLE + name)}&limit=${PAGE_SIZE}&offset=0`);
        const items = (data.books || []) as Book[];
        if (items.length) result.push(makeCollection(name, items));
      } catch { /* keep other collections visible */ }
    }
    result.sort((a, b) => a.title.localeCompare(b.title));
    setPublished(result);
    return result;
  }

  async function loadBooks(search = query) {
    if (!savedPassword) return;
    setBusy(true); setMessage("");
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: "0" });
      if (search.trim()) params.set("q", search.trim());
      const data = await api(`/api/books?${params.toString()}`);
      const items = (data.books || []) as Book[];
      setBooks(items); setTotal(data.total || 0);
      setSelectedBookMap((prev) => { const next = { ...prev }; for (const book of items) next[book.id] = book; return next; });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't load books."); }
    finally { setBusy(false); }
  }

  useEffect(() => { if (savedPassword) { loadBooks(""); loadPublished().catch((error) => setMessage(error instanceof Error ? error.message : "Couldn't load collections.")); } }, [savedPassword]);
  useEffect(() => { if (!savedPassword) return; const timer = window.setTimeout(() => loadBooks(query), 300); return () => window.clearTimeout(timer); }, [query, savedPassword]);

  const selectedBooks = useMemo(() => selected.map((id) => selectedBookMap[id]).filter(Boolean), [selected, selectedBookMap]);

  function reset() { setEditing(null); setTitle(""); setDescription(""); setCurator(""); setQuote(""); setSelected([]); setSelectedBookMap({}); setMessage(""); }
  function toggle(id: string) {
    setSelected((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id]);
    const book = books.find((item) => item.id === id);
    if (book) setSelectedBookMap((prev) => ({ ...prev, [id]: book }));
  }

  async function editCollection(item: Collection) {
    setBusy(true); setMessage("");
    try {
      const data = await api(`/api/books?tag=${encodeURIComponent(TITLE + item.title)}&limit=${PAGE_SIZE}&offset=0`);
      const tagged = (data.books || []) as Book[];
      setBooks((prev) => { const map = new Map(prev.map((b) => [b.id, b])); tagged.forEach((b) => map.set(b.id, b)); return Array.from(map.values()); });
      setSelectedBookMap((prev) => { const next = { ...prev }; tagged.forEach((b) => { next[b.id] = b; }); return next; });
      setEditing(item.title); setTitle(item.title); setDescription(item.description); setCurator(item.curator); setQuote(item.quote); setSelected(tagged.map((book) => book.id));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't load collection books."); }
    finally { setBusy(false); }
  }

  async function login(event: React.FormEvent) {
    event.preventDefault(); setLoginError("");
    try { const response = await fetch(`${base()}/api/books/admin/verify`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); if (!response.ok) return setLoginError("Incorrect password."); window.sessionStorage.setItem("airbooks_admin_password", password); setSavedPassword(password); }
    catch { setLoginError("Couldn't reach the server."); }
  }

  async function saveCollection() {
    if (!savedPassword || !title.trim() || !selected.length) return setMessage("Enter a title and select at least one book.");
    const name = title.trim();
    if (!editing && published.some((item) => item.title.toLowerCase() === name.toLowerCase())) return setMessage("That collection already exists.");
    setBusy(true); setMessage("");
    try {
      const old = editing ? published.find((item) => item.title === editing) : null;
      const oldBooks = old?.books || [];
      const targetIds = new Set(selected);
      const all = new Map<string, Book>();
      [...oldBooks, ...selectedBooks, ...books].forEach((book) => all.set(book.id, book));
      const idsToUpdate = new Set([...oldBooks.map((b) => b.id), ...selected]);
      const tagsToAdd = collectionTags(name, description, curator, quote);
      for (const id of idsToUpdate) {
        const book = all.get(id); if (!book) continue;
        let tags = [...(book.tags || [])]; if (editing) tags = removeCollection(tags, editing); if (targetIds.has(id)) tags = Array.from(new Set([...tags, ...tagsToAdd]));
        await api(`/api/books/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Admin-Password": savedPassword }, body: JSON.stringify({ tags }) });
      }
      const fresh = await loadPublished();
      const actual = fresh.find((item) => item.title === name);
      setEditing(name);
      if (!actual) setMessage(`The server did not return “${name}” after saving. Check the backend write.`);
      else if (actual.books.length !== selected.length) setMessage(`Saved, but the server currently has ${actual.books.length} of ${selected.length} selected books in “${name}”. The collection was reloaded from the backend so you can see the real state.`);
      else setMessage(`Saved “${name}” — ${actual.books.length} books confirmed by the server.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't save collection."); }
    finally { setBusy(false); }
  }

  async function deleteCollection(item: Collection) {
    if (!savedPassword || !confirm(`Remove “${item.title}” from recommendation shelves?`)) return;
    setBusy(true); setMessage("");
    try {
      const data = await api(`/api/books?tag=${encodeURIComponent(TITLE + item.title)}&limit=${PAGE_SIZE}&offset=0`);
      const currentBooks = (data.books || []) as Book[];
      if (!currentBooks.length) { await loadPublished(); setMessage(`“${item.title}” is already absent from the server.`); return; }
      for (const book of currentBooks) {
        await api(`/api/books/${encodeURIComponent(book.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", "X-Admin-Password": savedPassword }, body: JSON.stringify({ tags: removeCollection(book.tags || [], item.title) }) });
      }
      const verify = await api(`/api/books?tag=${encodeURIComponent(TITLE + item.title)}&limit=1&offset=0`);
      await loadPublished();
      // `total` from this backend is the whole library count; `count` is the
      // filtered result count, which is what we must use to verify deletion.
      if (Number(verify.count || 0) > 0) throw new Error(`The server still reports ${verify.count} book(s) in this collection after deletion.`);
      if (editing === item.title) reset();
      setMessage(`Removed “${item.title}” — confirmed by the server.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Couldn't remove collection."); }
    finally { setBusy(false); }
  }

  if (!savedPassword) return <main className="min-h-screen bg-[#11100f] px-5 py-20 text-white"><form onSubmit={login} className="mx-auto max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-7"><p className="font-mono text-[9px] uppercase tracking-[.3em] text-slate-500">AirBooks · Curated shelves</p><h1 className="mt-4 text-2xl font-semibold">Recommendation admin</h1><p className="mt-2 text-sm text-slate-500">Use the same password as the main admin.</p><input autoFocus type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="Admin password" className="mt-5 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm" />{loginError&&<p className="mt-3 text-sm text-rose-400">{loginError}</p>}<button disabled={!password} className="mt-4 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">Enter</button></form></main>;

  return <main className="min-h-screen bg-[#11100f] px-4 py-6 text-slate-100 sm:px-7"><div className="mx-auto max-w-[1450px]">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-800 pb-5"><div><Link href="/admin" className="text-xs text-slate-500 hover:text-white">← Book admin</Link><h1 className="mt-3 text-2xl font-semibold">Recommendation shelves</h1><p className="mt-1 text-sm text-slate-500">Create collections, choose real books, and publish the editorial shelf.</p></div><div className="flex gap-2"><button type="button" onClick={()=>loadPublished()} disabled={busy} className="rounded-full border border-slate-700 px-4 py-2 text-xs"><RefreshCw className="mr-1 inline h-3.5 w-3.5"/> Refresh</button><button type="button" onClick={reset} className="rounded-full border border-slate-700 px-4 py-2 text-xs"><Plus className="mr-1 inline h-3.5 w-3.5"/> New collection</button></div></div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
      <section className="rounded-3xl border border-slate-800 bg-slate-950 p-5"><p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">{editing?"Edit collection":"New collection"}</p><input value={title} onChange={(e)=>setTitle(e.target.value)} placeholder="Collection title" className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"/><textarea value={description} onChange={(e)=>setDescription(e.target.value)} placeholder="Short description" rows={3} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"/><input value={curator} onChange={(e)=>setCurator(e.target.value)} placeholder="Recommended by · optional" className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"/><textarea value={quote} onChange={(e)=>setQuote(e.target.value)} placeholder="Quote · optional" rows={3} className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-3 text-sm"/><p className="mt-3 rounded-xl border border-slate-800 p-3 text-xs text-slate-500">{selected.length} selected</p><button type="button" onClick={saveCollection} disabled={busy} className="mt-3 w-full rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black disabled:opacity-40">{busy?"Saving…":editing?"Save changes":"Publish collection"}</button>{message&&<p className="mt-3 text-xs leading-5 text-slate-400">{message}</p>}</section>
      <section><div className="flex gap-2"><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search books" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm"/><span className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-500">{total.toLocaleString()} total</span></div><p className="mt-2 text-[11px] text-slate-600">Showing {books.length} matching books. Search by title or author to select any book from the library. Selected books stay selected when you change the search.</p><div className="mt-3 grid max-h-[600px] grid-cols-3 gap-2 overflow-auto sm:grid-cols-5 lg:grid-cols-7 xl:grid-cols-8">{books.map((book)=><button key={book.id} type="button" onClick={()=>toggle(book.id)} className={`relative overflow-hidden rounded-2xl border text-left ${selected.includes(book.id)?"border-white bg-slate-800":"border-slate-800 bg-slate-950"}`}><div className="aspect-[3/4] bg-slate-900">{book.cover_message_id?<img src={`${base()}/api/books/${encodeURIComponent(book.id)}/cover?v=${encodeURIComponent(book.updated_at||"")}`} alt="" className="h-full w-full object-cover"/>:<div className="flex h-full items-end p-2 font-display text-sm text-slate-400">{book.title}</div>}</div><div className="p-2"><p className="line-clamp-2 text-[11px] leading-4">{book.title}</p><p className="mt-1 line-clamp-1 text-[9px] text-slate-600">{book.author}</p></div>{selected.includes(book.id)&&<span className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-[9px] text-black">✓</span>}</button>)}</div></section>
    </div>
    <section className="mt-10 border-t border-slate-800 pt-7"><div className="flex items-center justify-between"><p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">Published collections · {published.length}</p><button type="button" onClick={()=>loadPublished()} className="text-xs text-slate-500 hover:text-white">Reload from server</button></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{published.map((item)=><div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-950 p-4"><div className="flex items-start justify-between gap-3"><div><h2 className="font-display text-xl">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.books.length} books{item.curator?` · ${item.curator}`:""}</p></div><div><button type="button" onClick={()=>editCollection(item)} disabled={busy} className="mr-1 rounded-lg border border-slate-800 px-3 py-2 text-xs">Edit</button><button type="button" onClick={()=>deleteCollection(item)} disabled={busy} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5"/></button></div></div><p className="mt-3 text-xs leading-5 text-slate-500">{item.description}</p></div>)}{!published.length&&<p className="rounded-2xl border border-dashed border-slate-800 p-6 text-sm text-slate-600">No collections yet.</p>}</div></section>
  </div></main>;
}
