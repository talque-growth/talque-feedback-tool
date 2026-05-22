// =====================================================================
// Krisp-Transkript-Parser
// =====================================================================
// Erwartet ein Transkript, das dem Krisp-Template „talque Post-Event-Feedback"
// folgt. Die Sections sind durch Headlines "1. Stimmungsbild & NPS" usw.
// abgegrenzt; innerhalb jeder Section gibt es benannte Felder mit
// "Label: Wert" oder "Label?\nWert".
//
// Der Parser ist konservativ: was nicht eindeutig zugeordnet werden
// kann, landet mit Status "review" oder "missing" zurück, damit der
// User es im UI manuell prüft.
// =====================================================================

import { DROPDOWN_OPTIONS, type FeedbackFormData } from "./properties";

export type ImportFieldStatus = "parsed" | "review" | "missing";

export type ParseResult = {
  data: Partial<FeedbackFormData>;
  status: Partial<Record<keyof FeedbackFormData, ImportFieldStatus>>;
  notes: Partial<Record<keyof FeedbackFormData, string>>;
  warnings: string[];
};

// =====================================================================
// Normalisierung für robuste Header-/Label-Matches
// =====================================================================

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/ß/g, "ss")
    .replace(/[—–]/g, "-")
    .replace(/&/g, " und ")
    .replace(/[„""''«»]/g, '"')
    .replace(/[^a-z0-9\s\-"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Strip leading list-markers, hashes, quotes etc. so a header like
// "### **1. Stimmungsbild & NPS**" reduces to "1. Stimmungsbild & NPS".
function stripLineDecorations(line: string): string {
  return line
    .replace(/^[#>*•·–\-\s|]+/, "")
    .replace(/[*]+$/, "")
    .trim();
}

// =====================================================================
// Section-Split
// =====================================================================

const SECTION_DEFS = [
  { num: 1, patterns: ["stimmungsbild", "nps"] },
  { num: 2, patterns: ["was funktioniert"] },
  { num: 3, patterns: ["probleme", "pain points"] },
  { num: 4, patterns: ["bewertung operations"] },
  { num: 5, patterns: ["zukunftsausblick"] },
  { num: 6, patterns: ["zitat", "referenz"] },
];

type Sections = {
  preamble: string; // alles vor Section 1 (Header mit Datum, Teilnehmer)
  byNum: Map<number, string>;
};

function splitSections(text: string): Sections {
  const lines = text.split(/\r?\n/);
  const byNum = new Map<number, string>();
  const preambleBuf: string[] = [];
  let currentNum: number | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentNum !== null) {
      byNum.set(currentNum, buffer.join("\n").trim());
    }
  };

  for (const raw of lines) {
    const stripped = stripLineDecorations(raw);
    const m = stripped.match(/^(\d)\.\s+(.+)$/);
    if (m) {
      const num = parseInt(m[1], 10);
      const rest = normalize(m[2]);
      const def = SECTION_DEFS.find(
        (d) => d.num === num && d.patterns.some((p) => rest.includes(p)),
      );
      if (def) {
        flush();
        currentNum = def.num;
        buffer = [];
        continue;
      }
    }
    if (currentNum === null) {
      preambleBuf.push(raw);
    } else {
      buffer.push(raw);
    }
  }
  flush();
  return { preamble: preambleBuf.join("\n").trim(), byNum };
}

// =====================================================================
// Field-Block-Extraktion innerhalb einer Section
// =====================================================================

type FieldPattern = { key: string; regex: RegExp };

// Zerlegt eine Section in benannte Sub-Blöcke. Eine Zeile, die auf eines
// der `patterns` matcht, startet einen neuen Block; alles bis zum nächsten
// Treffer (oder Section-Ende) ist der Wert dieses Blocks.
function extractFieldBlocks(
  section: string,
  patterns: FieldPattern[],
): Map<string, string> {
  const result = new Map<string, string>();
  const lines = section.split(/\r?\n/);
  let currentKey: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (currentKey !== null) {
      result.set(currentKey, buffer.join("\n").trim());
    }
  };

  for (const raw of lines) {
    const stripped = stripLineDecorations(raw);
    const normalized = normalize(stripped);
    let matched = false;
    for (const fp of patterns) {
      if (fp.regex.test(normalized)) {
        flush();
        currentKey = fp.key;
        // Wert nach dem ersten Trenner ":" oder "?" in der ORIGINAL-Zeile
        const sep = stripped.search(/[:?]/);
        const inline = sep >= 0 ? stripped.slice(sep + 1).trim() : "";
        buffer = inline ? [inline] : [];
        matched = true;
        break;
      }
    }
    if (!matched) {
      buffer.push(raw);
    }
  }
  flush();
  return result;
}

// =====================================================================
// Hilfen für Dropdown-Matching
// =====================================================================

type Opt = { label: string; value: string };

function matchSingleSelect(value: string, options: readonly Opt[]): string | null {
  const v = normalize(value);
  if (!v) return null;
  for (const o of options) {
    const lbl = normalize(o.label);
    if (v === lbl || v.startsWith(lbl + " ") || v === lbl) return o.value;
  }
  // Fallback: Label als Substring im Wert
  for (const o of options) {
    const lbl = normalize(o.label);
    if (v.includes(lbl)) return o.value;
  }
  return null;
}

// Mehrzeiliger Block → Liste von Bullet-Werten, die gegen options gematched werden.
function matchMultiSelectLines(
  content: string,
  options: readonly Opt[],
): { values: string[]; unmatched: string[] } {
  const lines = content
    .split(/\r?\n/)
    .map((l) => stripLineDecorations(l).replace(/^[•·\-*]+\s*/, "").trim())
    .filter((l) => l.length > 0);

  const found = new Set<string>();
  const unmatched: string[] = [];

  for (const line of lines) {
    const normLine = normalize(line);
    let matched: string | null = null;
    for (const o of options) {
      const lbl = normalize(o.label);
      if (!lbl) continue;
      if (normLine === lbl || normLine.includes(lbl)) {
        matched = o.value;
        break;
      }
    }
    if (matched) found.add(matched);
    else unmatched.push(line);
  }
  return { values: Array.from(found), unmatched };
}

// =====================================================================
// Spezial-Parser
// =====================================================================

function parseNpsValue(value: string): { value: string | null; estimated: boolean; missing: boolean } {
  const n = normalize(value);
  if (!n || /nicht erwahnt|nicht ableitbar|n[\/.]a/.test(n)) {
    return { value: null, estimated: false, missing: true };
  }
  const m = value.match(/\b(10|[0-9])\b/);
  if (!m) return { value: null, estimated: false, missing: true };
  const estimated = /geschatzt|geschaetzt|gesch[aä]tzt/.test(n);
  return { value: `p_${m[1]}`, estimated, missing: false };
}

function parseRating(value: string): string | null {
  const n = normalize(value);
  if (!n || /nicht erwahnt|nicht ableitbar/.test(n)) return null;
  const m = value.match(/\b([1-5])\b/);
  return m ? m[1] : null;
}

const DE_MONTHS: Record<string, string> = {
  januar: "01", jan: "01",
  februar: "02", feb: "02",
  marz: "03", maerz: "03", mar: "03",
  april: "04", apr: "04",
  mai: "05",
  juni: "06", jun: "06",
  juli: "07", jul: "07",
  august: "08", aug: "08",
  september: "09", sep: "09", sept: "09",
  oktober: "10", okt: "10", oct: "10",
  november: "11", nov: "11",
  dezember: "12", dez: "12", dec: "12",
  january: "01", february: "02", march: "03",
  may: "05", june: "06", july: "07",
  october: "10", december: "12",
};

function parseDate(value: string): string | null {
  // ISO YYYY-MM-DD
  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (iso) return iso[0];
  // DE DD.MM.YYYY
  const de = value.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  if (de) {
    const d = de[1].padStart(2, "0");
    const m = de[2].padStart(2, "0");
    return `${de[3]}-${m}-${d}`;
  }
  // "21. Mai 2026" / "21 May 2026"
  const named = value.match(/\b(\d{1,2})\.?\s+([A-Za-zäöüÄÖÜ]+)\.?\s+(\d{4})\b/);
  if (named) {
    const monthKey = normalize(named[2]);
    const mm = DE_MONTHS[monthKey];
    if (mm) {
      const d = named[1].padStart(2, "0");
      return `${named[3]}-${mm}-${d}`;
    }
  }
  return null;
}

// =====================================================================
// Hauptfunktion
// =====================================================================

export function parseKrispTranscript(text: string): ParseResult {
  const data: Partial<FeedbackFormData> = {};
  const status: Partial<Record<keyof FeedbackFormData, ImportFieldStatus>> = {};
  const notes: Partial<Record<keyof FeedbackFormData, string>> = {};
  const warnings: string[] = [];

  if (!text || text.trim().length < 50) {
    warnings.push("Transkript ist leer oder zu kurz, um etwas zu extrahieren.");
    return { data, status, notes, warnings };
  }

  const { preamble, byNum } = splitSections(text);

  if (byNum.size === 0) {
    warnings.push(
      'Keine Section-Header gefunden (z. B. "1. Stimmungsbild & NPS"). Bitte sicherstellen, dass das Krisp-Template angewendet wurde.',
    );
  }

  // ----- Meta: Datum aus Preamble (Krisp Date-Header) -----
  if (preamble) {
    const d = parseDate(preamble);
    if (d) {
      data.feedbackTerminDurchgefuehrtAm = d;
      status.feedbackTerminDurchgefuehrtAm = "parsed";
    }
  }

  // ----- Block 1: Eröffnung -----
  const b1 = byNum.get(1);
  if (b1) {
    const fields = extractFieldBlocks(b1, [
      { key: "nps", regex: /^nps[-\s]score/ },
      { key: "gesamt", regex: /^gesamt[-\s]zufriedenheit/ },
      { key: "erwartung", regex: /^(?:wurden die )?erwartung(?:en)?/ },
    ]);

    const nps = fields.get("nps");
    if (nps !== undefined) {
      const parsed = parseNpsValue(nps);
      if (parsed.value !== null) {
        data.npsScore = parsed.value;
        status.npsScore = parsed.estimated ? "review" : "parsed";
        if (parsed.estimated) notes.npsScore = "Krisp hat den Wert geschätzt — bitte gegenprüfen.";
      } else if (parsed.missing) {
        status.npsScore = "missing";
        notes.npsScore = "Im Gespräch nicht erwähnt — bitte manuell setzen.";
      }
    }

    const ges = fields.get("gesamt");
    if (ges !== undefined) {
      const v = matchSingleSelect(ges.split("\n")[0] || "", DROPDOWN_OPTIONS.gesamtZufriedenheit);
      if (v) {
        data.gesamtZufriedenheit = v;
        status.gesamtZufriedenheit = "parsed";
      } else {
        status.gesamtZufriedenheit = "review";
        notes.gesamtZufriedenheit = `Wert "${ges.slice(0, 60)}" konnte keiner Option zugeordnet werden.`;
      }
    }

    const erw = fields.get("erwartung");
    if (erw !== undefined) {
      const v = matchSingleSelect(erw.split("\n")[0] || "", DROPDOWN_OPTIONS.erwartungErfuellt);
      if (v) {
        data.erwartungErfuellt = v;
        status.erwartungErfuellt = "parsed";
      } else {
        status.erwartungErfuellt = "review";
        notes.erwartungErfuellt = `Wert "${erw.slice(0, 60)}" konnte keiner Option zugeordnet werden.`;
      }
    }
  }

  // ----- Block 2: Was funktioniert hat -----
  const b2 = byNum.get(2);
  if (b2) {
    const fields = extractFieldBlocks(b2, [
      { key: "groesserWert", regex: /^gro(?:s|ss)ter wert/ },
      { key: "wasLiefGut", regex: /^was lief (?:besonders )?gut/ },
    ]);

    const gw = fields.get("groesserWert");
    if (gw !== undefined) {
      const { values, unmatched } = matchMultiSelectLines(gw, DROPDOWN_OPTIONS.groesserWertUndProblem);
      if (values.length > 0) {
        data.groesserWertAusEvent = values;
        status.groesserWertAusEvent = unmatched.length > 0 ? "review" : "parsed";
        if (unmatched.length > 0) {
          notes.groesserWertAusEvent = `${unmatched.length} Einträge konnten nicht zugeordnet werden: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "…" : ""}`;
        }
      } else {
        status.groesserWertAusEvent = "missing";
        notes.groesserWertAusEvent = "Keine Einträge erkannt — bitte manuell wählen.";
      }
    }

    const wlg = fields.get("wasLiefGut");
    if (wlg !== undefined && wlg.trim().length > 0) {
      data.wasLiefBesondersGut = wlg.trim();
      status.wasLiefBesondersGut = "parsed";
    }
  }

  // ----- Block 3: Probleme & Pain Points -----
  const b3 = byNum.get(3);
  if (b3) {
    const fields = extractFieldBlocks(b3, [
      { key: "groesstesProblem", regex: /^gro(?:s|ss)tes problem/ },
      { key: "verbesserung", regex: /^wo (?:besteht (?:konkreter )?)?verbesserung/ },
      { key: "ungeloest", regex: /^welches problem/ },
      { key: "featureWuensche", regex: /^genannte feature[-\s]?wunsch/ },
      { key: "featureWortlaut", regex: /^(?:originalzitate|wortlaut)/ },
    ]);

    const gp = fields.get("groesstesProblem");
    if (gp !== undefined) {
      const { values, unmatched } = matchMultiSelectLines(gp, DROPDOWN_OPTIONS.groesserWertUndProblem);
      if (values.length > 0) {
        data.groesstesProblem = values;
        status.groesstesProblem = unmatched.length > 0 ? "review" : "parsed";
        if (unmatched.length > 0) {
          notes.groesstesProblem = `${unmatched.length} Einträge konnten nicht zugeordnet werden: ${unmatched.slice(0, 3).join(", ")}${unmatched.length > 3 ? "…" : ""}`;
        }
      } else {
        status.groesstesProblem = "missing";
        notes.groesstesProblem = "Keine Einträge erkannt — bitte manuell wählen.";
      }
    }

    const verb = fields.get("verbesserung");
    if (verb !== undefined && verb.trim().length > 0) {
      data.woVerbesserungsbedarf = verb.trim();
      status.woVerbesserungsbedarf = "parsed";
    }

    const ung = fields.get("ungeloest");
    if (ung !== undefined && ung.trim().length > 0) {
      data.welchesProblemUngeloest = ung.trim();
      status.welchesProblemUngeloest = "parsed";
    }

    const fw = fields.get("featureWuensche");
    if (fw !== undefined) {
      const { values, unmatched } = matchFeatureWishes(fw, DROPDOWN_OPTIONS.genannteFeatureWuensche);
      if (values.length > 0) data.genannteFeatureWuensche = values;
      if (values.length > 0 && unmatched.length === 0) {
        status.genannteFeatureWuensche = "parsed";
      } else if (values.length > 0) {
        status.genannteFeatureWuensche = "review";
        notes.genannteFeatureWuensche = `${unmatched.length} weitere Wunsch-Einträge konnten keiner Kategorie zugeordnet werden — Originalwortlaut ist unten in den Wortlaut-Feldern hinterlegt. Bitte ggf. manuell ergänzen.`;
      } else if (unmatched.length > 0) {
        status.genannteFeatureWuensche = "review";
        notes.genannteFeatureWuensche = "Wünsche wurden erkannt, ließen sich aber keinen Kategorien zuordnen — bitte manuell wählen. Originalwortlaut ist unten im Wortlaut-Feld hinterlegt.";
      }
      // Unzugeordnete Wünsche als Kontext in den Wortlaut-Block kippen
      if (unmatched.length > 0) {
        const extra = "[Nicht zugeordnete Wünsche aus Krisp]\n" + unmatched.map((u) => "• " + u).join("\n");
        const existing = data.featureWuenscheWortlaut ?? "";
        data.featureWuenscheWortlaut = existing ? existing + "\n\n" + extra : extra;
      }
    }

    const fwt = fields.get("featureWortlaut");
    if (fwt !== undefined && fwt.trim().length > 0) {
      const existing = data.featureWuenscheWortlaut ?? "";
      data.featureWuenscheWortlaut = existing ? fwt.trim() + "\n\n" + existing : fwt.trim();
      status.featureWuenscheWortlaut = "parsed";
    } else if (data.featureWuenscheWortlaut) {
      status.featureWuenscheWortlaut = "review";
    }
  }

  // ----- Block 4: Bewertung Operations -----
  const b4 = byNum.get(4);
  if (b4) {
    const fields = extractFieldBlocks(b4, [
      { key: "setup", regex: /^setup/ },
      { key: "support", regex: /^support/ },
    ]);

    const setup = fields.get("setup");
    if (setup !== undefined) {
      const lines = setup.split(/\r?\n/);
      const firstLine = lines[0] || "";
      const rating = parseRating(firstLine);
      if (rating) {
        data.setupBewertung = rating;
        status.setupBewertung = "parsed";
      } else {
        status.setupBewertung = "missing";
        notes.setupBewertung = "Keine Zahl 1–5 erkannt — bitte setzen.";
      }
      const rest = lines.slice(1).join("\n").trim();
      if (rest) {
        data.setupBewertungFreitext = rest;
        status.setupBewertungFreitext = "parsed";
      }
    }

    const sup = fields.get("support");
    if (sup !== undefined) {
      const lines = sup.split(/\r?\n/);
      const firstLine = lines[0] || "";
      const rating = parseRating(firstLine);
      if (rating) {
        data.supportBewertung = rating;
        status.supportBewertung = "parsed";
      } else {
        status.supportBewertung = "missing";
        notes.supportBewertung = "Keine Zahl 1–5 erkannt — bitte setzen.";
      }
      const rest = lines.slice(1).join("\n").trim();
      if (rest) {
        data.supportBewertungFreitext = rest;
        status.supportBewertungFreitext = "parsed";
      }
    }
  }

  // ----- Block 5: Zukunftsausblick -----
  const b5 = byNum.get(5);
  if (b5) {
    const fields = extractFieldBlocks(b5, [
      { key: "folge", regex: /^folge[-\s]?event/ },
      { key: "datum", regex: /^n[aä]?chstes event[-\s]?datum|^datum/ },
      { key: "rebookingW", regex: /^re[-\s]?booking[-\s]?wahrscheinlichkeit/ },
      { key: "rebookingH", regex: /^re[-\s]?booking[-\s]?h(?:u|ue)rd/ },
    ]);

    const folge = fields.get("folge");
    if (folge !== undefined) {
      const v = matchSingleSelect(folge.split("\n")[0] || "", DROPDOWN_OPTIONS.folgeEventGeplant);
      if (v) {
        data.folgeEventGeplant = v;
        status.folgeEventGeplant = "parsed";
      } else {
        status.folgeEventGeplant = "review";
        notes.folgeEventGeplant = `Wert "${folge.slice(0, 60)}" konnte keiner Option zugeordnet werden.`;
      }
    }

    const dat = fields.get("datum");
    if (dat !== undefined) {
      const d = parseDate(dat);
      if (d) {
        data.naechstesEventDatum = d;
        status.naechstesEventDatum = "parsed";
      } else {
        status.naechstesEventDatum = "review";
        notes.naechstesEventDatum = `Datum nicht eindeutig: "${dat.slice(0, 80)}". Originaltext in „Nächstes Event Anmerkung" übernommen.`;
        const cleaned = dat.trim();
        if (cleaned) {
          data.naechstesEventAnmerkung = cleaned;
          status.naechstesEventAnmerkung = "parsed";
        }
      }
    }

    const rbw = fields.get("rebookingW");
    if (rbw !== undefined) {
      const v = matchSingleSelect(rbw.split("\n")[0] || "", DROPDOWN_OPTIONS.rebookingWahrscheinlichkeit);
      if (v) {
        data.rebookingWahrscheinlichkeit = v;
        status.rebookingWahrscheinlichkeit = "parsed";
      } else {
        status.rebookingWahrscheinlichkeit = "review";
        notes.rebookingWahrscheinlichkeit = `Wert "${rbw.slice(0, 60)}" konnte keiner Option zugeordnet werden.`;
      }
    }

    const rbh = fields.get("rebookingH");
    if (rbh !== undefined && rbh.trim().length > 0) {
      data.rebookingHurdle = rbh.trim();
      status.rebookingHurdle = "parsed";
    }
  }

  // ----- Block 6: Zitat & Referenz -----
  const b6 = byNum.get(6);
  if (b6) {
    const fields = extractFieldBlocks(b6, [
      { key: "zitat", regex: /^wortlaut[-\s]?zitat/ },
      { key: "referenz", regex: /^als referenz/ },
    ]);

    const zitat = fields.get("zitat");
    if (zitat !== undefined && zitat.trim().length > 0) {
      data.wortlautZitat = zitat.trim();
      status.wortlautZitat = "parsed";
    }

    const ref = fields.get("referenz");
    if (ref !== undefined) {
      const v = matchSingleSelect(ref.split("\n")[0] || "", DROPDOWN_OPTIONS.alsReferenzNennbar);
      if (v) {
        data.alsReferenzNennbar = v;
        status.alsReferenzNennbar = "parsed";
      } else {
        status.alsReferenzNennbar = "review";
        notes.alsReferenzNennbar = `Wert "${ref.slice(0, 60)}" passt zu keiner Option (Ja, voll / Nur intern / Nein) — z. B. "Nicht besprochen" muss manuell gesetzt werden.`;
      }
    }
  }

  return { data, status, notes, warnings };
}

// =====================================================================
// Feature-Wünsche-Matching (eigene Heuristik wegen Liste mit 45 Optionen)
// =====================================================================

// Label-Format: "Prefix — Suffix" (z.B. "Sessions — Wartelisten-Logik").
// Strategie: Tokens aus Suffix sammeln, Match wenn ein "starkes" Token
// (Länge ≥ 5) der Suffix-Beschreibung im Krisp-Text vorkommt UND der
// Prefix-Begriff auch erwähnt wird.
function matchFeatureWishes(
  content: string,
  options: readonly Opt[],
): { values: string[]; unmatched: string[] } {
  // Tabellen-Header und leere Zeilen rauswerfen
  const rawLines = content
    .split(/\r?\n/)
    .map((l) => stripLineDecorations(l).trim())
    .filter((l) => l.length > 0)
    .filter((l) => !/^(bereich|beschreibung)\s*$/i.test(l));

  if (rawLines.length === 0) return { values: [], unmatched: [] };

  // Items konstruieren: Krisp gibt typischerweise Paare (Bereich-Zeile,
  // dann Beschreibungs-Zeile, getrennt durch Leerzeile). Manchmal aber
  // auch alles auf einer Zeile mit ":" oder Tab. Wir bauen Items konservativ:
  // wenn eine Zeile einen Doppelpunkt enthält und vor dem Doppelpunkt
  // < 40 Zeichen sind, gilt sie als komplettes "Bereich: Beschreibung".
  // Sonst wird sie mit der Folgezeile gepaart.
  const items: { bereich: string; beschreibung: string }[] = [];
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 40) {
      items.push({
        bereich: line.slice(0, colonIdx).trim(),
        beschreibung: line.slice(colonIdx + 1).trim(),
      });
    } else if (i + 1 < rawLines.length) {
      items.push({ bereich: line, beschreibung: rawLines[i + 1] });
      i++;
    } else {
      items.push({ bereich: line, beschreibung: "" });
    }
  }

  const found = new Set<string>();
  const unmatched: string[] = [];

  for (const item of items) {
    const haystack = normalize(item.bereich + " " + item.beschreibung);
    let bestVal: string | null = null;
    let bestScore = 0;

    for (const o of options) {
      const labelNorm = normalize(o.label);
      const parts = labelNorm.split(" - ");
      const prefix = parts[0] || "";
      const suffix = (parts[1] || "").trim();

      // Beide Hälften müssen plausibel vorkommen.
      const prefixHit = prefix.length > 0 && haystack.includes(prefix);
      if (!prefixHit) continue;

      const suffixTokens = suffix.split(/\s+/).filter((t) => t.length >= 5 && !STOPWORDS.has(t));
      if (suffixTokens.length === 0) continue;

      // Anchor-Regel: das längste (semantisch eindeutigste) Token muss
      // vorkommen. Sonst sind Treffer nur über generische Wörter wie
      // "session" oder "filter" möglich, was zu False Positives führt.
      const anchor = [...suffixTokens].sort((a, b) => b.length - a.length)[0];
      if (!haystack.includes(anchor)) continue;

      const hits = suffixTokens.filter((t) => haystack.includes(t)).length;
      const score = hits / suffixTokens.length;
      if (score >= 0.5 && score > bestScore) {
        bestScore = score;
        bestVal = o.value;
      }
    }

    if (bestVal) {
      found.add(bestVal);
    } else {
      const text = (item.bereich + (item.beschreibung ? ": " + item.beschreibung : "")).trim();
      if (text) unmatched.push(text);
    }
  }

  return { values: Array.from(found), unmatched };
}

const STOPWORDS = new Set([
  "und",
  "oder",
  "fur",
  "der",
  "die",
  "das",
  "den",
  "dem",
  "mit",
  "ohne",
  "uber",
  "unter",
  "einer",
  "einem",
  "eines",
  "alle",
  "alles",
  "auch",
  "noch",
  "nur",
  "bei",
  "zur",
  "zum",
  "nach",
]);
