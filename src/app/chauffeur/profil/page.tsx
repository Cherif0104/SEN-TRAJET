"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import {
  updateProfile,
  getDriverVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getDriverDocuments,
  getDriverDocumentFiles,
  getDriverNotificationPreferences,
  upsertDriverNotificationPreferences,
  type VehicleInsert,
  type DriverDocumentFileRow,
} from "@/lib/profiles";
import {
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Car,
  FileText,
  Pencil,
  Trash2,
  Mail,
} from "lucide-react";
import { MultiDocumentUpload } from "@/components/documents/MultiDocumentUpload";
import { VehiclePhotoSlots } from "@/components/vehicles/VehiclePhotoSlots";
import { VEHICLE_TYPE_META, VEHICLE_TYPE_VALUES } from "@/lib/vehicleCategories";
import type { VehicleTypeFilter } from "@/lib/vehicleCategories";
import {
  SERVICE_CLASS_VALUES,
  SERVICE_CLASS_LABELS,
  SERVICE_CLASS_MIN_YEAR,
  seatOptionsForTransport,
  OTHER_BRAND_SENTINEL,
  OTHER_MODEL_SENTINEL,
  deriveLegacyVehicleCategory,
  serviceClassFromLegacyCategory,
  inferTransportFromSeats,
  isVehicleTypeFilterString,
  type ServiceClassLevel,
} from "@/lib/vehicleFormTaxonomy";
import { getDriverComplianceChecks, scheduleDriverComplianceLifecycle, type ComplianceCheck } from "@/lib/compliance";
import { createRentalListing, type TransportVehicleCategory } from "@/lib/rentals";

type Vehicle = {
  id: string;
  brand: string;
  model: string;
  year: number | null;
  plate_number: string;
  category: string;
  seats: number;
  is_verified: boolean;
  air_conditioning: boolean;
  transport_vehicle_category?: string | null;
  service_class?: string | null;
  vehicle_photo_urls?: Record<string, string[]> | null;
};

type DriverDoc = {
  id: string;
  doc_type: string;
  file_url: string;
  status: string;
  reviewed_at: string | null;
};

const DOC_LABELS: Record<string, string> = {
  permis: "Permis de conduire",
  carte_grise: "Carte grise",
  assurance: "Assurance",
  photo_identite: "Photo d'identité",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <CheckCircle className="h-3 w-3" /> Approuvé
      </span>
    );
  if (status === "rejected")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <XCircle className="h-3 w-3" /> Rejeté
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
      <Clock className="h-3 w-3" /> En attente
    </span>
  );
}

export default function ProfilChauffeurPage() {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [docs, setDocs] = useState<DriverDoc[]>([]);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [complianceChecks, setComplianceChecks] = useState<ComplianceCheck[]>([]);
  const [catalogBrands, setCatalogBrands] = useState<string[]>([]);
  const [catalogModels, setCatalogModels] = useState<string[]>([]);
  const [vBrandSelect, setVBrandSelect] = useState("");
  const [vBrandManual, setVBrandManual] = useState("");
  const [vModelSelect, setVModelSelect] = useState("");
  const [vModelManual, setVModelManual] = useState("");
  const [vTransport, setVTransport] = useState<VehicleTypeFilter>("citadine");
  const [vServiceClass, setVServiceClass] = useState<ServiceClassLevel>("eco");
  const [vUtilitaire, setVUtilitaire] = useState(false);
  const [vYear, setVYear] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vSeats, setVSeats] = useState(4);
  const [vAC, setVAC] = useState(false);
  const [docFileRows, setDocFileRows] = useState<DriverDocumentFileRow[]>([]);
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleFormError, setVehicleFormError] = useState<string | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);
  const [notifyNewRequests, setNotifyNewRequests] = useState(true);
  const [notifyMatchingTrips, setNotifyMatchingTrips] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [maxNotifsPerDay, setMaxNotifsPerDay] = useState(6);
  const [savingNotifPrefs, setSavingNotifPrefs] = useState(false);
  const [publishingRentalVehicleId, setPublishingRentalVehicleId] = useState<string | null>(null);
  const [rentalFeedback, setRentalFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;
    getDriverVehicles(user.id).then(setVehicles).catch(() => setVehicles([]));
    getDriverDocuments(user.id).then(setDocs).catch(() => setDocs([]));
    getDriverDocumentFiles(user.id)
      .then(setDocFileRows)
      .catch(() => setDocFileRows([]));
    getDriverNotificationPreferences(user.id)
      .then((prefs) => {
        if (!prefs) return;
        setNotifyNewRequests(prefs.notify_new_requests);
        setNotifyMatchingTrips(prefs.notify_matching_trips);
        setDigestEnabled(prefs.digest_enabled);
        setMaxNotifsPerDay(prefs.max_notifications_per_day);
      })
      .catch(() => {});
    getDriverComplianceChecks(user.id).then(async (checks) => {
      if (checks.length === 0) {
        try {
          await scheduleDriverComplianceLifecycle(user.id);
        } catch {
          // ignore if table/migration not available
        }
        setComplianceChecks(await getDriverComplianceChecks(user.id));
        return;
      }
      setComplianceChecks(checks);
    });
  }, [user]);

  useEffect(() => {
    fetch("/api/vehicle-catalog")
      .then((r) => r.json())
      .then((j: { brands?: string[] }) => setCatalogBrands(Array.isArray(j.brands) ? j.brands : []))
      .catch(() => setCatalogBrands([]));
  }, []);

  useEffect(() => {
    if (!vBrandSelect || vBrandSelect === OTHER_BRAND_SENTINEL) {
      setCatalogModels([]);
      return;
    }
    fetch(`/api/vehicle-catalog?brand=${encodeURIComponent(vBrandSelect)}`)
      .then((r) => r.json())
      .then((j: { models?: string[] }) => setCatalogModels(Array.isArray(j.models) ? j.models : []))
      .catch(() => setCatalogModels([]));
  }, [vBrandSelect]);

  if (authLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 rounded bg-neutral-200" />
        <div className="h-40 rounded-xl bg-neutral-200" />
      </div>
    );
  }

  if (!user) {
    router.push("/connexion");
    return null;
  }

  const refreshDocSide = async () => {
    setDocs(await getDriverDocuments(user.id));
    try {
      setDocFileRows(await getDriverDocumentFiles(user.id));
    } catch {
      setDocFileRows([]);
    }
  };

  const resolveBrandModel = () => {
    const brand =
      vBrandSelect === OTHER_BRAND_SENTINEL ? vBrandManual.trim() : vBrandSelect.trim();
    const model =
      vBrandSelect === OTHER_BRAND_SENTINEL
        ? vModelManual.trim()
        : vModelSelect === OTHER_MODEL_SENTINEL
          ? vModelManual.trim()
          : vModelSelect.trim();
    return { brand, model };
  };

  const renderVehicleFields = () => (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-800">Marque</label>
          <select
            value={vBrandSelect}
            onChange={(e) => {
              setVBrandSelect(e.target.value);
              setVModelSelect("");
              setVModelManual("");
            }}
            className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Choisir…</option>
            {catalogBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            <option value={OTHER_BRAND_SENTINEL}>Autre (saisie manuelle)</option>
          </select>
        </div>
        {vBrandSelect === OTHER_BRAND_SENTINEL ? (
          <Input
            label="Précisez la marque"
            value={vBrandManual}
            onChange={(e) => setVBrandManual(e.target.value)}
            required
          />
        ) : (
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Modèle</label>
            <select
              value={vModelSelect}
              onChange={(e) => setVModelSelect(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="">Choisir…</option>
              {catalogModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value={OTHER_MODEL_SENTINEL}>Autre modèle…</option>
            </select>
          </div>
        )}
      </div>
      {vBrandSelect === OTHER_BRAND_SENTINEL && (
        <Input
          label="Modèle du véhicule"
          value={vModelManual}
          onChange={(e) => setVModelManual(e.target.value)}
          required
        />
      )}
      {vBrandSelect !== "" &&
        vBrandSelect !== OTHER_BRAND_SENTINEL &&
        vModelSelect === OTHER_MODEL_SENTINEL && (
          <Input
            label="Précisez le modèle"
            value={vModelManual}
            onChange={(e) => setVModelManual(e.target.value)}
            required
          />
        )}
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Année"
          type="number"
          placeholder="2022"
          value={vYear}
          onChange={(e) => setVYear(e.target.value)}
        />
        <Input
          label="Plaque"
          placeholder="DK-1234-AB"
          value={vPlate}
          onChange={(e) => setVPlate(e.target.value)}
          required
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={vUtilitaire}
          onChange={(e) => {
            const on = e.target.checked;
            setVUtilitaire(on);
            if (on) setVServiceClass("eco");
          }}
          className="rounded border-neutral-300"
        />
        Véhicule utilitaire (colis / charges)
      </label>
      {!vUtilitaire && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Type de véhicule</label>
              <select
                value={vTransport}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!isVehicleTypeFilterString(val)) return;
                  setVTransport(val);
                  const opts = seatOptionsForTransport(val);
                  if (!opts.includes(vSeats)) setVSeats(opts[0] ?? 4);
                }}
                className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {VEHICLE_TYPE_VALUES.map((k) => (
                  <option key={k} value={k}>
                    {VEHICLE_TYPE_META[k].label}
                  </option>
                ))}
              </select>
              <p className="mt-0.5 text-xs text-neutral-500">{VEHICLE_TYPE_META[vTransport].description}</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-800">Classe de service</label>
              <select
                value={vServiceClass}
                onChange={(e) => setVServiceClass(e.target.value as ServiceClassLevel)}
                className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {SERVICE_CLASS_VALUES.map((sc) => (
                  <option key={sc} value={sc}>
                    {SERVICE_CLASS_LABELS[sc]} (≥ {SERVICE_CLASS_MIN_YEAR[sc]})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">Nombre de places</label>
            <select
              value={vSeats}
              onChange={(e) => setVSeats(Number(e.target.value))}
              className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {seatOptionsForTransport(vTransport).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
      {vUtilitaire && (
        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-800">Nombre de places</label>
          <select
            value={vSeats}
            onChange={(e) => setVSeats(Number(e.target.value))}
            className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {seatOptionsForTransport("suv_berline").map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
      )}
      <label className="flex items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={vAC}
          onChange={(e) => setVAC(e.target.checked)}
          className="rounded border-neutral-300"
        />
        Climatisation fonctionnelle
      </label>
    </>
  );

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    await updateProfile(user.id, { full_name: fullName, phone, city });
    refreshProfile?.();
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    const { brand, model } = resolveBrandModel();
    if (!brand || !model) return;
    setAddingVehicle(true);
    setVehicleFormError(null);
    try {
      const transport = vUtilitaire ? "suv_berline" : vTransport;
      const legacy = deriveLegacyVehicleCategory(vUtilitaire, vServiceClass);
      const payload: VehicleInsert = {
        brand,
        model,
        year: vYear ? Number(vYear) : undefined,
        plate_number: vPlate,
        category: legacy,
        seats: vSeats,
        air_conditioning: vAC,
        transport_vehicle_category: transport,
        service_class: vUtilitaire ? "eco" : vServiceClass,
      };
      await addVehicle(user.id, payload);
      const updated = await getDriverVehicles(user.id);
      setVehicles(updated);
      setShowAddVehicle(false);
      resetVehicleForm();
    } catch (err) {
      setVehicleFormError(
        err instanceof Error ? err.message : "Impossible d'enregistrer le véhicule."
      );
    } finally {
      setAddingVehicle(false);
    }
  };

  const resetVehicleForm = () => {
    setVehicleFormError(null);
    setVBrandSelect("");
    setVBrandManual("");
    setVModelSelect("");
    setVModelManual("");
    setVTransport("citadine");
    setVServiceClass("eco");
    setVUtilitaire(false);
    setVYear("");
    setVPlate("");
    setVSeats(4);
    setVAC(false);
    setEditingVehicleId(null);
  };

  const startEditVehicle = async (v: Vehicle) => {
    setVehicleFormError(null);
    setShowAddVehicle(false);
    setEditingVehicleId(v.id);
    const b = v.brand?.trim() || "";
    const m = v.model?.trim() || "";
    if (catalogBrands.includes(b)) {
      setVBrandSelect(b);
      setVBrandManual("");
      try {
        const res = await fetch(
          `/api/vehicle-catalog?brand=${encodeURIComponent(b)}`
        ).then((r) => r.json());
        const models: string[] = Array.isArray(res.models) ? res.models : [];
        if (models.includes(m)) {
          setVModelSelect(m);
          setVModelManual("");
        } else {
          setVModelSelect(OTHER_MODEL_SENTINEL);
          setVModelManual(m);
        }
      } catch {
        setVModelSelect(OTHER_MODEL_SENTINEL);
        setVModelManual(m);
      }
    } else {
      setVBrandSelect(OTHER_BRAND_SENTINEL);
      setVBrandManual(b);
      setVModelSelect("");
      setVModelManual(m);
    }
    setVYear(v.year ? String(v.year) : "");
    setVPlate(v.plate_number);
    setVSeats(v.seats);
    setVAC(v.air_conditioning);
    const ut = v.category === "utilitaire";
    setVUtilitaire(ut);
    if (!ut) {
      const t =
        v.transport_vehicle_category && isVehicleTypeFilterString(v.transport_vehicle_category)
          ? v.transport_vehicle_category
          : inferTransportFromSeats(v.seats);
      setVTransport(t);
      setVServiceClass(
        v.service_class && (SERVICE_CLASS_VALUES as readonly string[]).includes(v.service_class)
          ? (v.service_class as ServiceClassLevel)
          : serviceClassFromLegacyCategory(v.category)
      );
    } else {
      setVTransport("suv_berline");
      setVServiceClass("eco");
    }
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicleId) return;
    const { brand, model } = resolveBrandModel();
    if (!brand || !model) return;
    setAddingVehicle(true);
    setVehicleFormError(null);
    try {
      const transport = vUtilitaire ? "suv_berline" : vTransport;
      const legacy = deriveLegacyVehicleCategory(vUtilitaire, vServiceClass);
      await updateVehicle(user.id, editingVehicleId, {
        brand,
        model,
        year: vYear ? Number(vYear) : undefined,
        plate_number: vPlate,
        category: legacy,
        seats: vSeats,
        air_conditioning: vAC,
        transport_vehicle_category: transport,
        service_class: vUtilitaire ? "eco" : vServiceClass,
      });
      const updated = await getDriverVehicles(user.id);
      setVehicles(updated);
      resetVehicleForm();
    } catch (err) {
      setVehicleFormError(
        err instanceof Error ? err.message : "Impossible de mettre à jour le véhicule."
      );
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    if (!confirm("Supprimer ce véhicule ? Cette action est irréversible.")) return;
    setDeletingVehicleId(vehicleId);
    try {
      await deleteVehicle(user.id, vehicleId);
      setVehicles(await getDriverVehicles(user.id));
    } finally {
      setDeletingVehicleId(null);
    }
  };

  const handleSaveNotificationPreferences = async () => {
    if (!user) return;
    setSavingNotifPrefs(true);
    try {
      await upsertDriverNotificationPreferences({
        driver_id: user.id,
        notify_new_requests: notifyNewRequests,
        notify_matching_trips: notifyMatchingTrips,
        digest_enabled: digestEnabled,
        max_notifications_per_day: maxNotifsPerDay,
      });
    } finally {
      setSavingNotifPrefs(false);
    }
  };

  const canPublishVehicleToRental = (vehicle: Vehicle) => {
    const sc = vehicle.service_class;
    if (sc && ["confort", "confort_plus", "premium", "premium_plus"].includes(sc)) return true;
    return vehicle.category === "confort" || vehicle.category === "premium";
  };

  const publishVehicleToRental = async (vehicle: Vehicle) => {
    if (!user) return;
    setRentalFeedback(null);
    if (!profile?.city?.trim()) {
      setRentalFeedback({
        tone: "error",
        message: "Renseignez d'abord votre ville dans votre profil chauffeur.",
      });
      return;
    }
    if (!canPublishVehicleToRental(vehicle)) {
      setRentalFeedback({
        tone: "error",
        message:
          "Seuls les véhicules en classe Confort, Confort+, Premium ou Premium+ peuvent être publiés en location.",
      });
      return;
    }

    setPublishingRentalVehicleId(vehicle.id);
    try {
      const { data: existing } = await supabase
        .from("rental_listings")
        .select("id")
        .eq("owner_profile_id", user.id)
        .eq("plate_number", vehicle.plate_number)
        .maybeSingle();

      if (existing?.id) {
        setRentalFeedback({
          tone: "success",
          message: "Ce véhicule est déjà présent dans votre catalogue location.",
        });
        return;
      }

      const transportCategory: TransportVehicleCategory | undefined =
        vehicle.transport_vehicle_category &&
        isVehicleTypeFilterString(vehicle.transport_vehicle_category)
          ? (vehicle.transport_vehicle_category as TransportVehicleCategory)
          : undefined;
      const serviceClassPublish: ServiceClassLevel =
        vehicle.service_class &&
        (SERVICE_CLASS_VALUES as readonly string[]).includes(vehicle.service_class)
          ? (vehicle.service_class as ServiceClassLevel)
          : "confort";

      await createRentalListing({
        ownerProfileId: user.id,
        operatingMode: "marketplace_partner",
        title: `${vehicle.brand} ${vehicle.model}`.trim(),
        brand: vehicle.brand,
        model: vehicle.model,
        plateNumber: vehicle.plate_number,
        city: profile.city.trim(),
        dailyRateFcfa: 30000,
        transportVehicleCategory: transportCategory,
        serviceClass: serviceClassPublish,
        rentalMode: "with_driver",
        year: vehicle.year,
        seats: vehicle.seats,
        hasAirConditioning: vehicle.air_conditioning,
        acOperational: vehicle.air_conditioning,
      });

      setRentalFeedback({
        tone: "success",
        message:
          "Véhicule ajouté à la location (statut en revue). Vous pouvez ajuster le tarif dans l'espace partenaire/location.",
      });
    } catch (err) {
      setRentalFeedback({
        tone: "error",
        message: err instanceof Error ? err.message : "Impossible de publier ce véhicule en location.",
      });
    } finally {
      setPublishingRentalVehicleId(null);
    }
  };

  return (
    <>
      <h1 className="text-xl font-bold text-neutral-900">Mon profil</h1>
      <p className="mt-1 text-neutral-600">
        Gérez vos informations et vos documents.
      </p>

      <Card className="mt-6">
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {user?.email && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-800">
                <Mail className="h-4 w-4" /> Email
              </label>
              <p className="rounded-xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                {user.email}
              </p>
              <p className="mt-1 text-xs text-neutral-500">L’email ne peut pas être modifié ici.</p>
            </div>
          )}
          <Input
            label="Nom complet"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            label="Téléphone"
            type="tel"
            placeholder="+221 77 123 45 67"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <Input
            label="Ville"
            placeholder="Dakar"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />
          <Button type="submit" isLoading={saving}>
            {saved ? "Enregistré !" : "Enregistrer"}
          </Button>
        </form>
      </Card>

      {/* Vehicles */}
      <div className="mt-8 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
            <Car className="h-5 w-5" /> Mes véhicules
          </h2>
          <p className="mt-0.5 text-sm text-neutral-500">
            Marque et modèle depuis le catalogue, type de véhicule, classe de service et photos pour validation.
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditingVehicleId(null);
            resetVehicleForm();
            setShowAddVehicle(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>
      {rentalFeedback && (
        <p
          className={`mt-2 rounded-lg px-3 py-2 text-sm ${
            rentalFeedback.tone === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {rentalFeedback.message}
        </p>
      )}

      {vehicles.length === 0 && !showAddVehicle && (
        <Card className="mt-3">
          <p className="text-sm text-neutral-500">
            Aucun véhicule enregistré. Ajoutez votre véhicule pour recevoir des
            demandes.
          </p>
        </Card>
      )}

      {vehicles.map((v) =>
        editingVehicleId === v.id ? (
          <Card key={v.id} className="mt-3">
            <form onSubmit={handleUpdateVehicle} className="space-y-3">
              <h3 className="font-medium text-neutral-900">Modifier le véhicule</h3>
              {vehicleFormError && (
                <p className="text-sm text-red-600" role="alert">
                  {vehicleFormError}
                </p>
              )}
              {renderVehicleFields()}
              <VehiclePhotoSlots
                driverId={user!.id}
                vehicleId={v.id}
                photos={(v.vehicle_photo_urls as Record<string, string[]>) || {}}
                onUpdated={() => getDriverVehicles(user!.id).then(setVehicles)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" isLoading={addingVehicle}>Enregistrer</Button>
                <Button type="button" variant="ghost" size="sm" onClick={resetVehicleForm}>Annuler</Button>
              </div>
            </form>
          </Card>
        ) : (
          <Card key={v.id} className="mt-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium text-neutral-900">
                  {v.brand} {v.model} {v.year ? `(${v.year})` : ""}
                </p>
                <p className="text-sm text-neutral-500">
                  {v.plate_number} · {v.seats} places · {v.air_conditioning ? "Climatisé" : "Non climatisé"}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                    {v.category === "standard"
                      ? "Eco"
                      : v.category === "premium"
                        ? "Confort+"
                        : v.category === "utilitaire"
                          ? "Utilitaire (colis)"
                          : "Confort"}
                  </span>
                  {v.transport_vehicle_category &&
                    isVehicleTypeFilterString(v.transport_vehicle_category) && (
                    <span className="inline-block rounded-full bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-800">
                      {VEHICLE_TYPE_META[v.transport_vehicle_category].label}
                    </span>
                  )}
                  {v.service_class && (
                    <span className="inline-block rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-800">
                      {SERVICE_CLASS_LABELS[v.service_class as ServiceClassLevel] ?? v.service_class}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {v.is_verified ? (
                  <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" /> Vérifié
                  </span>
                ) : (
                  <span className="text-xs font-medium text-amber-600 flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> En vérification
                  </span>
                )}
                <Button size="sm" variant="ghost" onClick={() => startEditVehicle(v)}>
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Modifier
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => publishVehicleToRental(v)}
                  disabled={publishingRentalVehicleId === v.id || !canPublishVehicleToRental(v)}
                  title={
                    canPublishVehicleToRental(v)
                      ? "Publier ce véhicule en location"
                      : "Nécessite au moins la classe Confort"
                  }
                >
                  {publishingRentalVehicleId === v.id ? "..." : "Mettre en location"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteVehicle(v.id)}
                  disabled={deletingVehicleId === v.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {deletingVehicleId === v.id ? "..." : "Supprimer"}
                </Button>
              </div>
            </div>
            <VehiclePhotoSlots
              driverId={user!.id}
              vehicleId={v.id}
              photos={(v.vehicle_photo_urls as Record<string, string[]>) || {}}
              onUpdated={() => getDriverVehicles(user!.id).then(setVehicles)}
            />
          </Card>
        )
      )}

      {showAddVehicle && (
        <Card className="mt-3">
          <form onSubmit={handleAddVehicle} className="space-y-3">
            <h3 className="font-medium text-neutral-900">Nouveau véhicule</h3>
            {vehicleFormError && (
              <p className="text-sm text-red-600" role="alert">
                {vehicleFormError}
              </p>
            )}
            {renderVehicleFields()}
            <p className="text-xs text-neutral-500">
              Après enregistrement, ajoutez les photos du véhicule depuis la carte du véhicule.
            </p>
            <div className="flex gap-2">
              <Button type="submit" size="sm" isLoading={addingVehicle}>
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAddVehicle(false);
                  resetVehicleForm();
                }}
              >
                Annuler
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Documents */}
      <h2 className="mt-8 text-lg font-semibold text-neutral-900 flex items-center gap-2">
        <FileText className="h-5 w-5" /> Documents
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Plusieurs fichiers par document : photo ou fichier, aperçu sur cette page, retirer une pièce si la qualité est insuffisante (images ou PDF, max 5 Mo chacun).
      </p>

      <div className="mt-3 space-y-3">
        {(["permis", "carte_grise", "assurance", "photo_identite"] as const).map(
          (docType) => {
            const existing = docs.find((d) => d.doc_type === docType);
            const filesFor = docFileRows.filter((f) => f.doc_type === docType);
            return (
              <div key={docType} className="flex flex-col gap-2">
                <MultiDocumentUpload
                  driverId={user!.id}
                  docType={docType}
                  files={filesFor.map((f) => ({ id: f.id, file_url: f.file_url }))}
                  onChanged={refreshDocSide}
                />
                {existing && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-neutral-500">
                      Statut dossier
                    </span>
                    <StatusBadge status={existing.status} />
                  </div>
                )}
              </div>
            );
          }
        )}
      </div>

      <Card className="mt-6">
        <h3 className="text-base font-semibold text-neutral-900">Suivi de conformite</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Un rappel est prevu pendant la premiere semaine puis toutes les deux semaines.
        </p>
        {complianceChecks.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-500">
            Aucun controle planifie pour le moment.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {complianceChecks.slice(0, 5).map((check) => (
              <div key={check.id} className="flex items-center justify-between rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <span className="font-medium text-neutral-700">{check.check_type}</span>
                <span className="text-neutral-500">
                  {new Date(check.due_at).toLocaleDateString("fr-FR")}
                </span>
                <StatusBadge status={check.status} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="mt-6">
        <h3 className="text-base font-semibold text-neutral-900">Préférences de notifications</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Réglez les alertes ciblées et limitez le volume journalier.
        </p>
        <div className="mt-4 space-y-3">
          <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
            Recevoir les nouvelles demandes proches
            <input
              type="checkbox"
              checked={notifyNewRequests}
              onChange={(e) => setNotifyNewRequests(e.target.checked)}
              className="rounded border-neutral-300"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
            Recevoir les alertes de trajets compatibles
            <input
              type="checkbox"
              checked={notifyMatchingTrips}
              onChange={(e) => setNotifyMatchingTrips(e.target.checked)}
              className="rounded border-neutral-300"
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700">
            Digest quotidien (au lieu d&apos;alertes unitaires)
            <input
              type="checkbox"
              checked={digestEnabled}
              onChange={(e) => setDigestEnabled(e.target.checked)}
              className="rounded border-neutral-300"
            />
          </label>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-800">
              Maximum de notifications par jour
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={maxNotifsPerDay}
              onChange={(e) => setMaxNotifsPerDay(Number(e.target.value || 1))}
              className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <Button
          size="sm"
          className="mt-4"
          isLoading={savingNotifPrefs}
          onClick={handleSaveNotificationPreferences}
        >
          Enregistrer les préférences
        </Button>
      </Card>
    </>
  );
}
