"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { DealCard, statusOf } from "./DealCard";
import type { DealListItem } from "@/lib/hubspot";
import { cn } from "@/lib/cn";

type FilterKey = "all" | "last30" | "last90" | "open" | "risk";

const DAY = 24 * 60 * 60 * 1000;

function withinDays(deal: DealListItem, days: number): boolean {
  if (!deal.closedate) return false;
  return Date.now() - new Date(deal.closedate).getTime() <= days * DAY;
}

const isRisk = (d: DealListItem) =>
  ["unsicher", "eher_nicht", "sicher_nicht"].includes(d.rebookingWahrscheinlichkeit);

export function DealListClient({ deals }: { deals: DealListItem[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");

  const counts = useMemo(
    () =>
      ({
        all: deals.length,
        last30: deals.filter((d) => withinDays(d, 30)).length,
        last90: deals.filter((d) => withinDays(d, 90)).length,
        open: deals.filter((d) => !d.feedbackTerminDurchgefuehrt).length,
        risk: deals.filter(isRisk).length,
      }) satisfies Record<FilterKey, number>,
    [deals],
  );

  const filtered = useMemo(() => {
    return deals.filter((d) => {
      if (filter === "last30" && !withinDays(d, 30)) return false;
      if (filter === "last90" && !withinDays(d, 90)) return false;
      if (filter === "open" && d.feedbackTerminDurchgefuehrt) return false;
      if (filter === "risk" && !isRisk(d)) return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const hay = [d.dealname, d.companyName, d.contactName]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [deals, query, filter]);

  const pills: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "Alle (1 Jahr)" },
    { key: "last90", label: "Letzte 90 Tage" },
    { key: "last30", label: "Letzte 30 Tage" },
    { key: "open", label: "Feedback offen" },
    { key: "risk", label: "Re-Booking-Risiko" },
  ];

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ash" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Suche nach Event-Name, Kunde, Ansprechpartner…"
          className="h-12 w-full rounded-card border border-smoke bg-white pl-11 pr-4 text-[15px] focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {pills.map((p) => {
          const active = filter === p.key;
          const count = counts[p.key];
          return (
            <button
              key={p.key}
              onClick={() => setFilter(p.key)}
              className={cn(
                "rounded-chip border px-4 py-2 text-[13px] font-medium transition",
                active
                  ? "border-brand-purple bg-brand-purple text-white"
                  : "border-smoke bg-white text-brand-dark hover:border-brand-purple/40",
              )}
            >
              {p.label}
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-[11px]",
                  active ? "bg-white/20" : "bg-smoke text-ash",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-smoke bg-white p-10 text-center">
          <div className="text-[15px] font-medium text-brand-dark">
            Keine Deals gefunden
          </div>
          <p className="mt-2 text-[13px] text-ash">
            Passe den Filter oder die Suche an. Es werden Closed-Won-Deals der
            letzten 365 Tage angezeigt.
          </p>
          <button
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-4 text-[13px] font-medium text-brand-purple hover:underline"
          >
            Filter zurücksetzen
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((d) => (
            <li key={d.id}>
              <DealCard deal={d} />
            </li>
          ))}
        </ul>
      )}
      <p className="pt-4 text-[12px] text-ash">
        Status-Logik:{" "}
        <span className="font-medium text-brand-dark">
          {filtered.filter((d) => statusOf(d) === "open").length} offen
        </span>
        ,{" "}
        <span className="font-medium text-brand-dark">
          {filtered.filter((d) => statusOf(d) === "captured").length} erfasst
        </span>
        ,{" "}
        <span className="font-medium text-brand-dark">
          {filtered.filter((d) => statusOf(d) === "overdue").length} überfällig
        </span>
        .
      </p>
    </div>
  );
}
