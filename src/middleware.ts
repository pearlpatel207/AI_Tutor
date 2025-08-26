import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  console.log("🔒 Middleware running for:", req.nextUrl.pathname);

  const token = req.cookies.get("session")?.value;
  const isAuthPage = req.nextUrl.pathname.startsWith("/api/auth");

  if (!token && !isAuthPage) {
    return NextResponse.redirect(new URL("/api/auth", req.url));
  }

  if (token && isAuthPage) {
    console.log("✅ Logged in, redirecting to home");
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};