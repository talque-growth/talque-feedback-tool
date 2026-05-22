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
import { TranscriptImporter, type ParseSummary } from "./TranscriptImporter";
import type { ImportFieldStatus } from "@/lib/krispParser";

const TOTAL_BLOCKS = 6;

type FieldStatusMap = Partial<Record<keyof FeedbackFormData, ImportFieldStatus>>;
type FieldNoteMap = Partial<Record<keyof FeedbackFormData, string>>;

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
  const [importStatus, setImportStatus] = useState<FieldStatusMap>({});
  const [importNotes, setImportNotes] = useState<FieldNoteMap>({});
  const [importSummary, setImportSummary] = useState<ParseSummary | null>(null);

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
      // Manuelle Eingaben löschen das Import-Badge des betreffenden Feldes.
      setImportStatus((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setImportNotes((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [],
  );

  const applyImport = useCallback(
    (
      data: Partial<FeedbackFormData>,
      status: FieldStatusMap,
      notes: FieldNoteMap,
    ) => {
      setFormData((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(data) as Array<keyof FeedbackFormData>) {
          const v = data[k];
          if (v === undefined) continue;
          // Typ-Erhalt: Krisp-Parser liefert genau die Typen aus FeedbackFormData.
          (next as Record<string, unknown>)[k] = v;
        }
        return next;
      });
      setImportStatus(status);
      setImportNotes(notes);
      let parsed = 0,
        review = 0,
        missing = 0;
      for (const s of Object.values(status)) {
        if (s === "parsed") parsed++;
        else if (s === "review") review++;
        else if (s === "missing") missing++;
      }
      setImportSummary({ parsed, review, missing, attempted: parsed + review + missing });
      // Spring zum ersten Block mit Review/Missing-Hinweisen
      const firstIssueBlock = findFirstIssueBlock(status);
      if (firstIssueBlock !== null) setBlock(firstIssueBlock);
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
      <TranscriptImporter
        formData={formData}
        onApply={applyImport}
        lastSummary={importSummary}
      />
      <DealContextCard deal={deal} portalId={portalId} uiDomain={uiDomain} />
      <ProgressBar current={block} total={TOTAL_BLOCKS} />
      <div className="rounded-card border border-smoke bg-white p-7 shadow-card">
        <BlockHeader block={block} />
        <div className="mt-6 space-y-7">
          {block === 1 && <Block1 formData={formData} update={update} contact={contact} importStatus={importStatus} importNotes={importNotes} />}
          {block === 2 && <Block2 formData={formData} update={update} contact={contact} importStatus={importStatus} importNotes={importNotes} />}
          {block === 3 && <Block3 formData={formData} update={update} contact={contact} importStatus={importStatus} importNotes={importNotes} />}
          {block === 4 && <Block4 formData={formData} update={update} contact={contact} importStatus={importStatus} importNotes={importNotes} />}
          {block === 5 && <Block5 formData={formData} update={update} contact={contact} importStatus={importStatus} importNotes={importNotes} />}
          {block === 6 && <Block6 formData={formData} update={update} contact={contact} company={deal.companyName} importStatus={importStatus} importNotes={importNotes} />}
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
  importStatus: FieldStatusMap;
  importNotes: FieldNoteMap;
};

// Map: jedes formData-Feld → Block-Nummer, in dem es lebt.
const FIELD_BLOCKS: Partial<Record<keyof FeedbackFormData, number>> = {
  npsScore: 1,
  gesamtZufriedenheit: 1,
  erwartungErfuellt: 1,
  groesserWertAusEvent: 2,
  wasLiefBesondersGut: 2,
  groesstesProblem: 3,
  woVerbesserungsbedarf: 3,
  welchesProblemUngeloest: 3,
  genannteFeatureWuensche: 3,
  featureWuenscheWortlaut: 3,
  setupBewertung: 4,
  setupBewertungFreitext: 4,
  supportBewertung: 4,
  supportBewertungFreitext: 4,
  folgeEventGeplant: 5,
  naechstesEventDatum: 5,
  naechstesEventAnmerkung: 5,
  rebookingWahrscheinlichkeit: 5,
  rebookingHurdle: 5,
  wortlautZitat: 6,
  alsReferenzNennbar: 6,
};

function findFirstIssueBlock(status: FieldStatusMap): number | null {
  let min: number | null = null;
  for (const [key, s] of Object.entries(status)) {
    if (s === "review" || s === "missing") {
      const b = FIELD_BLOCKS[key as keyof FeedbackFormData];
      if (b !== undefined && (min === null || b < min)) min = b;
    }
  }
  return min;
}

function Block1({ formData, update, contact, importStatus, importNotes }: BlockProps) {
  return (
    <>
      <Field
        label="NPS-Score"
        required
        question={`Wie wahrscheinlich würde ${contact} talque einem Kollegen empfehlen?`}
        importStatus={importStatus.npsScore}
        importNote={importNotes.npsScore}
      >
        <NPSSlider value={formData.npsScore} onChange={(v) => update("npsScore", v)} />
      </Field>
      <Field
        label="Gesamt-Zufriedenheit"
        required
        question={`Wie bewertet ${contact} das Event als Gesamterlebnis?`}
        importStatus={importStatus.gesamtZufriedenheit}
        importNote={importNotes.gesamtZufriedenheit}
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
        importStatus={importStatus.erwartungErfuellt}
        importNote={importNotes.erwartungErfuellt}
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

function Block2({ formData, update, contact, importStatus, importNotes }: BlockProps) {
  return (
    <>
      <Field
        label="Größter Wert aus Event"
        required
        question="Wo hat talque den größten Wert geliefert? (Mehrfachauswahl möglich)"
        importStatus={importStatus.groesserWertAusEvent}
        importNote={importNotes.groesserWertAusEvent}
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
        importStatus={importStatus.wasLiefBesondersGut}
        importNote={importNotes.wasLiefBesondersGut}
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

function Block3({ formData, update, contact, importStatus, importNotes }: BlockProps) {
  return (
    <>
      <Field
        label="Größtes Problem"
        required
        question="Wo lag der größte Reibungspunkt? (Mehrfachauswahl möglich)"
        importStatus={importStatus.groesstesProblem}
        importNote={importNotes.groesstesProblem}
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
        importStatus={importStatus.woVerbesserungsbedarf}
        importNote={importNotes.woVerbesserungsbedarf}
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
        importStatus={importStatus.welchesProblemUngeloest}
        importNote={importNotes.welchesProblemUngeloest}
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
        importStatus={importStatus.genannteFeatureWuensche}
        importNote={importNotes.genannteFeatureWuensche}
      >
        <ChipMultiSelect
          value={formData.genannteFeatureWuensche}
          onChange={(v) => update("genannteFeatureWuensche", v)}
          options={[...DROPDOWN_OPTIONS.genannteFeatureWuensche]}
          searchable
          grouped
          collapsible
        />
      </Field>
      <Field
        label="Konkrete Feature-Wünsche (Wortlaut)"
        hint={`Was hat ${contact} konkret gesagt? Originalzitat, kein Marketing-Sprech.`}
        importStatus={importStatus.featureWuenscheWortlaut}
        importNote={importNotes.featureWuenscheWortlaut}
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

function Block4({ formData, update, contact, importStatus, importNotes }: BlockProps) {
  return (
    <>
      <Field
        label="Setup-Bewertung"
        hint={`Wie zufrieden war ${contact} mit dem Onboarding / Setup?`}
        importStatus={importStatus.setupBewertung}
        importNote={importNotes.setupBewertung}
      >
        <RatingChips
          value={formData.setupBewertung}
          onChange={(v) => update("setupBewertung", v)}
        />
      </Field>
      <Field
        label="Setup-Bewertung — Begründung"
        hint="Optional: 1–2 Sätze zur Bewertung. Was hat den Setup-Eindruck geprägt?"
        importStatus={importStatus.setupBewertungFreitext}
        importNote={importNotes.setupBewertungFreitext}
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
        importStatus={importStatus.supportBewertung}
        importNote={importNotes.supportBewertung}
      >
        <RatingChips
          value={formData.supportBewertung}
          onChange={(v) => update("supportBewertung", v)}
        />
      </Field>
      <Field
        label="Support-Bewertung — Begründung"
        hint="Optional: 1–2 Sätze zur Bewertung. Was war beim Support auffällig?"
        importStatus={importStatus.supportBewertungFreitext}
        importNote={importNotes.supportBewertungFreitext}
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

function Block5({ formData, update, importStatus, importNotes }: BlockProps) {
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
      <Field
        label="Folge-Event geplant"
        required
        importStatus={importStatus.folgeEventGeplant}
        importNote={importNotes.folgeEventGeplant}
      >
        <Select
          value={formData.folgeEventGeplant}
          onChange={(v) => update("folgeEventGeplant", v)}
          options={[...DROPDOWN_OPTIONS.folgeEventGeplant]}
        />
      </Field>
      {showDate && (
        <Field
          label="Nächstes Event Datum"
          importStatus={importStatus.naechstesEventDatum}
          importNote={importNotes.naechstesEventDatum}
        >
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
          importStatus={importStatus.naechstesEventAnmerkung}
          importNote={importNotes.naechstesEventAnmerkung}
        >
          <TextInput
            value={formData.naechstesEventAnmerkung}
            onChange={(v) => update("naechstesEventAnmerkung", v)}
          />
        </Field>
      )}
      <Field
        label="Re-Booking-Wahrscheinlichkeit"
        required
        importStatus={importStatus.rebookingWahrscheinlichkeit}
        importNote={importNotes.rebookingWahrscheinlichkeit}
      >
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
          importStatus={importStatus.rebookingHurdle}
          importNote={importNotes.rebookingHurdle}
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
  importStatus,
  importNotes,
}: BlockProps & { company: string }) {
  const ref = company || "diesen Kunden";
  return (
    <>
      <Field
        label="Wortlaut-Zitat"
        hint={`Falls ${contact} einen besonders prägnanten Satz gesagt hat — wörtlich notieren. Taugt später als Testimonial oder für Case Studies.`}
        importStatus={importStatus.wortlautZitat}
        importNote={importNotes.wortlautZitat}
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
        importStatus={importStatus.alsReferenzNennbar}
        importNote={importNotes.alsReferenzNennbar}
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
