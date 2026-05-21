"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown, Search } from "lucide-react";

type Option = { label: string; value: string };

export function ChipMultiSelect({
  value,
  onChange,
  options,
  searchable = false,
  grouped = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  searchable?: boolean;
  /** Groups options by the prefix before " — " (e.g. "Sessions — Bulk-Upload"). */
  grouped?: boolean;
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

      {grouped ? (
        <GroupedChips
          options={filtered}
          value={value}
          onToggle={toggle}
          query={query}
        />
      ) : (
        <FlatChips options={filtered} value={value} onToggle={toggle} query={query} />
      )}

      {value.length > 0 && (
        <p className="text-[12px] text-ash">{value.length} ausgewählt</p>
      )}
    </div>
  );
}

function FlatChips({
  options,
  value,
  onToggle,
  query,
}: {
  options: Option[];
  value: string[];
  onToggle: (v: string) => void;
  query: string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          option={o}
          active={value.includes(o.value)}
          onClick={() => onToggle(o.value)}
        />
      ))}
      {options.length === 0 && (
        <p className="text-[13px] text-ash">Keine Treffer für „{query}".</p>
      )}
    </div>
  );
}

function GroupedChips({
  options,
  value,
  onToggle,
  query,
}: {
  options: Option[];
  value: string[];
  onToggle: (v: string) => void;
  query: string;
}) {
  const groups = useMemo(() => groupByPrefix(options), [options]);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const isFiltering = query.trim().length > 0;

  if (groups.length === 0) {
    return <p className="text-[13px] text-ash">Keine Treffer für „{query}".</p>;
  }

  const toggleCat = (cat: string) =>
    setOpenCats((s) => ({ ...s, [cat]: !s[cat] }));

  return (
    <div className="space-y-2">
      {groups.map(({ category, items }) => {
        const selectedHere = items.filter((o) => value.includes(o.value)).length;
        const open = isFiltering || openCats[category] || selectedHere > 0;
        return (
          <div
            key={category}
            className="overflow-hidden rounded-xl border border-smoke bg-white"
          >
            <button
              type="button"
              onClick={() => toggleCat(category)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-fog"
            >
              <span className="flex items-center gap-2">
                <span className="text-[14px] font-medium text-brand-dark">
                  {category}
                </span>
                <span className="text-[11px] text-ash">
                  {items.length} Option{items.length === 1 ? "" : "en"}
                </span>
                {selectedHere > 0 && (
                  <span className="rounded-full bg-brand-purple/10 px-2 py-0.5 text-[11px] font-medium text-brand-purple">
                    {selectedHere} ausgewählt
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-ash transition",
                  open ? "rotate-180" : "rotate-0",
                )}
              />
            </button>
            {open && (
              <div className="border-t border-smoke px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  {items.map((o) => (
                    <Chip
                      key={o.value}
                      option={{ label: stripPrefix(o.label, category), value: o.value }}
                      active={value.includes(o.value)}
                      onClick={() => onToggle(o.value)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Chip({
  option,
  active,
  onClick,
}: {
  option: Option;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-chip border px-3.5 py-1.5 text-[13px] font-medium transition",
        active
          ? "border-brand-purple bg-brand-purple text-white"
          : "border-smoke bg-white text-brand-dark hover:border-brand-purple/40",
      )}
    >
      {option.label}
    </button>
  );
}

function groupByPrefix(
  options: Option[],
): Array<{ category: string; items: Option[] }> {
  const order: string[] = [];
  const buckets: Record<string, Option[]> = {};
  for (const o of options) {
    const sep = o.label.indexOf(" — ");
    const category = sep === -1 ? "Sonstiges" : o.label.slice(0, sep).trim();
    if (!buckets[category]) {
      buckets[category] = [];
      order.push(category);
    }
    buckets[category].push(o);
  }
  return order.map((category) => ({ category, items: buckets[category] }));
}

function stripPrefix(label: string, category: string): string {
  const prefix = `${category} — `;
  return label.startsWith(prefix) ? label.slice(prefix.length) : label;
}
