import { REQUIRED_FIELDS, type FeedbackFormData } from "./properties";

export const REQUIRED_LABELS: Record<(typeof REQUIRED_FIELDS)[number], string> = {
  npsScore: "NPS-Score",
  gesamtZufriedenheit: "Gesamt-Zufriedenheit",
  groesserWertAusEvent: "Größter Wert aus Event",
  groesstesProblem: "Größtes Problem",
  welchesProblemUngeloest: "Welches Problem ungelöst",
  folgeEventGeplant: "Folge-Event geplant",
  rebookingWahrscheinlichkeit: "Re-Booking-Wahrscheinlichkeit",
};

export const FIELD_TO_BLOCK: Record<(typeof REQUIRED_FIELDS)[number], number> = {
  npsScore: 1,
  gesamtZufriedenheit: 1,
  groesserWertAusEvent: 2,
  groesstesProblem: 3,
  welchesProblemUngeloest: 3,
  folgeEventGeplant: 5,
  rebookingWahrscheinlichkeit: 5,
};

export function validateRequired(
  formData: FeedbackFormData,
): Array<(typeof REQUIRED_FIELDS)[number]> {
  return REQUIRED_FIELDS.filter((field) => {
    const value = formData[field];
    if (Array.isArray(value)) return value.length === 0;
    return !value;
  }) as Array<(typeof REQUIRED_FIELDS)[number]>;
}

export function emptyFormData(): FeedbackFormData {
  return {
    feedbackTerminDurchgefuehrtAm: "",
    feedbackErfasstDurch: "",
    krispTranskriptLink: "",
    npsScore: "",
    gesamtZufriedenheit: "",
    erwartungErfuellt: "",
    groesserWertAusEvent: [],
    wasLiefBesondersGut: "",
    groesstesProblem: [],
    woVerbesserungsbedarf: "",
    welchesProblemUngeloest: "",
    genannteFeatureWuensche: [],
    featureWuenscheWortlaut: "",
    setupBewertung: "",
    setupBewertungFreitext: "",
    supportBewertung: "",
    supportBewertungFreitext: "",
    folgeEventGeplant: "",
    naechstesEventDatum: "",
    naechstesEventDatumUnsicher: false,
    naechstesEventAnmerkung: "",
    rebookingWahrscheinlichkeit: "",
    rebookingHurdle: "",
    wortlautZitat: "",
    alsReferenzNennbar: "",
  };
}
