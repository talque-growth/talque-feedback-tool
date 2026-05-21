import Link from "next/link";
import { fetchDealDetails } from "@/lib/hubspot";
import { FeedbackForm } from "@/components/FeedbackForm";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  params,
}: {
  params: { dealId: string };
}) {
  let deal = null;
  let error: string | null = null;
  try {
    deal = await fetchDealDetails(params.dealId);
  } catch (err) {
    error = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error(
      `[FeedbackPage] fetchDealDetails(${params.dealId}) failed`,
      error,
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-[13px] text-ash hover:text-brand-purple"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zur Übersicht
      </Link>
      {error || !deal ? (
        <div className="mt-6 rounded-card border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
          <div className="font-medium">Deal konnte nicht geladen werden</div>
          <div className="mt-2 text-[13px] opacity-80">{error}</div>
        </div>
      ) : (
        <FeedbackForm
          dealId={params.dealId}
          deal={deal}
          portalId={process.env.HUBSPOT_PORTAL_ID ?? ""}
          uiDomain={process.env.HUBSPOT_UI_DOMAIN ?? "app.hubspot.com"}
        />
      )}
    </div>
  );
}
