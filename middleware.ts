import { NextResponse, type NextRequest } from "next/server";
import { REVIEWER_SESSION_COOKIE } from "@/lib/reviewer-session-constants";

function isProtectedPath(pathname: string) {
  return pathname.startsWith("/sections") || pathname.startsWith("/admin");
}

export async function middleware(request: NextRequest) {
  if (!request.cookies.get(REVIEWER_SESSION_COOKIE) && isProtectedPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ["/sections/:path*", "/admin"]
};
