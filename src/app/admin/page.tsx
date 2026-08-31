"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Lock,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  ShieldAlert,
  LogOut,
  ImagePlus,
  Sparkles,
  Wand2,
  FileText,
} from "lucide-react";
import {
  fetchBooks,
  verifyAdminPassword,
  adminUpdateBook,
  adminDeleteBook,
  adminUploadCover,
  adminGenerateCover,
  adminGenerateAllCovers,
  getStoredAdminPassword,
  storeAdminPassword,
  clearAdminPassword,
  formatSize,
  getCoverUrl,
  type Book,
  type GenerateAllCoversResult,
} from "@/lib/api";

function CoverThumb({
  book,
  password,
  onUpdated,
}: {
  book: Book;
  password: string;
  onUpdated: (b: Book) => void;
}) {
  const [failed, setFailed] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasCover = !!book.cover_message_id && !failed;
  const busy = uploading || generating;

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again later
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const updated = await adminUploadCover(book.id, password, file);
      setFailed(false);
      onUpdated(updated);
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      const updated = await adminGenerateCover(book.id, password, true);
      setFailed(false);
      onUpdated(updated);
    } catch {
      setError("Generate failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="shrink-0 flex flex-col items-center gap-1.5">
      <div className="relative w-14 h-[74px] rounded-lg overflow-hidden border border-slate-700 bg-slate-800 flex items-center justify-center">
        {hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={getCoverUrl(book.id, book.updated_at)}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setFailed(true)}
          />
        ) : (
          <FileText className="w-5 h-5 text-slate-600" />
        )}
        {busy && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          </div>
        )}
      </div>
      <div className="flex items-center gap-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFilePicked}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          title="Upload cover"
          className="p-1 rounded text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <ImagePlus className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          title={hasCover ? "Regenerate from first page" : "Generate from first page"}
          className="p-1 rounded text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          <Wand2 className="w-3.5 h-3.5" />
        </button>
      </div>
      {error && <p className="text-[10px] text-rose-400 text-center leading-tight">{error}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [password, setPassword] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState("");
  const [checking, setChecking] = useState(false);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Book>>({});
  const [actionError, setActionError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [generatingAll, setGeneratingAll] = useState(false);
  const [generateAllResult, setGenerateAllResult] = useState<GenerateAllCoversResult | null>(null);

  useEffect(() => {
    const stored = getStoredAdminPassword();
    if (stored) setPassword(stored);
  }, []);

  const loadBooks = useCallback(async () => {
    setLoadingBooks(true);
    try {
      // The backend caps every single request at 200 books (see
      // utils/books_routes.py), so a library bigger than that can never
      // come back from one call — it was silently truncated here before.
      // Keep paging with offset until we've pulled everything the backend
      // says exists.
      const PAGE_SIZE = 200;
      let all: Book[] = [];
      let offset = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const res = await fetchBooks({ limit: PAGE_SIZE, offset });
        all = all.concat(res.books);
        offset += res.books.length;
        if (res.books.length < PAGE_SIZE || offset >= res.total) break;
      }
      setBooks(all);
    } finally {
      setLoadingBooks(false);
    }
  }, []);

  useEffect(() => {
    if (password) loadBooks();
  }, [password, loadBooks]);

  function handleCoverUpdated(updated: Book) {
    setBooks((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));
  }

  async function handleGenerateAll() {
    if (!password) return;
    setGeneratingAll(true);
    setGenerateAllResult(null);
    setActionError("");
    try {
      const result = await adminGenerateAllCovers(password);
      setGenerateAllResult(result);
      await loadBooks();
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid admin password")) {
        setActionError("Your session expired — log in again.");
        logout();
      } else {
        setActionError("Couldn't generate covers. Try again.");
      }
    } finally {
      setGeneratingAll(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
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
      setAuthError("Couldn't reach the server. Try again.");
    } finally {
      setChecking(false);
    }
  }

  function logout() {
    clearAdminPassword();
    setPassword(null);
    setPasswordInput("");
  }

  function startEdit(book: Book) {
    setEditingId(book.id);
    setEditForm({
      title: book.title,
      author: book.author,
      description: book.description,
      language: book.language,
      tags: book.tags,
    });
    setActionError("");
  }

  async function saveEdit(id: string) {
    if (!password) return;
    setActionError("");
    try {
      const updated = await adminUpdateBook(id, password, editForm);
      setBooks((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid admin password")) {
        setActionError("Your session expired — log in again.");
        logout();
      } else {
        setActionError("Couldn't save changes. Try again.");
      }
    }
  }

  async function handleDelete(id: string) {
    if (!password) return;
    if (!confirm("Remove this book from the library? The file stays in Telegram.")) return;
    setDeletingId(id);
    setActionError("");
    try {
      await adminDeleteBook(id, password);
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid admin password")) {
        setActionError("Your session expired — log in again.");
        logout();
      } else {
        setActionError("Couldn't delete this book. Try again.");
      }
    } finally {
      setDeletingId(null);
    }
  }

  if (!password) {
    return (
      <div className="max-w-sm mx-auto px-4 py-24">
        <div className="flex flex-col items-center text-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-brand-500/15 flex items-center justify-center">
            <Lock className="w-5 h-5 text-brand-400" />
          </div>
          <h1 className="text-xl font-bold text-slate-100">Admin access</h1>
          <p className="text-sm text-slate-500">Enter the admin password to manage books.</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="password"
            autoFocus
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            placeholder="Password"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
          />
          {authError && (
            <p className="text-sm text-rose-400 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" /> {authError}
            </p>
          )}
          <button
            type="submit"
            disabled={checking || !passwordInput}
            className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-colors"
          >
            {checking && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Manage books</h1>
          <p className="text-sm text-slate-500">{books.length} book{books.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateAll}
            disabled={generatingAll}
            title="Generate covers for every book that doesn't have one yet — existing covers are left untouched"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-brand-500 hover:text-brand-300 text-slate-300 text-sm transition-colors disabled:opacity-50"
          >
            {generatingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            Generate all covers
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>

      {generateAllResult && (
        <div className="mb-4 text-sm text-slate-300 bg-slate-900/60 border border-slate-800 rounded-xl px-4 py-2.5">
          Generated {generateAllResult.generated} cover
          {generateAllResult.generated === 1 ? "" : "s"}
          {generateAllResult.skipped > 0 &&
            ` · skipped ${generateAllResult.skipped} that already had one`}
          {generateAllResult.failed.length > 0 &&
            ` · ${generateAllResult.failed.length} failed`}
          .
        </div>
      )}

      {actionError && (
        <div className="mb-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 shrink-0" /> {actionError}
        </div>
      )}

      {loadingBooks ? (
        <div className="flex items-center gap-2 text-slate-500 py-16 justify-center">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading books…
        </div>
      ) : books.length === 0 ? (
        <p className="text-slate-500 py-16 text-center">No books yet.</p>
      ) : (
        <div className="rounded-2xl border border-slate-800 overflow-hidden">
          {books.map((book) => (
            <div key={book.id} className="border-b border-slate-800 last:border-b-0 bg-slate-900/40">
              {editingId === book.id ? (
                <div className="p-4 space-y-3">
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      value={editForm.title ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Title"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={editForm.author ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, author: e.target.value }))}
                      placeholder="Author"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <textarea
                    value={editForm.description ?? ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                  <div className="grid sm:grid-cols-2 gap-3">
                    <input
                      value={(editForm.tags ?? []).join(", ")}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                        }))
                      }
                      placeholder="Tags, comma separated"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                    <input
                      value={editForm.language ?? ""}
                      onChange={(e) => setEditForm((f) => ({ ...f, language: e.target.value }))}
                      placeholder="Language"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => saveEdit(book.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:border-slate-500 text-slate-300 text-sm transition-colors"
                    >
                      <X className="w-3.5 h-3.5" /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 flex items-center gap-4">
                  <CoverThumb book={book} password={password} onUpdated={handleCoverUpdated} />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/book/${book.id}`}
                      className="font-medium text-slate-100 hover:text-brand-300 transition-colors truncate block"
                    >
                      {book.title}
                    </Link>
                    <p className="text-sm text-slate-500 truncate">
                      {book.author || "Unknown author"} · {formatSize(book.size)}
                      {book.reader_status && (
                        <>
                          {" "}
                          ·{" "}
                          <span
                            className={
                              book.reader_status === "ready"
                                ? "text-emerald-400"
                                : book.reader_status === "converting"
                                  ? "text-amber-400"
                                  : "text-slate-500"
                            }
                          >
                            reader: {book.reader_status}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(book)}
                      className="p-2 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(book.id)}
                      disabled={deletingId === book.id}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      {deletingId === book.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
