import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

/**
 * Schützt ALLE Seiten und API-Routes. Ohne gültiges, signiertes Cookie:
 * - Seiten      → Redirect auf /login?next=<originalpfad>
 * - API-Routes  → 401 JSON
 *
 * Öffentlich (immer ohne Login erreichbar): /login, /api/login, /api/logout
 * sowie Next-interne Assets. Fail-closed: fehlt AUTH_SECRET, wird alles
 * geblockt.
 */

const PUBLIC_PATHS = new Set(["/login", "/api/login", "/api/logout"]);

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Next-interne Assets und Favicon.
  if (
    pathname.startsWith("/_next/static") ||
    pathname.startsWith("/_next/image") ||
    pathname === "/favicon.ico"
  ) {
    return true;
  }
  return false;
}

function isApiPath(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  // Fail-closed: ohne Secret ist keine Verifikation möglich → alles blocken.
  const authorized = secret ? await verifySessionToken(secret, token) : false;

  if (authorized) {
    return NextResponse.next();
  }

  if (isApiPath(pathname)) {
    return NextResponse.json({ error: "Nicht autorisiert" }, { status: 401 });
  }

  const loginUrl = req.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // Auf allen Pfaden laufen; Feinabstimmung passiert in isPublicPath().
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
