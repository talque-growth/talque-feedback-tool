"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { relativeFromNow } from "@/lib/format";

export function AutoSaveIndicator({ savedAt }: { savedAt: number | null }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  if (!savedAt) {
    return (
      <span className="text-[13px] text-ash">Noch nichts gespeichert</span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] text-emerald-600">
      <Check className="h-3.5 w-3.5" />
      Automatisch gespeichert · {relativeFromNow(savedAt)}
    </span>
  );
}
