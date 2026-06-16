"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { Field, TextInput } from "@/components/Field";
import { safeNextPath } from "@/lib/safeRedirect";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        // Hartes Navigieren, damit die Middleware das frische Cookie sieht.
        window.location.assign(safeNextPath(next));
        return;
      }
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Anmeldung fehlgeschlagen");
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Passwort" required>
        <TextInput
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="Firmen-Passwort"
        />
      </Field>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={loading}>
        {loading ? "Wird geprüft…" : "Anmelden"}
      </Button>
    </form>
  );
}
