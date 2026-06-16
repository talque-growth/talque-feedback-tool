/**
 * Open-Redirect-Schutz: lässt nur interne, absolute Pfade zu.
 * Erlaubt sind Pfade, die mit "/" beginnen, aber nicht mit "//" (das wäre eine
 * protokoll-relative externe URL) und nicht mit "/\" (Browser-Sonderfall).
 * Alles andere fällt auf "/" zurück.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//")) return fallback;
  if (next.startsWith("/\\")) return fallback;
  return next;
}
