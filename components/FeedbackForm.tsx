"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { DealDetails } from "@/lib/hubspot";
import type { FeedbackFormData } from "@/lib/properties";
import { DROPDOWN_OPTIONS } from "@/lib/properties";
import { clearDraft, loadDraft, saveDraft } from "@/lib/autosave";
import {
  FIELD_TO_BLOCK,
  REQUIRED_LABELS,
  emptyFormData,
  validateRequired,
} from "@/lib/validation";
import { DealContextCard } from "./DealContextCard";
import { ProgressBar } from "./ProgressBar";
import { AutoSaveIndicator } from "./AutoSaveIndicator";
import { Button } from "./Button";
import {
  ChipSingleSelect,
  Field,
  RatingChips,
  Select,
  TextInput,
  Textarea,
} from "./Field";
import { NPSSlider } from "./NPSSlider";
import { ChipMultiSelect } from "./ChipMultiSelect";

const TOTAL_BLOCKS = 6;

function mergeWithDeal(deal: DealDetails): FeedbackFormData {
  const base = emptyFormData();
  return {
    ...base,
    ...deal.feedback,
    groesserWertAusEvent:
      deal.feedback.groesserWertAusEvent ?? base.groesserWertAusEvent,
    groesstesProblem:
      deal.feedback.groesstesProblem ?? base.groesstesProblem,
    genannteFeatureWuensche:
      deal.feedback.genannteFeatureWuensche ?? base.genannteFeatureWuensche,
    naechstesEventDatumUnsicher:
      deal.feedback.naechstesEventDatumUnsicher ?? false,
    krispTranskriptLink:
      deal.feedback.krispTranskriptLink ?? deal.krispTranskriptLink ?? "",
  };
}

export function FeedbackForm({
  dealId,
  deal,
  portalId,
  uiDomain,
}: {
  dealId: string;
  deal: DealDetails;
  portalId: string;
  uiDomain: string;
}) {
  const router = useRouter();
  const [formData, setFormData] = useState<FeedbackFormData>(() =>
    mergeWithDeal(deal),
  );
  const [hydrated, setHydrated] = useState(false);
  const [block, setBlock] = useState(1);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const skipNextSave = useRef(true);

  // On mount: prefer draft from localStorage over server data
  useEffect(() => {
    const draft = loadDraft(dealId);
    if (draft?.data) {
      setFormData(draft.data);
      setSavedAt(draft.savedAt);
    }
    setHydrated(true);
  }, [dealId]);

  // Auto-save on change (but skip the very first hydration write)
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    saveDraft(dealId, formData);
    setSavedAt(Date.now());
  }, [formData, hydrated, dealId]);

  // Warn on tab close if unsaved changes since last submit
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (savedAt) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [savedAt]);

  const update = useCallback(
    <K extends keyof FeedbackFormData>(key: K, value: FeedbackFormData[K]) => {
      setFormData((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const onNext = () => {
    if (block < TOTAL_BLOCKS) setBlock(block + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const onPrev = () => {
    if (block > 1) setBlock(block - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async () => {
    const missing = validateRequired(formData);
    if (missing.length > 0) {
      const labels = missing.map((f) => REQUIRED_LABELS[f]).join(", ");
      toast.error(`Pflichtfelder fehlen: ${labels}`);
      const firstBlock = Math.min(...missing.map((f) => FIELD_TO_BLOCK[f]));
      setBlock(firstBlock);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body?.error || `HTTP ${res.status}`;
        console.error("[submit] failed", res.status, body);
        if (res.status === 401) {
          toast.error("Verbindung zu HubSpot fehlgeschlagen. Service Key prüfen.");
        } else if (res.status === 404) {
          toast.error("Deal nicht gefunden. Eventuell wurde er gelöscht.");
        } else if (res.status === 429) {
          toast.error("HubSpot Rate Limit erreicht. Bitte gleich nochmal versuchen.");
        } else {
          toast.error(`Speichern fehlgeschlagen: ${msg}`);
        }
        return;
      }
      clearDraft(dealId);
      setSavedAt(null);
      toast.success(`Feedback für ${deal.dealname} gespeichert ✓`);
      router.push("/");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unbekannter Fehler";
      console.error("[submit] error", err);
      toast.error(`Speichern fehlgeschlagen: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const contact = deal.contactName || "der Kunde";

  return (
    <div className="mt-6 space-y-6">
      <DealContextCard deal={deal} portalId={portalId} uiDomain={uiDomain} />
      <ProgressBar current={block} total={TOTAL_BLOCKS} />
      <div className="rounded-card border border-smoke bg-white p-7 shadow-card">
        <BlockHeader block={block} />
        <div className="mt-6 space-y-7">
          {block === 1 && <Block1 formData={formData} update={update} contact={contact} />}
          {block === 2 && <Block2 formData={formData} update={update} contact={contact} />}
          {block === 3 && <Block3 formData={formData} update={update} contact={contact} />}
          {block === 4 && <Block4 formData={formData} update={update} contact={contact} />}
          {block === 5 && <Block5 formData={formData} update={update} contact={contact} />}
          {block === 6 && <Block6 formData={formData} update={update} contact={contact} company={deal.companyName} />}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-4 px-1">
        <AutoSaveIndicator savedAt={savedAt} />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onPrev} disabled={block === 1}>
            Zurück
          </Button>
          {block < TOTAL_BLOCKS ? (
            <Button onClick={onNext}>Weiter zu Block {block + 1} →</Button>
          ) : (
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting ? "Speichert…" : "Feedback speichern →"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function BlockHeader({ block }: { block: number }) {
  const meta = useMemo(() => {
    switch (block) {
      case 1:
        return { title: "Eröffnung", sub: "Stimmungsbild abholen — wie blickt der Kunde auf das Event zurück?" };
      case 2:
        return { title: "Was funktioniert hat", sub: "Stärken identifizieren und dokumentieren" };
      case 3:
        return { title: "Probleme und Pain Points", sub: "Wo gab es Reibung? Was haben wir nicht gelöst?" };
      case 4:
        return { title: "Bewertung Operations", sub: "Wie haben Setup und Support funktioniert?" };
      case 5:
        return { title: "Zukunftsausblick", sub: "Wie geht's weiter mit diesem Kunden?" };
      case 6:
        return { title: "Abschluss", sub: "Originalzitat und Reference-Status" };
      default:
        return { title: "", sub: "" };
    }
  }, [block]);

  return (
    <div>
      <div className="text-[12px] font-medium uppercase tracking-wider text-brand-purple">
        Block {block}
      </div>
      <h2 className="mt-1 text-[26px] font-medium tracking-tight text-brand-dark">
        {meta.title}
      </h2>
      <p className="mt-2 text-[14px] text-ash">{meta.sub}</p>
    </div>
  );
}

type BlockProps = {
  formData: FeedbackFormData;
  update: <K extends keyof FeedbackFormData>(key: K, v: FeedbackFormData[K]) => void;
  contact: string;
};

function Block1({ formData, update, contact }: BlockProps) {
  return (
    <>
      <Field
        label="NPS-Score"
        required
        question={`Wie wahrscheinlich würde ${contact} talque einem Kollegen empfehlen?`}
      >
        <NPSSlider value={formData.npsScore} onChange={(v) => update("npsScore", v)} />
      </Field>
      <Field
        label="Gesamt-Zufriedenheit"
        required
        question={`Wie bewertet ${contact} das Event als Gesamterlebnis?`}
      >
        <Select
          value={formData.gesamtZufriedenheit}
          onChange={(v) => update("gesamtZufriedenheit", v)}
          options={[...DROPDOWN_OPTIONS.gesamtZufriedenheit]}
        />
      </Field>
      <Field
        label="Erwartung erfüllt?"
        question="Hat talque die ursprünglichen Erwartungen erfüllt?"
      >
        <ChipSingleSelect
          value={formData.erwartungErfuellt}
          onChange={(v) => update("erwartungErfuellt", v)}
          options={[...DROPDOWN_OPTIONS.erwartungErfuellt]}
        />
      </Field>
    </>
  );
}

function Block2({ formData, update, contact }: BlockProps) {
  return (
    <>
      <Field
        label="Größter Wert aus Event"
        required
        question="Wo hat talque den größten Wert geliefert? (Mehrfachauswahl möglich)"
      >
        <ChipMultiSelect
          value={formData.groesserWertAusEvent}
          onChange={(v) => update("groesserWertAusEvent", v)}
          options={[...DROPDOWN_OPTIONS.groesserWertUndProblem]}
        />
      </Field>
      <Field
        label="Was lief besonders gut?"
        hint={`Notiere konkrete Punkte, die ${contact} positiv hervorgehoben hat.`}
      >
        <Textarea
          value={formData.wasLiefBesondersGut}
          onChange={(v) => update("wasLiefBesondersGut", v)}
          rows={5}
        />
      </Field>
    </>
  );
}

function Block3({ formData, update, contact }: BlockProps) {
  return (
    <>
      <Field
        label="Größtes Problem"
        required
        question="Wo lag der größte Reibungspunkt? (Mehrfachauswahl möglich)"
      >
        <ChipMultiSelect
          value={formData.groesstesProblem}
          onChange={(v) => update("groesstesProblem", v)}
          options={[...DROPDOWN_OPTIONS.groesserWertUndProblem]}
        />
      </Field>
      <Field
        label="Wo Verbesserungsbedarf?"
        hint="Notiere konkrete Verbesserungs-Wünsche."
      >
        <Textarea
          value={formData.woVerbesserungsbedarf}
          onChange={(v) => update("woVerbesserungsbedarf", v)}
          rows={4}
        />
      </Field>
      <Field
        label="Welches Problem haben wir nicht gelöst?"
        required
        hint="Was war der Kern-Pain, den talque nicht oder nur teilweise adressieren konnte?"
      >
        <Textarea
          value={formData.welchesProblemUngeloest}
          onChange={(v) => update("welchesProblemUngeloest", v)}
          rows={4}
        />
      </Field>
      <Field
        label="Genannte Feature-Wünsche"
        question="Welche konkreten Features oder Verbesserungen wurden genannt?"
        hint="Kategorien aufklappen und passende Items auswählen. Suche durchsucht alle Kategorien."
      >
        <ChipMultiSelect
          value={formData.genannteFeatureWuensche}
          onChange={(v) => update("genannteFeatureWuensche", v)}
          options={[...DROPDOWN_OPTIONS.genannteFeatureWuensche]}
          searchable
          grouped
        />
      </Field>
      <Field
        label="Konkrete Feature-Wünsche (Wortlaut)"
        hint={`Was hat ${contact} konkret gesagt? Originalzitat, kein Marketing-Sprech.`}
      >
        <Textarea
          value={formData.featureWuenscheWortlaut}
          onChange={(v) => update("featureWuenscheWortlaut", v)}
          rows={6}
        />
      </Field>
    </>
  );
}

function Block4({ formData, update, contact }: BlockProps) {
  return (
    <>
      <Field
        label="Setup-Bewertung"
        hint={`Wie zufrieden war ${contact} mit dem Onboarding / Setup?`}
      >
        <RatingChips
          value={formData.setupBewertung}
          onChange={(v) => update("setupBewertung", v)}
        />
      </Field>
      <Field
        label="Setup-Bewertung — Begründung"
        hint="Optional: 1–2 Sätze zur Bewertung. Was hat den Setup-Eindruck geprägt?"
      >
        <Textarea
          value={formData.setupBewertungFreitext}
          onChange={(v) => update("setupBewertungFreitext", v)}
          rows={3}
        />
      </Field>
      <Field
        label="Support-Bewertung"
        hint={`Wie zufrieden war ${contact} mit dem Customer Support während des Events?`}
      >
        <RatingChips
          value={formData.supportBewertung}
          onChange={(v) => update("supportBewertung", v)}
        />
      </Field>
      <Field
        label="Support-Bewertung — Begründung"
        hint="Optional: 1–2 Sätze zur Bewertung. Was war beim Support auffällig?"
      >
        <Textarea
          value={formData.supportBewertungFreitext}
          onChange={(v) => update("supportBewertungFreitext", v)}
          rows={3}
        />
      </Field>
    </>
  );
}

function Block5({ formData, update }: BlockProps) {
  const showDate =
    formData.folgeEventGeplant === "ja_fest_geplant" ||
    formData.folgeEventGeplant === "ja_in_diskussion";
  const showUnsicher = formData.folgeEventGeplant === "wahrscheinlich_noch_unklar";
  const showAnmerkung =
    formData.folgeEventGeplant !== "" &&
    formData.folgeEventGeplant !== "nein" &&
    formData.folgeEventGeplant !== "einmaliges_event";
  const showHurdle = ["unsicher", "eher_nicht", "sicher_nicht"].includes(
    formData.rebookingWahrscheinlichkeit,
  );

  return (
    <>
      <Field label="Folge-Event geplant" required>
        <Select
          value={formData.folgeEventGeplant}
          onChange={(v) => update("folgeEventGeplant", v)}
          options={[...DROPDOWN_OPTIONS.folgeEventGeplant]}
        />
      </Field>
      {showDate && (
        <Field label="Nächstes Event Datum">
          <TextInput
            type="date"
            value={formData.naechstesEventDatum}
            onChange={(v) => update("naechstesEventDatum", v)}
          />
        </Field>
      )}
      {showUnsicher && (
        <Field label="Datum noch nicht festgelegt">
          <label className="inline-flex items-center gap-3 text-[14px]">
            <input
              type="checkbox"
              checked={formData.naechstesEventDatumUnsicher}
              onChange={(e) => update("naechstesEventDatumUnsicher", e.target.checked)}
              className="h-4 w-4 rounded border-smoke text-brand-purple focus:ring-brand-purple"
            />
            Datum noch nicht festgelegt
          </label>
        </Field>
      )}
      {showAnmerkung && (
        <Field
          label="Nächstes Event Anmerkung"
          hint='Z.B. "wahrscheinlich Q3", "wartet auf Budget-Freigabe", etc.'
        >
          <TextInput
            value={formData.naechstesEventAnmerkung}
            onChange={(v) => update("naechstesEventAnmerkung", v)}
          />
        </Field>
      )}
      <Field label="Re-Booking-Wahrscheinlichkeit" required>
        <Select
          value={formData.rebookingWahrscheinlichkeit}
          onChange={(v) => update("rebookingWahrscheinlichkeit", v)}
          options={[...DROPDOWN_OPTIONS.rebookingWahrscheinlichkeit]}
        />
      </Field>
      {showHurdle && (
        <Field
          label="Re-Booking-Hürde"
          hint="Was ist die größte Hürde für ein Re-Booking? Was müssten wir tun?"
        >
          <Textarea
            value={formData.rebookingHurdle}
            onChange={(v) => update("rebookingHurdle", v)}
            rows={4}
          />
        </Field>
      )}
    </>
  );
}

function Block6({
  formData,
  update,
  contact,
  company,
}: BlockProps & { company: string }) {
  const ref = company || "diesen Kunden";
  return (
    <>
      <Field
        label="Wortlaut-Zitat"
        hint={`Falls ${contact} einen besonders prägnanten Satz gesagt hat — wörtlich notieren. Taugt später als Testimonial oder für Case Studies.`}
      >
        <Textarea
          value={formData.wortlautZitat}
          onChange={(v) => update("wortlautZitat", v)}
          rows={5}
        />
      </Field>
      <Field
        label="Als Referenz nennbar?"
        hint={`Dürfen wir ${ref} als Referenz nennen oder Case Study erstellen?`}
      >
        <ChipSingleSelect
          value={formData.alsReferenzNennbar}
          onChange={(v) => update("alsReferenzNennbar", v)}
          options={[...DROPDOWN_OPTIONS.alsReferenzNennbar]}
        />
      </Field>
    </>
  );
}
