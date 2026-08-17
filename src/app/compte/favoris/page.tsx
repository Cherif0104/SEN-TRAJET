"use client";

import { useEffect, useState } from "react";
import { Heart, MapPin, Trash2 } from "lucide-react";
import { SjCard, SjSectionHead } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import { useClientBookings } from "@/hooks/useClientBookings";
import {
  createFavoriteAddress,
  deleteFavoriteAddress,
  listFavoriteAddresses,
  type FavoriteAddress,
} from "@/lib/favorites";
import { AddressAutocomplete, type SelectedPlace } from "@/components/booking/AddressAutocomplete";
import { BrandedLoader } from "@/components/ui/BrandedLoader";

export default function CompteFavorisPage() {
  const { user } = useAuth();
  const { clientId, loading: clientLoading } = useClientBookings();
  const [favorites, setFavorites] = useState<FavoriteAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState("");
  const [place, setPlace] = useState<SelectedPlace | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) {
      if (!clientLoading) setLoading(false);
      return;
    }
    void listFavoriteAddresses(clientId)
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setLoading(false));
  }, [clientId, clientLoading]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return;
    if (!label.trim() || !place) {
      setError("Indiquez un nom (ex. « Maison ») et sélectionnez une adresse dans les suggestions.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createFavoriteAddress({
        clientId,
        label: label.trim(),
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      });
      setFavorites((prev) => [created, ...prev]);
      setLabel("");
      setPlace(null);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible d’ajouter cette adresse.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    try {
      await deleteFavoriteAddress(id);
    } catch {
      // best-effort ; on ne restaure pas l'affichage pour éviter une confusion de rechargement
    }
  }

  return (
    <>
      <SjSectionHead
        title="Mes favoris"
        action={
          <button type="button" className="sj-btn sj-btn-primary" onClick={() => setShowForm((v) => !v)}>
            + Ajouter une adresse
          </button>
        }
      />

      {showForm ? (
        <SjCard style={{ marginBottom: 16 }}>
          <form className="sj-form" onSubmit={submit}>
            <div className="sj-field">
              <label>Nom du favori</label>
              <input
                placeholder="Ex. Maison, Bureau, AIBD…"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <AddressAutocomplete
              label="Adresse"
              placeholder="Rechercher une adresse…"
              value={place}
              onSelect={setPlace}
              onClear={() => setPlace(null)}
              showMyLocation
            />
            {error ? <p style={{ color: "var(--color-error)" }}>{error}</p> : null}
            <button type="submit" className="sj-btn sj-btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer ce favori"}
            </button>
          </form>
        </SjCard>
      ) : null}

      {loading || clientLoading ? <BrandedLoader /> : null}
      {!loading && !clientLoading ? (
        <div className="sj-list">
          {favorites.map((f) => (
            <SjCard key={f.id}>
              <div className="sj-between">
                <div className="flex items-start gap-3">
                  <Heart className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                  <div>
                    <b>{f.label}</b>
                    <div className="sj-muted flex items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" /> {f.address}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Supprimer ce favori"
                  className="sj-btn sj-btn-ghost"
                  onClick={() => void remove(f.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </SjCard>
          ))}
          {!favorites.length && !user ? (
            <SjCard><p className="sj-muted">Connectez-vous pour gérer vos adresses favorites.</p></SjCard>
          ) : null}
          {!favorites.length && user ? (
            <SjCard>
              <p className="sj-muted">
                Aucune adresse favorite. Ajoutez « Maison », « Bureau » ou vos destinations habituelles
                pour réserver plus vite.
              </p>
            </SjCard>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
