"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { Search } from "lucide-react";

export function ChipMultiSelect({
  value,
  onChange,
  options,
  searchable = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ label: string; value: string }>;
  searchable?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  return (
    <div className="space-y-3">
      {searchable && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Suche in der Liste…"
            className="h-10 w-full rounded-xl border border-smoke bg-white pl-10 pr-3 text-[14px] focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15"
          />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {filtered.map((o) => {
          const active = value.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={cn(
                "rounded-chip border px-3.5 py-1.5 text-[13px] font-medium transition",
                active
                  ? "border-brand-purple bg-brand-purple text-white"
                  : "border-smoke bg-white text-brand-dark hover:border-brand-purple/40",
              )}
            >
              {o.label}
            </button>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-[13px] text-ash">Keine Treffer für „{query}".</p>
        )}
      </div>
      {value.length > 0 && (
        <p className="text-[12px] text-ash">
          {value.length} ausgewählt
        </p>
      )}
    </div>
  );
}
