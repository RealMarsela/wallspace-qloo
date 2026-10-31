import { NextResponse, type NextRequest } from "next/server";
import { isPublicApi } from "@/server/auth/public-api";

// Edge middleware: a cookie check only (the edge cannot reach D1). Whether the session is still valid is decided by the API routes
// (401 on an expired or forged cookie) and by the client guard in the /app layout, which calls /api/me once.
const SESSION_COOKIE = /(?:^|;\s*)(?:__Secure-)?wallspace\.session_token=[^;\s]+/;

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = SESSION_COOKIE.test(request.headers.get("cookie") ?? "");
  if (hasSession) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    if (isPublicApi(request.method, request.nextUrl)) return NextResponse.next();
    return NextResponse.json({ error: "Sign in to continue.", code: "unauthorized" }, { status: 401, headers: { "cache-control": "no-store" } });
  }

  const to = request.nextUrl.clone();
  to.pathname = "/signin";
  to.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(to);
}

export const config = { matcher: ["/app", "/app/:path*", "/api/:path*"] };
