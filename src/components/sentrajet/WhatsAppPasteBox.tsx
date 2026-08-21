"use client";

import { useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { hasAnyParsedField, parseWhatsAppBookingSummary, type WhatsAppParseResult } from "@/lib/whatsappParser";

type Props = {
  onApply: (result: WhatsAppParseResult) => void;
};

const FIELD_LABELS: Array<[keyof WhatsAppParseResult, string]> = [
  ["phone", "Téléphone"],
  ["date", "Date"],
  ["time", "Heure"],
  ["passengers", "Passagers"],
  ["flightNumber", "N° de vol"],
  ["passengerName", "Nom du passager"],
  ["routeHint", "Trajet (à confirmer dans Départ/Destination)"],
];

/**
 * Zone "Coller depuis WhatsApp" : pré-remplit au mieux le formulaire à partir d'un récapitulatif
 * de réservation collé tel quel. Version générique (V1) — le départ/destination ne sont jamais
 * appliqués automatiquement à un champ d'adresse (risque de coordonnées GPS fausses), seulement
 * signalés comme rappel à confirmer manuellement.
 */
export function WhatsAppPasteBox({ onApply }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [result, setResult] = useState<WhatsAppParseResult | null>(null);
  const [applied, setApplied] = useState(false);

  function analyze() {
    if (!text.trim()) return;
    setResult(parseWhatsAppBookingSummary(text));
    setApplied(false);
  }

  function apply() {
    if (!result) return;
    onApply(result);
    setApplied(true);
  }

  if (!open) {
    return (
      <button type="button" className="sj-btn sj-btn-ghost" style={{ marginBottom: 12 }} onClick={() => setOpen(true)}>
        <ClipboardPaste className="mr-1 inline h-4 w-4" /> Coller depuis WhatsApp
      </button>
    );
  }

  return (
    <div className="sj-card" style={{ marginBottom: 16, background: "var(--color-surface-secondary)" }}>
      <div className="sj-between">
        <b>Coller le récapitulatif WhatsApp</b>
        <button type="button" className="sj-btn sj-btn-ghost" onClick={() => setOpen(false)}>
          Fermer
        </button>
      </div>
      <p className="sj-muted" style={{ marginTop: 4 }}>
        Collez ci-dessous le texte reçu (téléphone, date, heure, nombre de passagers…). Version bêta — le
        départ/destination détectés restent à sélectionner vous-même dans les champs ci-dessous pour garantir un
        calcul de distance exact.
      </p>
      <textarea
        rows={5}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Ex. Client : Awa Ndiaye — Tel : 77 123 45 67 — Départ : Aéroport AIBD — Destination : Almadies — Date : 25/08/2026 à 14h30 — 2 personnes"
        style={{ width: "100%" }}
      />
      <div className="sj-toolbar" style={{ marginTop: 8, justifyContent: "flex-start" }}>
        <button type="button" className="sj-btn sj-btn-primary" onClick={analyze} disabled={!text.trim()}>
          Analyser le texte
        </button>
      </div>

      {result ? (
        hasAnyParsedField(result) ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px dashed var(--sj-line)" }}>
            <p className="sj-muted" style={{ marginBottom: 6 }}>Éléments détectés :</p>
            <div className="sj-list">
              {FIELD_LABELS.filter(([key]) => result[key] != null).map(([key, label]) => (
                <div key={key} className="sj-row">
                  <span>{label}</span>
                  <b>{String(result[key])}</b>
                </div>
              ))}
            </div>
            <div className="sj-toolbar" style={{ marginTop: 10, justifyContent: "flex-start" }}>
              <button type="button" className="sj-btn sj-btn-primary" onClick={apply} disabled={applied}>
                {applied ? "Appliqué ✓" : "Appliquer au formulaire"}
              </button>
            </div>
          </div>
        ) : (
          <p className="sj-muted" style={{ marginTop: 10 }}>
            Aucun élément reconnu dans ce texte — remplissez le formulaire manuellement ci-dessous.
          </p>
        )
      ) : null}
    </div>
  );
}
