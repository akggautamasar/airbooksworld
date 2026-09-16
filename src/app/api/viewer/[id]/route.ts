import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL is not configured" }, { status: 500 });
  }

  try {
    const upstream = await fetch(`${base}/api/books/${encodeURIComponent(params.id)}/download`, {
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: `Unable to load file (${upstream.status})` }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");
    const disposition = upstream.headers.get("content-disposition") || "";

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", disposition.replace(/^attachment/i, "inline") || "inline");
    headers.set("Cache-Control", "private, max-age=300");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { status: 200, headers });
  } catch (error) {
    console.error("Viewer proxy error", error);
    return NextResponse.json({ error: "Unable to load file" }, { status: 502 });
  }
}
