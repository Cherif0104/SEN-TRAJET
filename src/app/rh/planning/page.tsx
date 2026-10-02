"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { listDrivers, type PlatformDriver } from "@/lib/platformOps";
import { listDriverShifts, generateRoster, setDriverShiftStatus, type DriverShift, type DriverShiftStatus } from "@/lib/rosterOps";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

const DAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const dow = copy.getDay(); // 0 = dimanche
  const diff = dow === 0 ? -6 : 1 - dow;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export default function RhPlanningPage() {
  const [drivers, setDrivers] = useState<PlatformDriver[]>([]);
  const [shifts, setShifts] = useState<DriverShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const rangeStart = useMemo(() => {
    const base = startOfWeek(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const days = useMemo(() => {
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(rangeStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [rangeStart]);

  const load = useCallback(async () => {
    const start = toIsoDate(days[0]);
    const end = toIsoDate(days[days.length - 1]);
    const [d, s] = await Promise.all([listDrivers().catch(() => []), listDriverShifts(start, end).catch(() => [])]);
    setDrivers(d.filter((driver) => !["inactive", "suspendu", "suspended"].includes(String(driver.status).toLowerCase())));
    setShifts(s);
  }, [days]);

  useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const shiftMap = useMemo(() => {
    const map = new Map<string, DriverShiftStatus>();
    for (const s of shifts) map.set(`${s.driver_id}__${s.shift_date}`, s.status);
    return map;
  }, [shifts]);

  async function handleGenerate() {
    setBusy(true);
    setMessage(null);
    try {
      const count = await generateRoster(toIsoDate(days[0]), 4);
      setMessage(`Planning régénéré (${count} créneaux sur 4 semaines à partir du ${days[0].toLocaleDateString("fr-FR")}).`);
      await load();
    } catch {
      setMessage("Erreur lors de la génération du planning.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCell(driverId: string, date: Date) {
    const iso = toIsoDate(date);
    const current = shiftMap.get(`${driverId}__${iso}`) ?? "travail";
    const next: DriverShiftStatus = current === "travail" ? "repos" : "travail";
    // Optimistic update
    setShifts((prev) => {
      const filtered = prev.filter((s) => !(s.driver_id === driverId && s.shift_date === iso));
      return [...filtered, { id: `local-${driverId}-${iso}`, driver_id: driverId, shift_date: iso, status: next, note: null }];
    });
    try {
      await setDriverShiftStatus({ driverId, shiftDate: iso, status: next });
    } catch {
      setMessage("Impossible de modifier ce créneau.");
      await load();
    }
  }

  if (loading) return <BrandedLoader />;

  return (
    <>
      <SjSectionHead
        eyebrow="RH"
        title="Planning chauffeurs"
        action={
          <button className="sj-btn sj-btn-primary" onClick={() => void handleGenerate()} disabled={busy}>
            {busy ? "Génération…" : "Régénérer 4 semaines"}
          </button>
        }
      />
      <p className="sj-muted" style={{ marginTop: -8, marginBottom: 12 }}>
        2 jours de repos par semaine par chauffeur, répartis dans l&apos;équipe pour garder une bonne couverture le week-end.
        Cliquez sur une case pour basculer travail/repos manuellement.
      </p>

      <div className="sj-tabs" style={{ marginBottom: 12 }}>
        <button className="sj-btn sj-btn-ghost" onClick={() => setWeekOffset((w) => w - 1)}>← Semaine précédente</button>
        <button className="sj-btn sj-btn-ghost" onClick={() => setWeekOffset(0)}>Aujourd&apos;hui</button>
        <button className="sj-btn sj-btn-ghost" onClick={() => setWeekOffset((w) => w + 1)}>Semaine suivante →</button>
      </div>

      {message ? (
        <SjCard>
          <p className="sj-muted">{message}</p>
        </SjCard>
      ) : null}

      {!drivers.length ? (
        <SjCard>
          <p className="sj-muted">Aucun chauffeur actif.</p>
        </SjCard>
      ) : (
        <div className="sj-table-wrap">
          <table className="sj-table">
            <thead>
              <tr>
                <th>Chauffeur</th>
                {days.map((d) => (
                  <th key={toIsoDate(d)}>
                    {DAY_LABELS[(d.getDay() + 6) % 7]}
                    <br />
                    {d.getDate()}/{d.getMonth() + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id}>
                  <td>
                    <b>{driver.full_name}</b>
                    <br />
                    <span className="sj-muted" style={{ fontSize: 11 }}>{driver.status}</span>
                  </td>
                  {days.map((d) => {
                    const iso = toIsoDate(d);
                    const status = shiftMap.get(`${driver.id}__${iso}`) ?? "travail";
                    const isRest = status === "repos";
                    return (
                      <td key={iso} style={{ textAlign: "center", cursor: "pointer" }} onClick={() => void toggleCell(driver.id, d)}>
                        <span className={`sj-badge ${isRest ? "warning" : "success"}`}>{isRest ? "Repos" : "Travail"}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
