"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  // Auf der Login-Seite gibt es nichts auszuloggen.
  if (pathname === "/login") return null;

  async function handleLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Selbst bei Fehler zur Login-Seite — Cookie wird dort ohnehin geprüft.
    } finally {
      window.location.assign("/login");
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium text-ash transition hover:bg-smoke/60 hover:text-brand-dark focus:outline-none focus:ring-4 focus:ring-brand-purple/20 disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" />
      {loading ? "…" : "Abmelden"}
    </button>
  );
}
