const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export type ReaderStatus = "ready" | "converting" | "failed" | "unsupported";

export type Book = {
  id: string;
  title: string;
  author: string;
  description: string;
  tags: string[];
  language: string;
  filename: string;
  message_id: number;
  cover_message_id?: number | null;
  size: number;
  uploaded_at: string;
  updated_at: string;
  reader_format?: string | null;
  reader_status?: ReaderStatus;
  reader_error?: string | null;
  file_hash?: string | null;
};

export type ReaderInfo = {
  status: string;
  reader_status: ReaderStatus;
  reader_format: string | null;
  reader_error: string | null;
  reader_url: string | null;
};

export type BooksResponse = {
  status: string;
  total: number;
  count: number;
  books: Book[];
};

function getBase() {
  if (!API_URL) {
    console.warn("NEXT_PUBLIC_API_URL is not set");
  }
  return API_URL.replace(/\/$/, "");
}

const ADMIN_TOKEN_KEY = "airbooks_admin_password";

export function getStoredAdminPassword(): string | null {
  if (typeof window === "undefined") return null;
  return window.sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

export function storeAdminPassword(password: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ADMIN_TOKEN_KEY, password);
}

export function clearAdminPassword() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

export async function fetchBooks(params: {
  q?: string;
  tag?: string;
  author?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<BooksResponse> {
  const sp = new URLSearchParams();
  if (params.q) sp.set("q", params.q);
  if (params.tag) sp.set("tag", params.tag);
  if (params.author) sp.set("author", params.author);
  if (params.limit) sp.set("limit", String(params.limit));
  if (params.offset) sp.set("offset", String(params.offset));

  const res = await fetch(`${getBase()}/api/books?${sp.toString()}`, {
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Failed to fetch books: ${res.status}`);
  return res.json();
}

export async function fetchBook(id: string): Promise<Book> {
  const res = await fetch(`${getBase()}/api/books/${id}`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("Book not found");
    // Don't relabel a real server error as "not found" — that hid the
    // actual cause (a 500) behind a misleading message last time and made
    // this much harder to diagnose than it needed to be.
    throw new Error(`Failed to load book (server returned ${res.status})`);
  }
  const data = await res.json();
  return data.book;
}

export async function fetchTags(): Promise<string[]> {
  const res = await fetch(`${getBase()}/api/books/tags`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.tags || [];
}

export function getDownloadUrl(bookId: string) {
  return `${getBase()}/api/books/${bookId}/download`;
}

export function getCoverUrl(bookId: string, version?: string | number) {
  const base = `${getBase()}/api/books/${bookId}/cover`;
  // Cache-bust with the book's updated_at so a freshly uploaded/generated
  // cover shows up immediately instead of an old cached image.
  return version ? `${base}?v=${encodeURIComponent(version)}` : base;
}

export async function fetchReaderInfo(bookId: string): Promise<ReaderInfo> {
  const res = await fetch(`${getBase()}/api/books/${bookId}/reader-info`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to fetch reader info: ${res.status}`);
  return res.json();
}

export function getReaderFileUrl(bookId: string) {
  return `${getBase()}/api/books/${bookId}/reader-file`;
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const res = await fetch(`${getBase()}/api/books/admin/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  return res.ok;
}

export async function adminUpdateBook(
  bookId: string,
  password: string,
  updates: Partial<Pick<Book, "title" | "author" | "description" | "tags" | "language">>
): Promise<Book> {
  const res = await fetch(`${getBase()}/api/books/${bookId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Password": password,
    },
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to update book: ${res.status}`);
  }
  const data = await res.json();
  return data.book;
}

export async function adminDeleteBook(bookId: string, password: string): Promise<void> {
  const res = await fetch(`${getBase()}/api/books/${bookId}`, {
    method: "DELETE",
    headers: { "X-Admin-Password": password },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to delete book: ${res.status}`);
  }
}

export async function adminUploadCover(
  bookId: string,
  password: string,
  file: File
): Promise<Book> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${getBase()}/api/books/${bookId}/cover`, {
    method: "POST",
    headers: { "X-Admin-Password": password },
    body: form,
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to upload cover: ${res.status}`);
  }
  const data = await res.json();
  return data.book;
}

export async function adminGenerateCover(
  bookId: string,
  password: string,
  force: boolean = true
): Promise<Book> {
  const res = await fetch(
    `${getBase()}/api/books/${bookId}/cover/generate?force=${force}`,
    {
      method: "POST",
      headers: { "X-Admin-Password": password },
    }
  );
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to generate cover: ${res.status}`);
  }
  const data = await res.json();
  return data.book;
}

export type GenerateAllCoversResult = {
  total_missing: number;
  generated: number;
  skipped: number;
  failed: string[];
};

export async function adminGenerateAllCovers(
  password: string
): Promise<GenerateAllCoversResult> {
  const res = await fetch(`${getBase()}/api/books/covers/generate-all`, {
    method: "POST",
    headers: { "X-Admin-Password": password },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to generate covers: ${res.status}`);
  }
  return res.json();
}

export type DuplicateGroup = {
  method: "identical_file" | "same_name_and_size";
  books: (Book & { suggested_keep: boolean })[];
};

export type DuplicatesResponse = {
  status: string;
  group_count: number;
  duplicate_book_count: number;
  groups: DuplicateGroup[];
};

export async function fetchDuplicateGroups(
  password: string
): Promise<DuplicatesResponse> {
  const res = await fetch(`${getBase()}/api/books/admin/duplicates`, {
    headers: { "X-Admin-Password": password },
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid admin password");
    throw new Error(`Failed to fetch duplicates: ${res.status}`);
  }
  return res.json();
}

// ---------------------------------------------------------------------------
// Bulk import from a Telegram channel
// ---------------------------------------------------------------------------

export type ImportStatus =
  | "validating"
  | "scanning"
  | "fetching"
  | "deduplicating"
  | "importing"
  | "enriching"
  | "done"
  | "cancelled"
  | "error";

export type ImportProgress = {
  import_id: string;
  status: ImportStatus;
  channel?: string;
  channel_name?: string;
  imported: number;
  skipped: number;
  skipped_duplicate: number;
  skipped_not_book: number;
  /** Messages the server's Telegram client could not parse; skipped, not books. */
  skipped_unreadable?: number;
  /** "scan-first" normally; "forward-first" when the bot cannot read the source. */
  import_method?: "scan-first" | "forward-first" | null;
  read_access?: boolean | null;
  errors: number;
  fetched: number;
  total_scan: number;
  total_media: number;
  batches_done: number;
  enriched: number;
  covers: number;
  enrich_total: number;
  enrich_done?: number;
  skipped_large?: number;
  skipped_memory?: number;
  metadata_updated?: number;
  elapsed?: number;
  error_msg?: string | null;
};

export type StartImportOptions = {
  channel: string;
  start_msg_id?: number | null;
  end_msg_id?: number | null;
  skip_duplicates?: boolean;
  enrich?: boolean;
  generate_covers?: boolean;
};

function adminHeaders(password: string) {
  return { "Content-Type": "application/json", "X-Admin-Password": password };
}

async function adminError(res: Response, fallback: string): Promise<never> {
  if (res.status === 401) throw new Error("Invalid admin password");
  // The backend puts the actual reason in `detail` on a 400 (bad range, no
  // channel, and so on). Showing that beats showing a bare status code.
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.detail || "";
  } catch {
    /* non-JSON error body — fall through to the generic message */
  }
  throw new Error(detail || `${fallback} (${res.status})`);
}

export async function startChannelImport(
  password: string,
  options: StartImportOptions
): Promise<{ import_id: string }> {
  const res = await fetch(`${getBase()}/api/books/admin/import`, {
    method: "POST",
    headers: adminHeaders(password),
    body: JSON.stringify(options),
  });
  if (!res.ok) await adminError(res, "Failed to start import");
  return res.json();
}

export async function fetchImportProgress(
  password: string,
  importId: string
): Promise<ImportProgress> {
  const res = await fetch(
    `${getBase()}/api/books/admin/import/${encodeURIComponent(importId)}`,
    { headers: { "X-Admin-Password": password }, cache: "no-store" }
  );
  if (!res.ok) await adminError(res, "Failed to fetch import progress");
  const data = await res.json();
  return data.data;
}

export async function cancelChannelImport(
  password: string,
  importId: string
): Promise<void> {
  const res = await fetch(
    `${getBase()}/api/books/admin/import/${encodeURIComponent(importId)}/cancel`,
    { method: "POST", headers: { "X-Admin-Password": password } }
  );
  if (!res.ok) await adminError(res, "Failed to cancel import");
}

export async function fetchEnrichStatus(
  password: string
): Promise<{ unenriched: number }> {
  const res = await fetch(`${getBase()}/api/books/admin/enrich-status`, {
    headers: { "X-Admin-Password": password },
    cache: "no-store",
  });
  if (!res.ok) await adminError(res, "Failed to fetch enrich status");
  return res.json();
}

export async function startEnrichPass(
  password: string,
  generateCovers: boolean = true
): Promise<{ import_id: string | null; unenriched: number }> {
  const res = await fetch(`${getBase()}/api/books/admin/enrich`, {
    method: "POST",
    headers: adminHeaders(password),
    body: JSON.stringify({ generate_covers: generateCovers }),
  });
  if (!res.ok) await adminError(res, "Failed to start enrichment");
  return res.json();
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function getFileExt(filename: string): string {
  const parts = filename.split(".");
  return parts.length > 1 ? parts.pop()!.toUpperCase() : "FILE";
}
