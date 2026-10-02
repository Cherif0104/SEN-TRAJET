/**
 * Analyse "au mieux" (best-effort) d'un récapitulatif de réservation collé depuis WhatsApp, pour
 * pré-remplir le formulaire de réservation au lieu de tout ressaisir à la main.
 *
 * Volontairement PRUDENT sur le départ/destination : on ne peut pas géocoder un texte libre sans
 * risquer une position GPS fausse (donc une distance et un prix faux). On se contente donc de
 * REPÉRER le texte du trajet et de le proposer comme rappel — c'est à l'utilisateur de le
 * sélectionner ensuite dans les champs Départ/Destination (avec autocomplétion, donc géocodage
 * fiable).
 *
 * Ceci est une V1 générique. Elle sera affinée une fois que des exemples réels de récapitulatifs
 * WhatsApp seront fournis (formats de dates, libellés utilisés, etc.).
 */
export type WhatsAppParseResult = {
  phone: string | null;
  date: string | null; // "YYYY-MM-DD"
  time: string | null; // "HH:MM"
  passengers: number | null;
  flightNumber: string | null;
  passengerName: string | null;
  routeHint: string | null; // texte brut du trajet détecté, à confirmer manuellement
};

const MONTHS_FR: Record<string, number> = {
  janvier: 1,
  février: 2,
  fevrier: 2,
  mars: 3,
  avril: 4,
  mai: 5,
  juin: 6,
  juillet: 7,
  août: 8,
  aout: 8,
  septembre: 9,
  octobre: 10,
  novembre: 11,
  décembre: 12,
  decembre: 12,
};

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

// Séparateur de champs fréquent dans un récapitulatif WhatsApp collé sur une seule ligne (tiret
// cadratin/demi-cadratin), en plus du saut de ligne. Sert de "fin de champ" pour les captures.
const FIELD_BOUNDARY = "\\n—–";

function parsePhone(text: string): string | null {
  // Numéro sénégalais (7X + 7 chiffres), quel que soit le groupement des espaces/points/tirets
  // ("77 654 32 10", "776543210", "77-654-32-10"…) — chaque chiffre peut avoir un séparateur.
  const match = text.match(/7[0-8](?:[\s.\-]?\d){7}/);
  if (!match) return null;
  const digitsOnly = match[0].replace(/\D/g, "");
  if (digitsOnly.length !== 9) return null;
  return `221${digitsOnly}`;
}

function parseDate(text: string, referenceYear: number): string | null {
  const numeric = text.match(/\b(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\b/);
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }
  const frenchMonths = Object.keys(MONTHS_FR).join("|");
  const textDate = new RegExp(`\\b(\\d{1,2})\\s+(${frenchMonths})\\s*(\\d{4})?\\b`, "i").exec(text);
  if (textDate) {
    const day = Number(textDate[1]);
    const month = MONTHS_FR[textDate[2].toLowerCase()];
    const year = textDate[3] ? Number(textDate[3]) : referenceYear;
    return `${year}-${pad2(month)}-${pad2(day)}`;
  }
  return null;
}

function parseTime(text: string): string | null {
  const match = text.match(/\b([01]?\d|2[0-3])\s*[h:]\s*([0-5]\d)?\b/i);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour > 23 || minute > 59) return null;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parsePassengers(text: string): number | null {
  const match = text.match(/\b(\d{1,2})\s*(?:personnes?|pers\.?|pax|passagers?|places?)\b/i);
  if (!match) return null;
  const n = Number(match[1]);
  return n > 0 && n <= 60 ? n : null;
}

function parseFlightNumber(text: string): string | null {
  const match = text.match(/vol\s*:?\s*([A-Z]{2}\s?-?\d{2,4})/i);
  if (!match) return null;
  return match[1].replace(/\s+/g, "").toUpperCase();
}

function parsePassengerName(text: string): string | null {
  const match = text.match(new RegExp(`(?:nom du passager|nom passager|passager|client|nom)\\s*:\\s*([^${FIELD_BOUNDARY},;]{2,60})`, "i"));
  if (!match) return null;
  return match[1].trim();
}

function parseRouteHint(text: string): string | null {
  const depart = new RegExp(`d[ée]part\\s*:?\\s*([^${FIELD_BOUNDARY}]+?)(?:[\\n—–]|$)`, "i").exec(text)?.[1]?.trim();
  const destination = new RegExp(`(?:destination|arriv[ée]e)\\s*:?\\s*([^${FIELD_BOUNDARY}]+?)(?:[\\n—–]|$)`, "i").exec(text)?.[1]?.trim();
  if (depart && destination) return `${depart} → ${destination}`;

  const arrow = /([^\n→\-]{4,60}?)\s*(?:→|->)\s*([^\n—–]{4,60})/.exec(text);
  if (arrow) return `${arrow[1].trim()} → ${arrow[2].trim()}`;

  const deA = /\bde\s+([^\n—–]{4,60}?)\s+(?:à|a|vers)\s+([^\n—–]{4,60})/i.exec(text);
  if (deA) return `${deA[1].trim()} → ${deA[2].trim()}`;

  return null;
}

export function parseWhatsAppBookingSummary(rawText: string, now: Date = new Date()): WhatsAppParseResult {
  const text = rawText.trim();
  return {
    phone: parsePhone(text),
    date: parseDate(text, now.getFullYear()),
    time: parseTime(text),
    passengers: parsePassengers(text),
    flightNumber: parseFlightNumber(text),
    passengerName: parsePassengerName(text),
    routeHint: parseRouteHint(text),
  };
}

/** Vrai si au moins un champ a pu être détecté (sinon inutile de proposer "Appliquer"). */
export function hasAnyParsedField(result: WhatsAppParseResult): boolean {
  return Boolean(
    result.phone || result.date || result.time || result.passengers || result.flightNumber || result.passengerName || result.routeHint
  );
}
