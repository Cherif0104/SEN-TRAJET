"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  listAssignments,
  updateAssignmentStatus,
  type AssignmentStatus,
  type TripAssignment,
} from "@/lib/dispatch";

const NEXT_ACTIONS: Partial<Record<AssignmentStatus, { label: string; next: AssignmentStatus }>> = {
  assigned: { label: "Accepter", next: "accepted" },
  accepted: { label: "Démarrer", next: "in_progress" },
  in_progress: { label: "Terminer", next: "completed" },
};

export default function ChauffeurMissionsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<TripAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user?.id) return;
    setError(null);
    try {
      const data = await listAssignments({ driverId: user.id, limit: 50 });
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    reload();
  }, [reload]);

  const onAction = async (assignment: TripAssignment, next: AssignmentStatus) => {
    setBusyId(assignment.id);
    try {
      await updateAssignmentStatus(assignment.id, next);
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Mise à jour impossible");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mes missions</h1>
      <p className="mt-1 text-neutral-600">
        Courses assignées par SentraJet Premium à votre compte flotte.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-4 text-sm text-neutral-500">Chargement…</p>
      ) : rows.length === 0 ? (
        <Card className="mt-4">
          <p className="text-sm text-neutral-600">
            Aucune mission pour le moment. L’équipe SentraJet vous assignera les prochaines courses.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => {
            const action = NEXT_ACTIONS[row.status];
            return (
              <Card key={row.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-neutral-900">
                      {row.trip
                        ? `${row.trip.from_city} → ${row.trip.to_city}`
                        : `Mission ${row.id.slice(0, 8)}`}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      Statut : {row.status}
                      {row.trip?.departure_time
                        ? ` · ${new Date(row.trip.departure_time).toLocaleString("fr-FR")}`
                        : ""}
                      {row.notes ? ` · ${row.notes}` : ""}
                    </p>
                  </div>
                  {action && (
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => onAction(row, action.next)}
                    >
                      {busyId === row.id ? "…" : action.label}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
