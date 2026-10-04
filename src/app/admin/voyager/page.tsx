"use client";

import { useCallback, useEffect, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import {
  createVoyagerDeparture,
  createVoyagerLine,
  createVoyagerOperator,
  listVoyagerLinesAdmin,
  listVoyagerOperatorsAdmin,
  type VoyagerLineAdmin,
  type VoyagerOperatorAdmin,
} from "@/lib/voyagerAdmin";

function nextDeparture() {
  const date = new Date(Date.now() + 24 * 60 * 60_000);
  date.setHours(8, 0, 0, 0);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function AdminVoyagerPage() {
  const [operators, setOperators] = useState<VoyagerOperatorAdmin[]>([]);
  const [lines, setLines] = useState<VoyagerLineAdmin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [operator, setOperator] = useState({
    displayName: "",
    legalName: "",
    kind: "compagnie",
    phone: "",
  });
  const [line, setLine] = useState({
    operatorId: "",
    originCity: "",
    destinationCity: "",
    boardingPoint: "",
    arrivalPoint: "",
  });
  const [departure, setDeparture] = useState({
    lineId: "",
    departureAt: nextDeparture(),
    vehicleType: "minibus",
    vehicleLabel: "",
    seats: "10",
    priceFcfa: "7500",
  });

  const refresh = useCallback(async () => {
    const [nextOperators, nextLines] = await Promise.all([
      listVoyagerOperatorsAdmin(),
      listVoyagerLinesAdmin(),
    ]);
    setOperators(nextOperators);
    setLines(nextLines);
    setLine((current) => ({ ...current, operatorId: current.operatorId || nextOperators[0]?.id || "" }));
    setDeparture((current) => ({ ...current, lineId: current.lineId || nextLines[0]?.id || "" }));
  }, []);

  useEffect(() => {
    void refresh().catch((cause) =>
      setError(cause instanceof Error ? cause.message : "Chargement impossible."),
    );
  }, [refresh]);

  async function submit(action: () => Promise<void>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <SjSectionHead eyebrow="Marketplace régionale" title="Voyager" />
      <SjCard style={{ marginBottom: 16 }}>
        <p className="sj-muted" style={{ margin: 0 }}>
          Gérez les compagnies, leurs lignes et chaque départ publié. Les coordonnées internes
          des opérateurs ne sont jamais affichées aux voyageurs.
        </p>
      </SjCard>
      {error ? <p className="mb-4 rounded-xl bg-red-950/40 p-3 text-sm text-red-200">{error}</p> : null}

      <div className="grid gap-4 xl:grid-cols-3">
        <SjCard>
          <h2 className="mb-4 text-lg font-black">1. Opérateur</h2>
          <form
            className="sj-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(() => createVoyagerOperator(operator));
            }}
          >
            <div className="sj-field"><label>Nom commercial</label><input required value={operator.displayName} onChange={(event) => setOperator({ ...operator, displayName: event.target.value })} /></div>
            <div className="sj-field"><label>Raison sociale</label><input required value={operator.legalName} onChange={(event) => setOperator({ ...operator, legalName: event.target.value })} /></div>
            <div className="sj-field"><label>Type</label><select value={operator.kind} onChange={(event) => setOperator({ ...operator, kind: event.target.value })}><option value="compagnie">Compagnie</option><option value="agence">Agence</option><option value="transporteur">Transporteur</option><option value="horaires">Horaires</option></select></div>
            <div className="sj-field"><label>Téléphone interne</label><input required value={operator.phone} onChange={(event) => setOperator({ ...operator, phone: event.target.value })} /></div>
            <button disabled={saving} className="sj-btn sj-btn-primary">Ajouter l’opérateur</button>
          </form>
        </SjCard>

        <SjCard>
          <h2 className="mb-4 text-lg font-black">2. Ligne</h2>
          <form
            className="sj-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(() => createVoyagerLine(line));
            }}
          >
            <div className="sj-field"><label>Opérateur</label><select required value={line.operatorId} onChange={(event) => setLine({ ...line, operatorId: event.target.value })}><option value="">Choisir</option>{operators.map((item) => <option key={item.id} value={item.id}>{item.display_name}</option>)}</select></div>
            <div className="sj-field"><label>Ville de départ</label><input required value={line.originCity} onChange={(event) => setLine({ ...line, originCity: event.target.value })} /></div>
            <div className="sj-field"><label>Destination</label><input required value={line.destinationCity} onChange={(event) => setLine({ ...line, destinationCity: event.target.value })} /></div>
            <div className="sj-field"><label>Point d’embarquement</label><input required value={line.boardingPoint} onChange={(event) => setLine({ ...line, boardingPoint: event.target.value })} /></div>
            <div className="sj-field"><label>Point d’arrivée</label><input required value={line.arrivalPoint} onChange={(event) => setLine({ ...line, arrivalPoint: event.target.value })} /></div>
            <button disabled={saving || !operators.length} className="sj-btn sj-btn-primary">Ajouter la ligne</button>
          </form>
        </SjCard>

        <SjCard>
          <h2 className="mb-4 text-lg font-black">3. Départ</h2>
          <form
            className="sj-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(() => createVoyagerDeparture({
                ...departure,
                seats: Number(departure.seats),
                priceFcfa: Number(departure.priceFcfa),
              }));
            }}
          >
            <div className="sj-field"><label>Ligne</label><select required value={departure.lineId} onChange={(event) => setDeparture({ ...departure, lineId: event.target.value })}><option value="">Choisir</option>{lines.map((item) => <option key={item.id} value={item.id}>{item.origin_city} → {item.destination_city}</option>)}</select></div>
            <div className="sj-field"><label>Date et heure</label><input type="datetime-local" required value={departure.departureAt} onChange={(event) => setDeparture({ ...departure, departureAt: event.target.value })} /></div>
            <div className="sj-field"><label>Véhicule</label><select value={departure.vehicleType} onChange={(event) => setDeparture({ ...departure, vehicleType: event.target.value })}><option value="citadine">Petite voiture</option><option value="berline">Berline</option><option value="suv">SUV</option><option value="minivan">Minivan</option><option value="minibus">Minibus</option><option value="bus">Bus</option></select></div>
            <div className="sj-field"><label>Modèle / libellé</label><input value={departure.vehicleLabel} onChange={(event) => setDeparture({ ...departure, vehicleLabel: event.target.value })} /></div>
            <div className="sj-field"><label>Places</label><input type="number" min={1} max={60} required value={departure.seats} onChange={(event) => setDeparture({ ...departure, seats: event.target.value })} /></div>
            <div className="sj-field"><label>Prix par place (FCFA)</label><input type="number" min={500} required value={departure.priceFcfa} onChange={(event) => setDeparture({ ...departure, priceFcfa: event.target.value })} /></div>
            <button disabled={saving || !lines.length} className="sj-btn sj-btn-primary">Publier le départ</button>
          </form>
        </SjCard>
      </div>

      <SjCard style={{ marginTop: 16 }}>
        <h2 className="font-black">Réseau actif</h2>
        <div className="mt-3 grid gap-2">
          {lines.map((item) => (
            <div key={item.id} className="sj-between rounded-xl bg-black/10 p-3">
              <b>{item.origin_city} → {item.destination_city}</b>
              <span className="sj-muted">{item.operator?.display_name ?? "Opérateur"}</span>
            </div>
          ))}
        </div>
      </SjCard>
    </>
  );
}
