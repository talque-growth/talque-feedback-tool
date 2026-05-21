// =====================================================================
// HubSpot Deal Properties — Post-Event-Feedback
// Stand: 20.05.2026, finale Version mit allen 23 Properties
// =====================================================================
//
// WICHTIG zu HubSpot-Eigenheiten:
// - Dropdown-Werte: Label wird im UI gezeigt, value wird via API gesetzt.
//   Beim PATCH-Call IMMER value verwenden, nie label.
// - Multi-Select: Werte als Semikolon-getrennter String,
//   z.B. "networking__matchmaking;effizienz_fur_organisator"
// - Datum: Format "YYYY-MM-DD"
// - NPS: Dropdown mit String-Werten "0" bis "10" (nicht als Zahl)
//
// =====================================================================

export const HUBSPOT_PROPERTIES = {
  // Meta-Felder
  feedbackTerminDurchgefuehrtAm: 'feedbacktermin_durchgefuhrt_am',  // date
  feedbackErfasstDurch: 'feedback_erfasst_durch',                    // enumeration
  krispTranskriptLink: 'krisptranskriptlink',                        // string (URL)

  // Block 1: Eröffnung
  npsScore: 'nps_score',                                              // enumeration (Dropdown 0-10)
  gesamtZufriedenheit: 'gesamtzufriedenheit',                         // enumeration
  erwartungErfuellt: 'erwartung_erfullt',                             // enumeration

  // Block 2: Was funktioniert hat
  groesserWertAusEvent: 'groter_wert_aus_event',                      // enumeration (Multi-Select)
  wasLiefBesondersGut: 'was_lief_besonders_gut',                      // string (multi-line)

  // Block 3: Probleme und Pain Points
  groesstesProblem: 'grotes_problem',                                 // enumeration (Multi-Select)
  woVerbesserungsbedarf: 'wo_verbesserungsbedarf',                    // string (multi-line)
  welchesProblemUngeloest: 'welches_problem_haben_wir_nicht_gelost',  // string (multi-line)
  genannteFeatureWuensche: 'genannte_featurewunsche',                 // enumeration (Multi-Select)
  featureWuenscheWortlaut: 'feature_wuensche_wortlaut',               // string (multi-line)

  // Block 4: Bewertung Operations
  setupBewertung: 'setupbewertung',                                   // enumeration (1-5)
  supportBewertung: 'supportbewertung',                               // enumeration (1-5)

  // Block 5: Zukunftsausblick
  folgeEventGeplant: 'folgeevent_geplant',                            // enumeration
  naechstesEventDatum: 'nachstes_event_datum',                        // date
  naechstesEventDatumUnsicher: 'nachstes_event_datum_unsicher',       // bool
  naechstesEventAnmerkung: 'nachstes_event_anmerkung',                // string
  rebookingWahrscheinlichkeit: 'rebookingwahrscheinlichkeit',         // enumeration
  rebookingHurdle: 'rebooking_hurdle',                                // string (multi-line)

  // Block 6: Abschluss
  wortlautZitat: 'wortlautzitat',                                     // string (multi-line)
  alsReferenzNennbar: 'als_referenz_nennbar',                         // enumeration
} as const;


// =====================================================================
// DROPDOWN-WERTE
// Format: { label: "Was im UI angezeigt wird", value: "internal_value_fuer_api" }
// =====================================================================

export const DROPDOWN_OPTIONS = {

  // NPS als Dropdown 0-10 — HubSpot speichert die Option-Values als "p_0" … "p_10".
  npsScore: [
    { label: '0',  value: 'p_0' },
    { label: '1',  value: 'p_1' },
    { label: '2',  value: 'p_2' },
    { label: '3',  value: 'p_3' },
    { label: '4',  value: 'p_4' },
    { label: '5',  value: 'p_5' },
    { label: '6',  value: 'p_6' },
    { label: '7',  value: 'p_7' },
    { label: '8',  value: 'p_8' },
    { label: '9',  value: 'p_9' },
    { label: '10', value: 'p_10' },
  ],

  gesamtZufriedenheit: [
    { label: 'Sehr zufrieden',    value: 'Sehr zufrieden' },
    { label: 'Zufrieden',         value: 'Zufrieden' },
    { label: 'Neutral',           value: 'Neutral' },
    { label: 'Unzufrieden',       value: 'Unzufrieden' },
    { label: 'Sehr unzufrieden',  value: 'Sehr unzufrieden' },
  ],

  erwartungErfuellt: [
    { label: 'Übertroffen',   value: 'Übertroffen' },
    { label: 'Erfüllt',       value: 'Erfüllt' },
    { label: 'Teilweise',     value: 'Teilweise' },
    { label: 'Nicht erfüllt', value: 'Nicht erfüllt' },
  ],

  // Identische Werte für "Größter Wert" und "Größtes Problem"
  groesserWertUndProblem: [
    { label: 'Networking & Matchmaking',         value: 'networking__matchmaking' },
    { label: 'Teilnehmer-Engagement',            value: 'teilnehmerengagement' },
    { label: 'Effizienz für Organisator',        value: 'effizienz_fur_organisator' },
    { label: 'Datenqualität & Insights',         value: 'datenqualitat__insights' },
    { label: 'Sponsoren-Wertschöpfung',          value: 'sponsorenwertschopfung' },
    { label: 'Markenauftritt & Branding',        value: 'markenauftritt__branding' },
    { label: 'Hybride Erfahrung',                value: 'hybride_erfahrung' },
    { label: 'Speaker- & Session-Management',    value: 'speaker__sessionmanagement' },
    { label: 'Ticketing & Registrierung',        value: 'ticketing__registrierung' },
    { label: 'Reduzierter manueller Aufwand',    value: 'reduzierter_manueller_aufwand' },
    { label: 'Plattform-Stabilität',             value: 'plattformstabilitat' },
    { label: 'Support während Event',            value: 'support_wahrend_event' },
    { label: 'Mobile App-Erlebnis',              value: 'mobile_apperlebnis' },
    { label: 'Plugin-Integration',               value: 'pluginintegration' },
    { label: 'Sonstiges',                        value: 'sonstiges' },
  ],

  setupBewertung: [
    { label: '1',  value: '1' },
    { label: '2',  value: '2' },
    { label: '3',  value: '3' },
    { label: '4',  value: '4' },
    { label: '5',  value: '5' },
  ],

  supportBewertung: [
    { label: '1',  value: '1' },
    { label: '2',  value: '2' },
    { label: '3',  value: '3' },
    { label: '4',  value: '4' },
    { label: '5',  value: '5' },
  ],

  folgeEventGeplant: [
    { label: 'Ja, fest geplant',            value: 'ja_fest_geplant' },
    { label: 'Ja, in Diskussion',           value: 'ja_in_diskussion' },
    { label: 'Wahrscheinlich, noch unklar', value: 'wahrscheinlich_noch_unklar' },
    { label: 'Nein',                        value: 'nein' },
    { label: 'Einmaliges Event',            value: 'einmaliges_event' },
  ],

  rebookingWahrscheinlichkeit: [
    { label: 'Sicher',         value: 'sicher' },
    { label: 'Wahrscheinlich', value: 'wahrscheinlich' },
    { label: 'Unsicher',       value: 'unsicher' },
    { label: 'Eher nicht',     value: 'eher_nicht' },
    { label: 'Sicher nicht',   value: 'sicher_nicht' },
  ],

  alsReferenzNennbar: [
    { label: 'Ja, voll',    value: 'ja_voll' },
    { label: 'Nur intern',  value: 'nur_intern' },
    { label: 'Nein',        value: 'nein' },
  ],

  genannteFeatureWuensche: [
    { label: 'Sessions — Multi-Partner pro Session', value: 'sessions__multipartner_pro_session' },
    { label: 'Sessions — Bulk-Upload und CSV-Import erweitern', value: 'sessions__bulkupload_und_csvimport_erweitern' },
    { label: 'Sessions — Agenda als Tabellen-Übersicht / Parallel-Ansicht', value: 'sessions__agenda_als_tabellenubersicht__parallelansicht' },
    { label: 'Sessions — Wartelisten-Logik', value: 'sessions__wartelistenlogik' },
    { label: 'Sessions — Session-Sprache und Session-Typ sichtbar', value: 'sessions__sessionsprache_und_sessiontyp_sichtbar' },
    { label: 'Sessions — Embed-Links für externe Plattformen (Zoom, Teams)', value: 'sessions__embedlinks_fur_externe_plattformen_zoom_teams' },
    { label: 'Sessions — Stornierungs- und Cancel-Funktionalität', value: 'sessions__stornierungs_und_cancelfunktionalitat' },
    { label: 'Speakers — Bulk-Mailings (Alle anschreiben mit einem Klick)', value: 'speakers__bulkmailings_alle_anschreiben_mit_einem_klick' },
    { label: 'Speakers — Profil-Editor und Self-Service-Forms verbessern', value: 'speakers__profileditor_und_selfserviceforms_verbessern' },
    { label: 'Speakers — Akademische Titel und individuelle Felder', value: 'speakers__akademische_titel_und_individuelle_felder' },
    { label: 'Partners — Profile duplizieren', value: 'partners__profile_duplizieren' },
    { label: 'Partners — Logo-Rotation und Sortierungs-Optionen', value: 'partners__logorotation_und_sortierungsoptionen' },
    { label: 'Partners — Externe Vendor-IDs erfassen', value: 'partners__externe_vendorids_erfassen' },
    { label: 'Networking — Barcodes / QR-Codes für Meeting Spots', value: 'networking__barcodes__qrcodes_fur_meeting_spots' },
    { label: 'Networking — Deeplinks für Meeting Spots und Räume', value: 'networking__deeplinks_fur_meeting_spots_und_raume' },
    { label: 'Networking — Kalender selbst blocken können', value: 'networking__kalender_selbst_blocken_konnen' },
    { label: 'Networking — Erweiterte Matchmaking-Algorithmen', value: 'networking__erweiterte_matchmakingalgorithmen' },
    { label: 'Onboarding — Custom Fields für individuelle Datenerfassung', value: 'onboarding__custom_fields_fur_individuelle_datenerfassung' },
    { label: 'Onboarding — Branding und Custom-CSS für Registrierung', value: 'onboarding__branding_und_customcss_fur_registrierung' },
    { label: 'Onboarding — Bessere Company-Self-Assignment-Logik', value: 'onboarding__bessere_companyselfassignmentlogik' },
    { label: 'Ticketing — Discount Codes und Promo-Aktionen', value: 'ticketing__discount_codes_und_promoaktionen' },
    { label: 'Ticketing — Multi-Tier-Pricing und komplexe Preislogik', value: 'ticketing__multitierpricing_und_komplexe_preislogik' },
    { label: 'Chat — Nachrichten löschen, bearbeiten, archivieren', value: 'chat__nachrichten_loschen_bearbeiten_archivieren' },
    { label: 'Chat — Erweiterte Push-Notifications', value: 'chat__erweiterte_pushnotifications' },
    { label: 'Announcements — Geplante / terminierte Ankündigungen', value: 'announcements__geplante__terminierte_ankundigungen' },
    { label: 'Announcements — Targeting nach Teilnehmer-Kategorie', value: 'announcements__targeting_nach_teilnehmerkategorie' },
    { label: 'Analytics — Teilnehmer-Interaktions-Reports', value: 'analytics__teilnehmerinteraktionsreports' },
    { label: 'Analytics — Newspost- und Engagement-Tracking', value: 'analytics__newspost_und_engagementtracking' },
    { label: 'Analytics — Custom Dashboards und Exports', value: 'analytics__custom_dashboards_und_exports' },
    { label: 'Analytics — Conversion-Tracking für Sponsoren', value: 'analytics__conversiontracking_fur_sponsoren' },
    { label: 'Admin — Bulk-Operations und Trigger-Points', value: 'admin__bulkoperations_und_triggerpoints' },
    { label: 'Admin — Cloning von Events und Netzwerken', value: 'admin__cloning_von_events_und_netzwerken' },
    { label: 'Admin — Erweiterte Berechtigungen und Rollen-Management', value: 'admin__erweiterte_berechtigungen_und_rollenmanagement' },
    { label: 'Admin — Superadmin-Übersichten und Logs', value: 'admin__superadminubersichten_und_logs' },
    { label: 'Filtering — Erweiterte Filter nach Teilnehmer-Kategorie', value: 'filtering__erweiterte_filter_nach_teilnehmerkategorie' },
    { label: 'Filtering — Such-Funktion in allen Bereichen verbessern', value: 'filtering__suchfunktion_in_allen_bereichen_verbessern' },
    { label: 'Mobile App — Push-Notifications und App-Funktionsumfang', value: 'mobile_app__pushnotifications_und_appfunktionsumfang' },
    { label: 'Mobile App — Offline-Modus und Performance', value: 'mobile_app__offlinemodus_und_performance' },
    { label: 'Plugin — Map / Lageplan-Integration', value: 'plugin__map__lageplanintegration' },
    { label: 'Plugin — Externe Tool-Integrationen (CRMs, Mailing)', value: 'plugin__externe_toolintegrationen_crms_mailing' },
    { label: 'API & Webhooks — Externe Datenanbindung', value: 'api__webhooks__externe_datenanbindung' },
    { label: 'UX — Allgemeine Bedienbarkeits-Verbesserungen', value: 'ux__allgemeine_bedienbarkeitsverbesserungen' },
    { label: 'UX — Gendern und inklusive Sprache', value: 'ux__gendern_und_inklusive_sprache' },
    { label: 'UX — Hintergrund- und Branding-Konsistenz', value: 'ux__hintergrund_und_brandingkonsistenz' },
    { label: 'UX — Tastatur-Shortcuts und Power-User-Features', value: 'ux__tastaturshortcuts_und_poweruserfeatures' },
    { label: 'Sonstiges (Pflicht-Freitext bei Auswahl)', value: 'sonstiges_pflichtfreitext_bei_auswahl' },
  ],

} as const;


// =====================================================================
// EVENT-CONTEXT-PROPERTIES (nur lesen, für Anzeige am Form-Header)
// =====================================================================

export const EVENT_CONTEXT_PROPERTIES = {
  dealname: 'dealname',
  amount: 'amount',
  eventStartDate: 'event_start_date',
  eventEndDate: 'event_end_date',
  eventFormat: 'event_format',
  eventCountry: 'event_country',
  eventIndustry: 'event_industry',
  hubspotOwnerId: 'hubspot_owner_id',
} as const;


// =====================================================================
// PFLICHTFELDER beim Submit (Frontend-Validierung)
// =====================================================================

export const REQUIRED_FIELDS = [
  'npsScore',
  'gesamtZufriedenheit',
  'groesserWertAusEvent',
  'groesstesProblem',
  'welchesProblemUngeloest',
  'folgeEventGeplant',
  'rebookingWahrscheinlichkeit',
] as const;


// =====================================================================
// TYPESCRIPT TYPES für den Form-State
// =====================================================================

export type FeedbackFormData = {
  // Meta
  feedbackTerminDurchgefuehrtAm: string;   // YYYY-MM-DD
  feedbackErfasstDurch: string;            // HubSpot User ID
  krispTranskriptLink: string;

  // Block 1
  npsScore: string;                        // '0' bis '10'
  gesamtZufriedenheit: string;
  erwartungErfuellt: string;

  // Block 2
  groesserWertAusEvent: string[];          // Multi-Select als Array, beim Submit join(';')
  wasLiefBesondersGut: string;

  // Block 3
  groesstesProblem: string[];
  woVerbesserungsbedarf: string;
  welchesProblemUngeloest: string;
  genannteFeatureWuensche: string[];
  featureWuenscheWortlaut: string;

  // Block 4
  setupBewertung: string;
  supportBewertung: string;

  // Block 5
  folgeEventGeplant: string;
  naechstesEventDatum: string;             // YYYY-MM-DD
  naechstesEventDatumUnsicher: boolean;
  naechstesEventAnmerkung: string;
  rebookingWahrscheinlichkeit: string;
  rebookingHurdle: string;

  // Block 6
  wortlautZitat: string;
  alsReferenzNennbar: string;
};
