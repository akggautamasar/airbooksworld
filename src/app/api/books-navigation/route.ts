import { NextResponse } from "next/server";
import { fetchBooks } from "@/lib/api";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 100), 1), 100);
    const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
    const data = await fetchBooks({ limit, offset });
    return NextResponse.json(data, { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } });
  } catch (error) {
    return NextResponse.json({ status: "error", total: 0, count: 0, books: [], error: error instanceof Error ? error.message : "Unable to load catalogue" }, { status: 502 });
  }
}
