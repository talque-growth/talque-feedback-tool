import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { DealListItem } from "@/lib/hubspot";
import { formatCurrency, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

type Status = "open" | "captured" | "overdue";

function statusOf(d: DealListItem): Status {
  if (d.feedbackTerminDurchgefuehrt) return "captured";
  if (d.closedate) {
    const closedTs = new Date(d.closedate).getTime();
    const ageDays = (Date.now() - closedTs) / (1000 * 60 * 60 * 24);
    if (ageDays > 60) return "overdue";
  }
  return "open";
}

const statusStyles: Record<Status, { label: string; cls: string }> = {
  open: {
    label: "Feedback offen",
    cls: "bg-orange-100 text-orange-700 border border-orange-200",
  },
  captured: {
    label: "Erfasst",
    cls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  overdue: {
    label: "Überfällig",
    cls: "bg-red-100 text-red-700 border border-red-200",
  },
};

export function DealCard({ deal }: { deal: DealListItem }) {
  const status = statusOf(deal);
  const s = statusStyles[status];
  return (
    <Link
      href={`/feedback/${deal.id}`}
      className="group flex items-center gap-4 rounded-card border border-smoke bg-white p-5 transition hover:border-brand-purple/40 hover:shadow-card"
    >
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-medium text-brand-dark">
          {deal.dealname}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ash">
          {deal.companyName && (
            <span className="font-medium text-brand-dark">
              {deal.companyName}
            </span>
          )}
          {deal.contactName && <span>· {deal.contactName}</span>}
          {deal.eventStartDate && (
            <span>· {formatDate(deal.eventStartDate)}</span>
          )}
          {deal.amount > 0 && (
            <span>· {formatCurrency(deal.amount)}</span>
          )}
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-3 py-1 text-[12px] font-medium",
          s.cls,
        )}
      >
        {s.label}
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-ash transition group-hover:translate-x-0.5 group-hover:text-brand-purple" />
    </Link>
  );
}

export { statusOf };
