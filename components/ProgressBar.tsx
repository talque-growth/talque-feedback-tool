export function ProgressBar({ current, total }: { current: number; total: number }) {
  const pct = Math.min(100, Math.max(0, (current / total) * 100));
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[13px] text-ash">
        <span>Fortschritt</span>
        <span className="font-medium text-brand-dark">
          Block {current} von {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-smoke">
        <div
          className="h-full rounded-full bg-brand-purple transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
