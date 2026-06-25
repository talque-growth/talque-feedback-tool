"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, FileText } from "lucide-react";
import { cn } from "@/lib/cn";
import type { FeedbackFormData } from "@/lib/properties";
import {
  parseKrispTranscript,
  type ImportFieldStatus,
  type ParseResult,
} from "@/lib/krispParser";
import { Button } from "./Button";

type Props = {
  formData: FeedbackFormData;
  onApply: (
    data: Partial<FeedbackFormData>,
    status: Partial<Record<keyof FeedbackFormData, ImportFieldStatus>>,
    notes: Partial<Record<keyof FeedbackFormData, string>>,
  ) => void;
  lastSummary: ParseSummary | null;
};

export type ParseSummary = {
  parsed: number;
  review: number;
  missing: number;
  attempted: number;
};

function summarize(result: ParseResult): ParseSummary {
  let parsed = 0;
  let review = 0;
  let missing = 0;
  for (const status of Object.values(result.status)) {
    if (status === "parsed") parsed++;
    else if (status === "review") review++;
    else if (status === "missing") missing++;
  }
  return { parsed, review, missing, attempted: parsed + review + missing };
}

function hasAnyData(data: FeedbackFormData): boolean {
  return (
    !!data.npsScore ||
    !!data.gesamtZufriedenheit ||
    !!data.erwartungErfuellt ||
    data.groesserWertAusEvent.length > 0 ||
    !!data.wasLiefBesondersGut ||
    data.groesstesProblem.length > 0 ||
    !!data.woVerbesserungsbedarf ||
    !!data.welchesProblemUngeloest ||
    data.genannteFeatureWuensche.length > 0 ||
    !!data.featureWuenscheWortlaut ||
    !!data.setupBewertung ||
    !!data.setupBewertungFreitext ||
    !!data.supportBewertung ||
    !!data.supportBewertungFreitext ||
    !!data.folgeEventGeplant ||
    !!data.naechstesEventDatum ||
    !!data.naechstesEventAnmerkung ||
    !!data.rebookingWahrscheinlichkeit ||
    !!data.rebookingHurdle ||
    !!data.wortlautZitat ||
    !!data.alsReferenzNennbar
  );
}

export function TranscriptImporter({ formData, onApply, lastSummary }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  // In-App-Bestätigung statt window.confirm(): Letzteres wird vom Browser
  // unterdrückt, wenn die Seite nicht der aktive Tab ist, und liefert dann
  // fälschlich `false` zurück — der Import würde lautlos abbrechen.
  const [pendingResult, setPendingResult] = useState<ParseResult | null>(null);

  const applyResult = (result: ParseResult) => {
    const summary = summarize(result);
    onApply(result.data, result.status, result.notes);
    setWarnings(result.warnings);
    setPendingResult(null);

    const parts: string[] = [];
    if (summary.parsed > 0) parts.push(`${summary.parsed} ✓ übertragen`);
    if (summary.review > 0) parts.push(`${summary.review} ⚠ bitte prüfen`);
    if (summary.missing > 0) parts.push(`${summary.missing} ✗ nicht erkannt`);
    toast.success(parts.join(" · "));

    // Eingabe leeren und Box schließen — Status wandert ans Formular
    setText("");
    setOpen(false);
  };

  const handleTransfer = () => {
    if (!text.trim()) {
      toast.error("Bitte Krisp-Transkript einfügen.");
      return;
    }

    const result = parseKrispTranscript(text);
    const summary = summarize(result);

    if (summary.attempted === 0) {
      setPendingResult(null);
      setWarnings(
        result.warnings.length > 0
          ? result.warnings
          : ["Keine Felder erkannt — bitte prüfen, ob das Krisp-Template angewendet wurde."],
      );
      toast.error("Es konnten keine Felder extrahiert werden.");
      return;
    }

    if (hasAnyData(formData)) {
      // Bestätigung inline einblenden statt blockierendem window.confirm().
      setPendingResult(result);
      return;
    }

    applyResult(result);
  };

  return (
    <div className="rounded-card border border-smoke bg-white shadow-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-brand-purple" />
          <div>
            <div className="text-[15px] font-medium text-brand-dark">
              Krisp-Transkript übertragen
            </div>
            <div className="text-[13px] text-ash">
              {lastSummary
                ? `Letzte Übertragung: ${lastSummary.parsed} ✓ · ${lastSummary.review} ⚠ · ${lastSummary.missing} ✗`
                : "Transkript einfügen und Felder automatisch befüllen lassen."}
            </div>
          </div>
        </div>
        {open ? (
          <ChevronUp className="h-5 w-5 text-ash" />
        ) : (
          <ChevronDown className="h-5 w-5 text-ash" />
        )}
      </button>

      {open && (
        <div className="space-y-4 border-t border-smoke px-6 py-5">
          <p className="text-[13px] text-ash">
            Voraussetzung: Im Krisp-Call wurde das Template „talque
            Post-Event-Feedback" angewendet. Kopiere den vollständigen
            generierten Text inklusive der Section-Header („1. Stimmungsbild &
            NPS" usw.) hier herein.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Hier das Krisp-Transkript einfügen…"
            className={cn(
              "w-full resize-y rounded-xl border border-smoke bg-white px-3 py-3 font-mono text-[13px] leading-relaxed text-brand-dark placeholder:text-ash/70 focus:border-brand-purple focus:outline-none focus:ring-4 focus:ring-brand-purple/15",
            )}
          />
          {warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              <div className="font-medium">Hinweise:</div>
              <ul className="mt-1 list-inside list-disc space-y-1">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          {pendingResult && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
              <div className="font-medium">
                Im Formular sind bereits Antworten eingetragen.
              </div>
              <p className="mt-1">
                Diese werden durch die Krisp-Daten überschrieben, sofern Krisp
                etwas zu dem jeweiligen Feld liefert. Fortfahren?
              </p>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => applyResult(pendingResult)}>
                  Überschreiben
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPendingResult(null)}
                >
                  Abbrechen
                </Button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[12px] text-ash">
              Felder, die bereits ausgefüllt sind, werden nur überschrieben,
              wenn Krisp einen Wert liefert.
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setText("");
                  setWarnings([]);
                  setPendingResult(null);
                }}
              >
                Leeren
              </Button>
              <Button onClick={handleTransfer}>Übertragen →</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
