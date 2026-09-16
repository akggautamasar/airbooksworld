import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const match = request.nextUrl.pathname.match(/^\/book\/([^/]+)$/);
  if (!match) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = `/book/${match[1]}/volume`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/book/:id"],
};
