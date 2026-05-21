import { DealListClient } from "@/components/DealListClient";
import { fetchDeals } from "@/lib/hubspot";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let deals = null;
  let error: string | null = null;
  try {
    deals = await fetchDeals();
  } catch (err) {
    error = err instanceof Error ? err.message : "Unbekannter Fehler";
    console.error("[HomePage] fetchDeals failed", error);
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-4xl font-medium tracking-tight text-brand-dark">
          Welches Event möchtest du dokumentieren?
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] text-ash">
          Wähle den Deal, für den du gerade einen Feedback-Termin geführt
          hast. Die Antworten landen direkt am Deal in HubSpot.
        </p>
      </header>
      {error ? (
        <div className="rounded-card border border-red-200 bg-red-50 p-6 text-[14px] text-red-700">
          <div className="font-medium">Verbindung zu HubSpot fehlgeschlagen</div>
          <div className="mt-2 break-words text-[13px] opacity-80">{error}</div>
          <div className="mt-2 text-[13px] opacity-80">
            Prüfe in <code className="rounded bg-white/60 px-1">.env.local</code> den{" "}
            <code>HUBSPOT_ACCESS_TOKEN</code> und{" "}
            <code>HUBSPOT_CLOSED_WON_STAGE_ID</code>.
          </div>
        </div>
      ) : (
        <DealListClient deals={deals ?? []} />
      )}
    </div>
  );
}
