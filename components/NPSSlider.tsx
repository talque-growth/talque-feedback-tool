"use client";

import { cn } from "@/lib/cn";

const COLORS = [
  "#ef4444",
  "#f43f5e",
  "#f97316",
  "#fb923c",
  "#f59e0b",
  "#eab308",
  "#facc15",
  "#a3e635",
  "#84cc16",
  "#4ade80",
  "#22c55e",
];

function toN(value: string): number {
  if (!value) return 5;
  if (value.startsWith("p_")) return Number(value.slice(2));
  return Number(value);
}

export function NPSSlider({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const n = toN(value);
  const color = COLORS[Math.max(0, Math.min(10, n))];
  const showValue = value !== "";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6">
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={n}
            onChange={(e) => onChange(`p_${e.target.value}`)}
            className="nps-slider"
          />
        </div>
        <div
          className={cn(
            "flex h-16 w-20 items-center justify-center rounded-2xl border-2 text-3xl font-medium transition",
            showValue
              ? "border-transparent text-white"
              : "border-dashed border-smoke text-ash",
          )}
          style={showValue ? { background: color } : undefined}
        >
          {showValue ? n : "–"}
        </div>
      </div>
      <div className="flex justify-between text-[12px] text-ash">
        <span>0 — unwahrscheinlich</span>
        <span>10 — extrem wahrscheinlich</span>
      </div>
    </div>
  );
}
