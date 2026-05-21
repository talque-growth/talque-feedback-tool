export function formatCurrency(amount: number): string {
  if (!amount) return "—";
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function relativeFromNow(ts: number): string {
  const diffMs = Date.now() - ts;
  const sec = Math.max(0, Math.floor(diffMs / 1000));
  if (sec < 5) return "gerade eben";
  if (sec < 60) return `vor ${sec} Sek.`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `vor ${min} Min.`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `vor ${hr} Std.`;
  const day = Math.floor(hr / 24);
  return `vor ${day} Tag${day === 1 ? "" : "en"}`;
}
