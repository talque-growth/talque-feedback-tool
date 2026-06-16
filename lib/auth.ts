/**
 * Edge-kompatible Auth-Helfer.
 *
 * Bewusst NUR Web-Crypto (`crypto.subtle`) — kein `node:crypto` —, damit der
 * Code auch im Edge-Runtime der Middleware läuft.
 */

/** Name des Session-Cookies (httpOnly, signiert). */
export const AUTH_COOKIE_NAME = "talque_auth";

const encoder = new TextEncoder();

/** base64url-Encoding ohne Padding (Uint8Array → string). */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url-Decoding (string → Uint8Array). */
function fromBase64Url(value: string): Uint8Array {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Konstantzeit-Vergleich zweier Strings. Verhindert, dass aus der
 * Antwortzeit auf Passwort- oder Signatur-Inhalte geschlossen werden kann.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  // Länge fließt absichtlich erst am Ende ein; die Schleife läuft immer über
  // die maximale Länge, damit die Laufzeit nicht von der Eingabe abhängt.
  const len = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < len; i++) {
    diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return diff === 0;
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function sign(secret: string, data: string): Promise<string> {
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return toBase64Url(new Uint8Array(sig));
}

type SessionPayload = { exp: number };

/**
 * Erzeugt ein signiertes Token im Format
 * `base64url(payload).base64url(HMAC-SHA256)`.
 * payload = `{ exp: <ablauf-in-ms-seit-epoch> }`.
 */
export async function createSessionToken(
  secret: string,
  ttlMs: number,
): Promise<string> {
  const payload: SessionPayload = { exp: Date.now() + ttlMs };
  const encodedPayload = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await sign(secret, encodedPayload);
  return `${encodedPayload}.${signature}`;
}

/**
 * Prüft Signatur (Konstantzeit) und Ablauf eines Tokens.
 * Gibt `true` nur zurück, wenn beides gültig ist.
 */
export async function verifySessionToken(
  secret: string,
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  const [encodedPayload, signature] = parts;
  if (!encodedPayload || !signature) return false;

  const expected = await sign(secret, encodedPayload);
  if (!timingSafeEqual(signature, expected)) return false;

  try {
    const json = new TextDecoder().decode(fromBase64Url(encodedPayload));
    const payload = JSON.parse(json) as Partial<SessionPayload>;
    if (typeof payload.exp !== "number") return false;
    return payload.exp > Date.now();
  } catch {
    return false;
  }
}
