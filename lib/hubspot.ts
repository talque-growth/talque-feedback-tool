import {
  HUBSPOT_PROPERTIES,
  EVENT_CONTEXT_PROPERTIES,
  type FeedbackFormData,
} from "./properties";

const BASE = "https://api.hubapi.com";

function token() {
  const t = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!t) throw new Error("HUBSPOT_ACCESS_TOKEN is not set");
  return t;
}

function authHeaders() {
  return {
    Authorization: `Bearer ${token()}`,
    "Content-Type": "application/json",
  };
}

export type DealListItem = {
  id: string;
  dealname: string;
  companyName: string;
  contactName: string;
  closedate: string;
  amount: number;
  eventStartDate: string;
  feedbackTerminDurchgefuehrt: boolean;
  rebookingWahrscheinlichkeit: string;
};

export type DealDetails = {
  id: string;
  dealname: string;
  companyName: string;
  contactName: string;
  closedate: string;
  amount: number;
  eventStartDate: string;
  eventEndDate: string;
  eventFormat: string;
  eventCountry: string;
  eventIndustry: string;
  krispTranskriptLink: string;
  feedback: Partial<FeedbackFormData>;
};

const FEEDBACK_PROPERTY_NAMES = Object.values(HUBSPOT_PROPERTIES);
const CONTEXT_PROPERTY_NAMES = Object.values(EVENT_CONTEXT_PROPERTIES);

const LIST_PROPERTIES = [
  "dealname",
  "closedate",
  "amount",
  "event_start_date",
  HUBSPOT_PROPERTIES.feedbackTerminDurchgefuehrtAm,
  HUBSPOT_PROPERTIES.rebookingWahrscheinlichkeit,
];

type SearchResponse = {
  total: number;
  results: Array<{
    id: string;
    properties: Record<string, string | null>;
    associations?: {
      contacts?: { results: Array<{ id: string }> };
      companies?: { results: Array<{ id: string }> };
    };
  }>;
};

const DEFAULT_LOOKBACK_DAYS = 365;
const MAX_RESULTS = 500;

export async function fetchDeals(lookbackDays = DEFAULT_LOOKBACK_DAYS): Promise<DealListItem[]> {
  const closedWonStageId = process.env.HUBSPOT_CLOSED_WON_STAGE_ID || "closedwon";
  const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;

  const filters: Array<Record<string, unknown>> = [
    { propertyName: "dealstage", operator: "EQ", value: closedWonStageId },
    { propertyName: "closedate", operator: "GTE", value: cutoff },
  ];

  const all: SearchResponse["results"] = [];
  let after: string | undefined;
  while (all.length < MAX_RESULTS) {
    const body: Record<string, unknown> = {
      filterGroups: [{ filters }],
      properties: LIST_PROPERTIES,
      sorts: [{ propertyName: "closedate", direction: "DESCENDING" }],
      limit: 100,
    };
    if (after) body.after = after;

    const res = await fetch(`${BASE}/crm/v3/objects/deals/search`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HubSpot search failed: ${res.status} ${text}`);
    }
    const json = (await res.json()) as SearchResponse & {
      paging?: { next?: { after: string } };
    };
    all.push(...json.results);
    const nextAfter = json.paging?.next?.after;
    if (!nextAfter) break;
    after = nextAfter;
  }

  const dealIds = all.map((r) => r.id);
  const associations = await fetchAssociations(dealIds);

  return all.map((r) => {
    const assoc = associations.get(r.id) ?? { companyName: "", contactName: "" };
    return {
      id: r.id,
      dealname: r.properties.dealname ?? "(ohne Namen)",
      companyName: assoc.companyName,
      contactName: assoc.contactName,
      closedate: r.properties.closedate ?? "",
      amount: r.properties.amount ? Number(r.properties.amount) : 0,
      eventStartDate: r.properties.event_start_date ?? "",
      feedbackTerminDurchgefuehrt: Boolean(
        r.properties[HUBSPOT_PROPERTIES.feedbackTerminDurchgefuehrtAm],
      ),
      rebookingWahrscheinlichkeit:
        r.properties[HUBSPOT_PROPERTIES.rebookingWahrscheinlichkeit] ?? "",
    } satisfies DealListItem;
  });
}

async function fetchAssociations(dealIds: string[]) {
  const map = new Map<string, { companyName: string; contactName: string }>();
  if (dealIds.length === 0) return map;

  const [companies, contacts] = await Promise.all([
    fetchAssoc(dealIds, "companies"),
    fetchAssoc(dealIds, "contacts"),
  ]);

  const companyIds = new Set<string>();
  const contactIds = new Set<string>();
  for (const ids of companies.values()) ids.forEach((id) => companyIds.add(id));
  for (const ids of contacts.values()) ids.forEach((id) => contactIds.add(id));

  const [companyNames, contactNames] = await Promise.all([
    fetchObjectsBatch("companies", [...companyIds], ["name"]),
    fetchObjectsBatch("contacts", [...contactIds], ["firstname", "lastname", "email"]),
  ]);

  for (const dealId of dealIds) {
    const cIds = companies.get(dealId) ?? [];
    const ctIds = contacts.get(dealId) ?? [];
    const companyName = cIds.map((id) => companyNames.get(id) ?? "").find(Boolean) ?? "";
    const contactName = ctIds.map((id) => contactNames.get(id) ?? "").find(Boolean) ?? "";
    map.set(dealId, { companyName, contactName });
  }
  return map;
}

async function fetchAssoc(
  dealIds: string[],
  toType: "contacts" | "companies",
): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const res = await fetch(
    `${BASE}/crm/v4/associations/deals/${toType}/batch/read`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ inputs: dealIds.map((id) => ({ id })) }),
      cache: "no-store",
    },
  );
  if (!res.ok) return result;
  const json = (await res.json()) as {
    results?: Array<{ from: { id: string }; to: Array<{ toObjectId: string }> }>;
  };
  for (const r of json.results ?? []) {
    result.set(
      r.from.id,
      r.to.map((t) => String(t.toObjectId)),
    );
  }
  return result;
}

async function fetchObjectsBatch(
  type: "companies" | "contacts",
  ids: string[],
  properties: string[],
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (ids.length === 0) return result;
  const res = await fetch(`${BASE}/crm/v3/objects/${type}/batch/read`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      properties,
      inputs: ids.map((id) => ({ id })),
    }),
    cache: "no-store",
  });
  if (!res.ok) return result;
  const json = (await res.json()) as {
    results?: Array<{ id: string; properties: Record<string, string | null> }>;
  };
  for (const r of json.results ?? []) {
    if (type === "companies") {
      result.set(r.id, r.properties.name ?? "");
    } else {
      const first = r.properties.firstname ?? "";
      const last = r.properties.lastname ?? "";
      const email = r.properties.email ?? "";
      const name = [first, last].filter(Boolean).join(" ").trim();
      result.set(r.id, name || email);
    }
  }
  return result;
}

export async function fetchDealDetails(dealId: string): Promise<DealDetails> {
  const props = [...FEEDBACK_PROPERTY_NAMES, ...CONTEXT_PROPERTY_NAMES].join(",");
  const res = await fetch(
    `${BASE}/crm/v3/objects/deals/${dealId}?properties=${encodeURIComponent(props)}&associations=contacts,companies`,
    { headers: authHeaders(), cache: "no-store" },
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot deal fetch failed: ${res.status} ${text}`);
  }
  const json = (await res.json()) as {
    id: string;
    properties: Record<string, string | null>;
    associations?: {
      contacts?: { results: Array<{ id: string }> };
      companies?: { results: Array<{ id: string }> };
    };
  };
  const associations = await fetchAssociations([json.id]);
  const assoc = associations.get(json.id) ?? { companyName: "", contactName: "" };
  const p = json.properties;

  const multiVal = (key: string): string[] => {
    const raw = p[key];
    if (!raw) return [];
    return raw.split(";").map((s) => s.trim()).filter(Boolean);
  };
  const boolVal = (key: string): boolean => p[key] === "true";

  return {
    id: json.id,
    dealname: p.dealname ?? "(ohne Namen)",
    companyName: assoc.companyName,
    contactName: assoc.contactName,
    closedate: p.closedate ?? "",
    amount: p.amount ? Number(p.amount) : 0,
    eventStartDate: p.event_start_date ?? "",
    eventEndDate: p.event_end_date ?? "",
    eventFormat: p.event_format ?? "",
    eventCountry: p.event_country ?? "",
    eventIndustry: p.event_industry ?? "",
    krispTranskriptLink: p[HUBSPOT_PROPERTIES.krispTranskriptLink] ?? "",
    feedback: {
      feedbackTerminDurchgefuehrtAm:
        p[HUBSPOT_PROPERTIES.feedbackTerminDurchgefuehrtAm] ?? "",
      feedbackErfasstDurch: p[HUBSPOT_PROPERTIES.feedbackErfasstDurch] ?? "",
      krispTranskriptLink: p[HUBSPOT_PROPERTIES.krispTranskriptLink] ?? "",
      npsScore: p[HUBSPOT_PROPERTIES.npsScore] ?? "",
      gesamtZufriedenheit: p[HUBSPOT_PROPERTIES.gesamtZufriedenheit] ?? "",
      erwartungErfuellt: p[HUBSPOT_PROPERTIES.erwartungErfuellt] ?? "",
      groesserWertAusEvent: multiVal(HUBSPOT_PROPERTIES.groesserWertAusEvent),
      wasLiefBesondersGut: p[HUBSPOT_PROPERTIES.wasLiefBesondersGut] ?? "",
      groesstesProblem: multiVal(HUBSPOT_PROPERTIES.groesstesProblem),
      woVerbesserungsbedarf: p[HUBSPOT_PROPERTIES.woVerbesserungsbedarf] ?? "",
      welchesProblemUngeloest:
        p[HUBSPOT_PROPERTIES.welchesProblemUngeloest] ?? "",
      genannteFeatureWuensche: multiVal(HUBSPOT_PROPERTIES.genannteFeatureWuensche),
      featureWuenscheWortlaut:
        p[HUBSPOT_PROPERTIES.featureWuenscheWortlaut] ?? "",
      setupBewertung: p[HUBSPOT_PROPERTIES.setupBewertung] ?? "",
      setupBewertungFreitext:
        p[HUBSPOT_PROPERTIES.setupBewertungFreitext] ?? "",
      supportBewertung: p[HUBSPOT_PROPERTIES.supportBewertung] ?? "",
      supportBewertungFreitext:
        p[HUBSPOT_PROPERTIES.supportBewertungFreitext] ?? "",
      folgeEventGeplant: p[HUBSPOT_PROPERTIES.folgeEventGeplant] ?? "",
      naechstesEventDatum: p[HUBSPOT_PROPERTIES.naechstesEventDatum] ?? "",
      naechstesEventDatumUnsicher: boolVal(
        HUBSPOT_PROPERTIES.naechstesEventDatumUnsicher,
      ),
      naechstesEventAnmerkung:
        p[HUBSPOT_PROPERTIES.naechstesEventAnmerkung] ?? "",
      rebookingWahrscheinlichkeit:
        p[HUBSPOT_PROPERTIES.rebookingWahrscheinlichkeit] ?? "",
      rebookingHurdle: p[HUBSPOT_PROPERTIES.rebookingHurdle] ?? "",
      wortlautZitat: p[HUBSPOT_PROPERTIES.wortlautZitat] ?? "",
      alsReferenzNennbar: p[HUBSPOT_PROPERTIES.alsReferenzNennbar] ?? "",
    },
  };
}

export async function updateDealProperties(
  dealId: string,
  properties: Record<string, string>,
) {
  const res = await fetch(`${BASE}/crm/v3/objects/deals/${dealId}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ properties }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HubSpot update failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function buildHubSpotPayload(formData: FeedbackFormData): Record<string, string> {
  const out: Record<string, string> = {};
  const set = (key: string, value: string | string[] | boolean) => {
    if (Array.isArray(value)) {
      if (value.length === 0) return;
      out[key] = value.join(";");
      return;
    }
    if (typeof value === "boolean") {
      out[key] = value ? "true" : "false";
      return;
    }
    if (value !== "" && value !== null && value !== undefined) {
      out[key] = value;
    }
  };

  // Defensive: HubSpot's nps_score expects "p_0".."p_10". Coerce any bare number.
  if (formData.npsScore) {
    const raw = formData.npsScore.startsWith("p_")
      ? formData.npsScore
      : `p_${formData.npsScore}`;
    set(HUBSPOT_PROPERTIES.npsScore, raw);
  }
  set(HUBSPOT_PROPERTIES.gesamtZufriedenheit, formData.gesamtZufriedenheit);
  set(HUBSPOT_PROPERTIES.erwartungErfuellt, formData.erwartungErfuellt);
  set(HUBSPOT_PROPERTIES.groesserWertAusEvent, formData.groesserWertAusEvent);
  set(HUBSPOT_PROPERTIES.wasLiefBesondersGut, formData.wasLiefBesondersGut);
  set(HUBSPOT_PROPERTIES.groesstesProblem, formData.groesstesProblem);
  set(HUBSPOT_PROPERTIES.woVerbesserungsbedarf, formData.woVerbesserungsbedarf);
  set(
    HUBSPOT_PROPERTIES.welchesProblemUngeloest,
    formData.welchesProblemUngeloest,
  );
  set(
    HUBSPOT_PROPERTIES.genannteFeatureWuensche,
    formData.genannteFeatureWuensche,
  );
  set(
    HUBSPOT_PROPERTIES.featureWuenscheWortlaut,
    formData.featureWuenscheWortlaut,
  );
  set(HUBSPOT_PROPERTIES.setupBewertung, formData.setupBewertung);
  set(HUBSPOT_PROPERTIES.setupBewertungFreitext, formData.setupBewertungFreitext);
  set(HUBSPOT_PROPERTIES.supportBewertung, formData.supportBewertung);
  set(
    HUBSPOT_PROPERTIES.supportBewertungFreitext,
    formData.supportBewertungFreitext,
  );
  set(HUBSPOT_PROPERTIES.folgeEventGeplant, formData.folgeEventGeplant);

  if (
    formData.folgeEventGeplant === "ja_fest_geplant" ||
    formData.folgeEventGeplant === "ja_in_diskussion"
  ) {
    if (formData.naechstesEventDatum) {
      set(HUBSPOT_PROPERTIES.naechstesEventDatum, formData.naechstesEventDatum);
    }
  }
  if (formData.folgeEventGeplant === "wahrscheinlich_noch_unklar") {
    set(
      HUBSPOT_PROPERTIES.naechstesEventDatumUnsicher,
      formData.naechstesEventDatumUnsicher,
    );
  }
  if (
    formData.folgeEventGeplant !== "nein" &&
    formData.folgeEventGeplant !== "einmaliges_event"
  ) {
    set(
      HUBSPOT_PROPERTIES.naechstesEventAnmerkung,
      formData.naechstesEventAnmerkung,
    );
  }

  set(
    HUBSPOT_PROPERTIES.rebookingWahrscheinlichkeit,
    formData.rebookingWahrscheinlichkeit,
  );
  if (
    ["unsicher", "eher_nicht", "sicher_nicht"].includes(
      formData.rebookingWahrscheinlichkeit,
    )
  ) {
    set(HUBSPOT_PROPERTIES.rebookingHurdle, formData.rebookingHurdle);
  }

  set(HUBSPOT_PROPERTIES.wortlautZitat, formData.wortlautZitat);
  set(HUBSPOT_PROPERTIES.alsReferenzNennbar, formData.alsReferenzNennbar);

  set(
    HUBSPOT_PROPERTIES.feedbackTerminDurchgefuehrtAm,
    new Date().toISOString().split("T")[0],
  );
  if (formData.krispTranskriptLink) {
    set(HUBSPOT_PROPERTIES.krispTranskriptLink, formData.krispTranskriptLink);
  }

  return out;
}
