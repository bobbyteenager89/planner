import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — no auth check needed
  if (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/invite") ||
    pathname.startsWith("/invite") ||
    (pathname.includes("/intake") && pathname.includes("/trips/")) ||
    (pathname.includes("/share") && pathname.includes("/trips/")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/share")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/og")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/packing-list")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/feedback")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/sign-off")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/sign-offs")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/households")) ||
    (pathname.startsWith("/api/trips/") && pathname.includes("/finalize")) ||
    (pathname.startsWith("/api/trips/") && pathname.endsWith("/ops/update")) ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Check for NextAuth session cookie
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token") ??
    request.cookies.get("authjs.session-token");

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
