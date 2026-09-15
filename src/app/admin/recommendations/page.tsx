"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, Plus, Save, Search, Trash2 } from "lucide-react";
import {
  adminUpdateBook,
  fetchBooks,
  getCoverUrl,
  getStoredAdminPassword,
  storeAdminPassword,
  verifyAdminPassword,
  type Book,
} from "@/lib/api";
import {
  getRecommendations,
  recommendationTags,
  withoutCollectionTags,
} from "@/lib/recommendations";

const PAGE_SIZE = 200;

async function loadAllBooks() {
  let all: Book[] = [];
  let offset = 0;
  while (true) {
    const response = await fetchBooks({ limit: PAGE_SIZE, offset });
    all = all.concat(response.books);
    offset += response.books.length;
    if (response.books.length < PAGE_SIZE || offset >= response.total) break;
  }
  return all;
}

export default function RecommendationAdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [curator, setCurator] = useState("");
  const [quote, setQuote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const stored = getStoredAdminPassword();
    if (stored) setPassword(stored);
  }, []);

  const loadBooks = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setBooks(await loadAllBooks());
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Couldn't load the library.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (password) loadBooks();
  }, [password, loadBooks]);

  const collections = useMemo(() => getRecommendations(books), [books]);
  const filteredBooks = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return books;
    return books.filter((book) => `${book.title} ${book.author}`.toLowerCase().includes(needle));
  }, [books, query]);

  async function login(event: React.FormEvent) {
    event.preventDefault();
    setAuthError("");
    try {
      const ok = await verifyAdminPassword(passwordInput);
      if (!ok) {
        setAuthError("Incorrect password.");
        return;
      }
      storeAdminPassword(passwordInput);
      setPassword(passwordInput);
    } catch {
      setAuthError("Couldn't reach the server.");
    }
  }

  function resetForm() {
    setEditingTitle(null);
    setSelected([]);
    setTitle("");
    setDescription("");
    setCurator("");
    setQuote("");
    setMessage("");
  }

  function editCollection(collection: ReturnType<typeof getRecommendations>[number]) {
    setEditingTitle(collection.title);
    setTitle(collection.title);
    setDescription(collection.description);
    setCurator(collection.curator);
    setQuote(collection.quote);
    setSelected(collection.books.map((book) => book.id));
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleBook(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function selectFiltered() {
    setSelected((current) => Array.from(new Set([...current, ...filteredBooks.map((book) => book.id)])));
  }

  function clearFiltered() {
    const ids = new Set(filteredBooks.map((book) => book.id));
    setSelected((current) => current.filter((id) => !ids.has(id)));
  }

  async function saveCollection() {
    if (!password || !title.trim()) return;
    if (!selected.length) {
      setMessage("Select at least one real book for this collection.");
      return;
    }

    const normalizedTitle = title.trim();
    if (!editingTitle && collections.some((item) => item.title.toLowerCase() === normalizedTitle.toLowerCase())) {
      setMessage("A collection with that title already exists. Edit the existing collection instead.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const previous = editingTitle ? collections.find((item) => item.title === editingTitle) : null;
      const previousIds = new Set(previous?.books.map((book) => book.id) || []);
      const selectedIds = new Set(selected);
      const affectedIds = new Set([...previousIds, ...selectedIds]);
      const metadata = recommendationTags({ title: normalizedTitle, description, curator, quote });
      const updatedById = new Map(books.map((book) => [book.id, book]));

      for (const id of affectedIds) {
        const book = updatedById.get(id);
        if (!book) continue;
        let tags = editingTitle ? withoutCollectionTags(book.tags || [], editingTitle) : [...(book.tags || [])];
        if (selectedIds.has(id)) tags = Array.from(new Set([...tags, ...metadata]));
        const updated = await adminUpdateBook(id, password, { tags });
        updatedById.set(id, updated);
      }

      setBooks(Array.from(updatedById.values()));
      setMessage(`Saved “${normalizedTitle}” with ${selected.length} book${selected.length === 1 ? "" : "s"}.`);
      setEditingTitle(normalizedTitle);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't save the collection.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCollection(collection: ReturnType<typeof getRecommendations>[number]) {
    if (!password) return;
    if (!confirm(`Remove “${collection.title}” from the recommendation shelves? The books themselves will stay in AirBooks.`)) return;
    setSaving(true);
    setMessage("");
    try {
      const updatedById = new Map(books.map((book) => [book.id, book]));
      for (const book of collection.books) {
        const updated = await adminUpdateBook(book.id, password, { tags: withoutCollectionTags(book.tags || [], collection.title) });
        updatedById.set(book.id, updated);
      }
      setBooks(Array.from(updatedById.values()));
      if (editingTitle === collection.title) resetForm();
      setMessage(`Removed “${collection.title}”.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Couldn't remove the collection.");
    } finally {
      setSaving(false);
    }
  }

  if (!password) {
    return (
      <main className="min-h-screen bg-[#11100f] px-5 py-20 text-slate-100">
        <form onSubmit={login} className="mx-auto max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-7 shadow-2xl">
          <div className="mb-7">
            <p className="font-mono text-[9px] uppercase tracking-[.3em] text-slate-500">AirBooks · Curated shelves</p>
            <h1 className="mt-3 text-2xl font-semibold">Recommendation admin</h1>
            <p className="mt-2 text-sm text-slate-500">Use the same admin password as the main book manager.</p>
          </div>
          <input type="password" autoFocus value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} placeholder="Admin password" className="w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-slate-500" />
          {authError && <p className="mt-3 text-sm text-rose-400">{authError}</p>}
          <button disabled={!passwordInput} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 disabled:opacity-40">Enter recommendations</button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#11100f] px-4 py-6 text-slate-100 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <Link href="/admin" className="mb-3 inline-flex items-center gap-2 text-xs text-slate-500 hover:text-slate-200"><ArrowLeft className="h-3.5 w-3.5" /> Back to book admin</Link>
            <h1 className="text-2xl font-semibold tracking-tight">Recommendation shelves</h1>
            <p className="mt-1 text-sm text-slate-500">Create collections, choose real books, and publish the editorial shelf automatically.</p>
          </div>
          <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-xs text-slate-300 hover:border-slate-500"><Plus className="h-3.5 w-3.5" /> New collection</button>
        </div>

        <section className="mt-6 grid gap-6 xl:grid-cols-[360px_1fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-5">
            <p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">{editingTitle ? "Editing collection" : "New collection"}</p>
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Collection title · e.g. Tech & Innovation" className="mt-4 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-slate-500" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Short description" rows={3} className="mt-3 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-slate-500" />
            <input value={curator} onChange={(event) => setCurator(event.target.value)} placeholder="Recommended by · optional" className="mt-3 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-slate-500" />
            <textarea value={quote} onChange={(event) => setQuote(event.target.value)} placeholder="Curator quote · optional" rows={3} className="mt-3 w-full resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-slate-500" />
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-3 text-xs text-slate-500">Selected: <strong className="text-slate-200">{selected.length}</strong> books. Only existing AirBooks books can be placed on a shelf.</div>
            <button type="button" disabled={saving || !title.trim() || !selected.length} onClick={saveCollection} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 disabled:opacity-40">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{editingTitle ? "Save changes" : "Publish collection"}</button>
            {editingTitle && <button type="button" onClick={resetForm} className="mt-2 w-full rounded-xl border border-slate-800 px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200">Cancel editing</button>}
            {message && <p className="mt-3 text-xs leading-5 text-slate-400">{message}</p>}
          </div>

          <div className="min-w-0">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="relative min-w-[220px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-600" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search books by title or author" className="w-full rounded-xl border border-slate-800 bg-slate-950 px-10 py-2.5 text-sm outline-none focus:border-slate-500" />
              </div>
              <button type="button" onClick={selectFiltered} className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-slate-100">Select visible</button>
              <button type="button" onClick={clearFiltered} className="rounded-xl border border-slate-800 px-3 py-2 text-xs text-slate-400 hover:text-slate-100">Clear visible</button>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-800 bg-slate-950/50"><Loader2 className="h-5 w-5 animate-spin text-slate-500" /></div>
            ) : loadError ? (
              <div className="rounded-3xl border border-rose-900/50 bg-rose-950/20 p-6 text-sm text-rose-300">{loadError}</div>
            ) : (
              <div className="grid max-h-[620px] grid-cols-3 gap-2 overflow-auto pr-1 sm:grid-cols-5 lg:grid-cols-7 2xl:grid-cols-9">
                {filteredBooks.map((book) => {
                  const checked = selected.includes(book.id);
                  return (
                    <button key={book.id} type="button" onClick={() => toggleBook(book.id)} className={`group relative overflow-hidden rounded-2xl border text-left transition ${checked ? "border-white/70 bg-slate-800" : "border-slate-800 bg-slate-950 hover:border-slate-600"}`}>
                      <div className="aspect-[3/4] bg-slate-900">
                        {book.cover_message_id ? <img src={getCoverUrl(book.id, book.updated_at)} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" /> : <div className="flex h-full items-end p-2 font-display text-sm text-slate-400">{book.title}</div>}
                      </div>
                      <div className="p-2">
                        <p className="line-clamp-2 text-[11px] leading-4 text-slate-200">{book.title}</p>
                        <p className="mt-1 line-clamp-1 text-[9px] text-slate-600">{book.author}</p>
                      </div>
                      {checked && <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-900 shadow"><Check className="h-3.5 w-3.5" /></span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="mt-10 border-t border-slate-800 pt-7">
          <div className="flex items-end justify-between gap-4"><div><p className="font-mono text-[9px] uppercase tracking-[.25em] text-slate-500">Published</p><h2 className="mt-2 text-xl font-semibold">Current collections</h2></div><span className="text-xs text-slate-600">{collections.length} collection{collections.length === 1 ? "" : "s"}</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <div key={collection.title} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-xl text-slate-100">{collection.title}</h3><p className="mt-1 text-xs text-slate-500">{collection.books.length} books{collection.curator ? ` · ${collection.curator}` : ""}</p></div><div className="flex gap-1"><button type="button" onClick={() => editCollection(collection)} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-white"><Plus className="h-3.5 w-3.5 rotate-45" /></button><button type="button" onClick={() => deleteCollection(collection)} disabled={saving} className="rounded-lg border border-slate-800 p-2 text-slate-400 hover:text-rose-300"><Trash2 className="h-3.5 w-3.5" /></button></div></div>
                <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">{collection.description}</p>
              </div>
            ))}
            {!collections.length && <div className="rounded-2xl border border-dashed border-slate-800 p-8 text-sm text-slate-600">No recommendation collections yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
