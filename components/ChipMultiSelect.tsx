"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";

type Option = { label: string; value: string };

export function ChipMultiSelect({
  value,
  onChange,
  options,
  searchable = false,
  grouped = false,
  collapsible = false,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Option[];
  searchable?: boolean;
  /** Groups options by the prefix before " — " (e.g. "Sessions — Bulk-Upload"). */
  grouped?: boolean;
  /** Versteckt die Kategorien-Liste hinter einem Toggle. Beim Tippen in
   * die Suche klappt sie automatisch auf. Bereits ausgewählte Optionen
   * bleiben als entfernbare Chips sichtbar. */
  collapsible?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else onChange([...value, v]);
  };

  const selectedOptions = useMemo(
    () => options.filter((o) => value.includes(o.value)),
    [options, value],
  );

  const isFiltering = query.trim().length > 0;
  const showCategoryList = !collapsible || expanded || isFiltering;

  const groupCount = useMemo(() => {
    if (!grouped) return 0;
    const set = new Set<string>();
    for (const o of options) {
      const sep = o.label.indexOf(" — ");
      set.add(sep === -1 ? "Sonstiges" : o.label.slice(0, sep).trim());
    }
    return set.size;
  }, [grouped, options]);

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

      {collapsible && selectedOptions.length > 0 && (
        <SelectedChips
          options={selectedOptions}
          onRemove={(v) => onChange(value.filter((x) => x !== v))}
        />
      )}

      {collapsible && !showCategoryList && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-dashed border-smoke bg-white px-4 py-3 text-left text-[13px] text-ash transition hover:border-brand-purple/40 hover:text-brand-dark"
        >
          <span>
            {options.length} Optionen
            {grouped ? ` in ${groupCount} Kategorien` : ""} anzeigen
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showCategoryList && (
        <>
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
          {collapsible && !isFiltering && (
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex items-center gap-1 text-[12px] text-ash transition hover:text-brand-dark"
            >
              <ChevronUp className="h-3 w-3" />
              Kategorien verbergen
            </button>
          )}
        </>
      )}

      {!collapsible && value.length > 0 && (
        <p className="text-[12px] text-ash">{value.length} ausgewählt</p>
      )}
    </div>
  );
}

function SelectedChips({
  options,
  onRemove,
}: {
  options: Option[];
  onRemove: (value: string) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-brand-purple/20 bg-brand-purple/5 px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-wide text-brand-purple">
        {options.length} ausgewählt
      </div>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => (
          <span
            key={o.value}
            className="inline-flex items-center gap-1 rounded-chip border border-brand-purple bg-white px-2.5 py-1 text-[12px] text-brand-dark"
          >
            <span>{o.label}</span>
            <button
              type="button"
              onClick={() => onRemove(o.value)}
              className="text-ash transition hover:text-brand-purple"
              aria-label={`${o.label} entfernen`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
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
