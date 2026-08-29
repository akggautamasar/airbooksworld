const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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
  if (!res.ok) throw new Error(`Book not found`);
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
