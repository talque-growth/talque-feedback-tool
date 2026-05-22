import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ImportFieldStatus } from "@/lib/krispParser";

export function Field({
  label,
  hint,
  required,
  question,
  children,
  className,
  importStatus,
  importNote,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  question?: string;
  children: ReactNode;
  className?: string;
  importStatus?: ImportFieldStatus;
  importNote?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <label className="text-[13px] font-medium uppercase tracking-wide text-ash">
          {label}
          {required && <span className="ml-1 text-brand-purple">*</span>}
        </label>
        {importStatus && <ImportBadge status={importStatus} />}
      </div>
      {question && (
        <p className="text-[15px] font-medium text-brand-dark">{question}</p>
      )}
      {children}
      {importNote && (
        <p
          className={cn(
            "text-[13px]",
            importStatus === "missing"
              ? "text-red-600"
              : importStatus === "review"
                ? "text-amber-700"
                : "text-ash",
          )}
        >
          {importNote}
        </p>
      )}
      {hint && <p className="text-[13px] text-ash">{hint}</p>}
    </div>
  );
}

function ImportBadge({ status }: { status: ImportFieldStatus }) {
  const map: Record<ImportFieldStatus, { label: string; cls: string }> = {
    parsed: {
      label: "✓ aus Krisp",
      cls: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    },
    review: {
      label: "⚠ bitte prüfen",
      cls: "bg-amber-50 text-amber-800 border border-amber-200",
    },
    missing: {
      label: "✗ nicht erkannt",
      cls: "bg-red-50 text-red-700 border border-red-200",
    },
  };
  const { label, cls } = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        cls,
      )}
    >
      {label}
    </span>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-11 w-full rounded-xl border border-smoke bg-white px-3 text-[15px] text-brand-dark placeholder:text-ash/70 focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15",
        className,
      )}
    />
  );
}

export function Textarea({
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength = 5000,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  className?: string;
}) {
  return (
    <div className="space-y-1">
      <textarea
        value={value}
        rows={rows}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full resize-y rounded-xl border border-smoke bg-white px-3 py-3 text-[15px] leading-relaxed text-brand-dark placeholder:text-ash/70 focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15",
          className,
        )}
      />
      <div className="flex justify-end text-[12px] text-ash">
        {value.length} / {maxLength}
      </div>
    </div>
  );
}

export function Select({
  value,
  onChange,
  options,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 w-full appearance-none rounded-xl border border-smoke bg-white bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%235a5959%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><polyline points=%226 9 12 15 18 9%22/></svg>')] bg-[length:16px] bg-[right_12px_center] bg-no-repeat px-3 pr-10 text-[15px] text-brand-dark focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15"
    >
      <option value="" disabled>
        {placeholder ?? "Bitte wählen…"}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function ChipSingleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-chip border px-4 py-2 text-[14px] font-medium transition",
              active
                ? "border-brand-purple bg-brand-purple/10 text-brand-purple"
                : "border-smoke bg-white text-brand-dark hover:border-brand-purple/40",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function RatingChips({
  value,
  onChange,
  max = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  max?: number;
}) {
  return (
    <div className="flex gap-2">
      {Array.from({ length: max }).map((_, i) => {
        const v = String(i + 1);
        const active = value === v;
        return (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={cn(
              "flex h-12 w-12 items-center justify-center rounded-xl border text-[16px] font-medium transition",
              active
                ? "border-brand-purple bg-brand-purple text-white"
                : "border-smoke bg-white text-brand-dark hover:border-brand-purple/40",
            )}
          >
            {v}
          </button>
        );
      })}
    </div>
  );
}
