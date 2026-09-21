import { NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/api";

type Context = { params: { id: string } };

function upstreamHeaders(source: Response) {
  const headers = new Headers();
  for (const name of ["content-type", "content-length", "content-range", "accept-ranges", "content-disposition", "etag", "last-modified", "cache-control"]) {
    const value = source.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, Content-Disposition, Accept-Ranges");
  return headers;
}

export async function GET(request: Request, { params }: Context) {
  try {
    const range = request.headers.get("range");
    const upstream = await fetch(getDownloadUrl(params.id), {
      method: "GET",
      headers: range ? { Range: range } : undefined,
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Book file request failed: ${upstream.status}` }, { status: upstream.status });
    }

    if (range && upstream.status === 200) {
      return NextResponse.json(
        { error: "The book server does not support byte-range downloads required for large AirPages files." },
        { status: 502 }
      );
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: upstreamHeaders(upstream),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to load book file" },
      { status: 502 }
    );
  }
}

export async function HEAD(_request: Request, { params }: Context) {
  try {
    const upstream = await fetch(getDownloadUrl(params.id), { method: "HEAD", cache: "no-store" });
    return new Response(null, { status: upstream.status, headers: upstreamHeaders(upstream) });
  } catch {
    return new Response(null, { status: 502 });
  }
}
