import { NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  timingSafeEqual,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage

export async function POST(req: Request) {
  const appPassword = process.env.APP_PASSWORD;
  const secret = process.env.AUTH_SECRET;

  if (!appPassword || !secret) {
    console.error("[/api/login] APP_PASSWORD oder AUTH_SECRET fehlt");
    return NextResponse.json(
      { error: "Server nicht konfiguriert" },
      { status: 500 },
    );
  }

  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    if (typeof body.password === "string") {
      password = body.password;
    }
  } catch {
    // Kein/ungültiger JSON-Body → leeres Passwort, schlägt unten fehl.
  }

  if (!timingSafeEqual(password, appPassword)) {
    return NextResponse.json({ error: "Falsches Passwort" }, { status: 401 });
  }

  const token = await createSessionToken(secret, SESSION_TTL_MS);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
  return res;
}
