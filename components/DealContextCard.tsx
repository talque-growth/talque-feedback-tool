import { ExternalLink, FileText } from "lucide-react";
import type { DealDetails } from "@/lib/hubspot";
import { formatCurrency, formatDate } from "@/lib/format";

export function DealContextCard({
  deal,
  portalId,
  uiDomain,
}: {
  deal: DealDetails;
  portalId: string;
  uiDomain: string;
}) {
  const domain = uiDomain || "app.hubspot.com";
  const hubspotUrl = portalId
    ? `https://${domain}/contacts/${portalId}/deal/${deal.id}`
    : `https://${domain}/contacts/-/deal/${deal.id}`;
  const krispLink = deal.krispTranskriptLink;
  return (
    <div className="overflow-hidden rounded-card bg-brand-cinematic p-7 text-white shadow-card">
      <div className="text-[12px] font-medium uppercase tracking-wider text-purple-light">
        Aktiver Deal
      </div>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-[26px] font-medium leading-tight tracking-tight">
            {deal.dealname}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-white/70">
            {deal.companyName && (
              <span className="font-medium text-white">{deal.companyName}</span>
            )}
            {deal.contactName && <span>· {deal.contactName}</span>}
            {deal.eventStartDate && (
              <span>
                · {formatDate(deal.eventStartDate)}
                {deal.eventEndDate && deal.eventEndDate !== deal.eventStartDate
                  ? ` – ${formatDate(deal.eventEndDate)}`
                  : ""}
              </span>
            )}
            {deal.amount > 0 && <span>· {formatCurrency(deal.amount)}</span>}
          </div>
          {(deal.eventFormat || deal.eventCountry || deal.eventIndustry) && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-white/55">
              {deal.eventFormat && <span>{deal.eventFormat}</span>}
              {deal.eventCountry && <span>· {deal.eventCountry}</span>}
              {deal.eventIndustry && <span>· {deal.eventIndustry}</span>}
            </div>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 text-[13px]">
          <a
            href={hubspotUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-chip border border-white/15 bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In HubSpot öffnen
          </a>
          {krispLink && (
            <a
              href={krispLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-chip border border-white/15 bg-white/10 px-3 py-1.5 transition hover:bg-white/20"
            >
              <FileText className="h-3.5 w-3.5" />
              Krisp-Transkript
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
