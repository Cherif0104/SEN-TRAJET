"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  updateProfile,
  getDriverVehicles,
  addVehicle,
  updateVehicle,
  deleteVehicle,
  getDriverDocuments,
  deleteDocument,
  type VehicleInsert,
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
import { DocumentUpload } from "@/components/documents/DocumentUpload";
import { getDriverComplianceChecks, scheduleDriverComplianceLifecycle, type ComplianceCheck } from "@/lib/compliance";

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
  const [vBrand, setVBrand] = useState("");
  const [vModel, setVModel] = useState("");
  const [vYear, setVYear] = useState("");
  const [vPlate, setVPlate] = useState("");
  const [vSeats, setVSeats] = useState(4);
  const [vAC, setVAC] = useState(false);
  const [vCategory, setVCategory] = useState<VehicleInsert["category"]>("standard");
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [deletingVehicleId, setDeletingVehicleId] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
      setCity(profile.city || "");
    }
  }, [profile]);

  useEffect(() => {
    if (user) {
      getDriverVehicles(user.id).then(setVehicles);
      getDriverDocuments(user.id).then(setDocs);
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
    }
  }, [user]);

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
    setAddingVehicle(true);
    const v: VehicleInsert = {
      brand: vBrand,
      model: vModel,
      year: vYear ? Number(vYear) : undefined,
      plate_number: vPlate,
      category: vCategory,
      seats: vSeats,
      air_conditioning: vAC,
    };
    await addVehicle(user.id, v);
    const updated = await getDriverVehicles(user.id);
    setVehicles(updated);
    setShowAddVehicle(false);
    resetVehicleForm();
    setAddingVehicle(false);
  };

  const resetVehicleForm = () => {
    setVBrand("");
    setVModel("");
    setVYear("");
    setVPlate("");
    setVSeats(4);
    setVAC(false);
    setVCategory("standard");
    setEditingVehicleId(null);
  };

  const startEditVehicle = (v: Vehicle) => {
    setShowAddVehicle(false);
    setEditingVehicleId(v.id);
    setVBrand(v.brand);
    setVModel(v.model);
    setVYear(v.year ? String(v.year) : "");
    setVPlate(v.plate_number);
    setVSeats(v.seats);
    setVAC(v.air_conditioning);
    setVCategory((v.category || "standard") as VehicleInsert["category"]);
  };

  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVehicleId) return;
    setAddingVehicle(true);
    await updateVehicle(user.id, editingVehicleId, {
      brand: vBrand,
      model: vModel,
      year: vYear ? Number(vYear) : undefined,
      plate_number: vPlate,
      category: vCategory,
      seats: vSeats,
      air_conditioning: vAC,
    });
    const updated = await getDriverVehicles(user.id);
    setVehicles(updated);
    resetVehicleForm();
    setAddingVehicle(false);
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
            Indiquez la catégorie (Eco, Confort, Confort+ ou Utilitaire pour colis).
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setEditingVehicleId(null);
            setShowAddVehicle(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Ajouter
        </Button>
      </div>

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
              <div className="grid grid-cols-2 gap-3">
                <Input label="Marque" placeholder="Toyota" value={vBrand} onChange={(e) => setVBrand(e.target.value)} required />
                <Input label="Modèle" placeholder="Corolla" value={vModel} onChange={(e) => setVModel(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Année" type="number" placeholder="2022" value={vYear} onChange={(e) => setVYear(e.target.value)} />
                <Input label="Plaque" placeholder="DK-1234-AB" value={vPlate} onChange={(e) => setVPlate(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">Catégorie confort</label>
                  <select
                    value={vCategory}
                    onChange={(e) => setVCategory(e.target.value as VehicleInsert["category"])}
                    className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="standard">Eco</option>
                    <option value="confort">Confort</option>
                    <option value="premium">Confort+</option>
                    <option value="utilitaire">Utilitaire (colis / bagages)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-neutral-800">Places</label>
                  <select
                    value={vSeats}
                    onChange={(e) => setVSeats(Number(e.target.value))}
                    className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-neutral-700">
                <input type="checkbox" checked={vAC} onChange={(e) => setVAC(e.target.checked)} className="rounded border-neutral-300" />
                Climatisation
              </label>
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
                <span className="mt-1 inline-block rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                  {v.category === "standard" ? "Eco" : v.category === "premium" ? "Confort+" : v.category === "utilitaire" ? "Utilitaire (colis)" : "Confort"}
                </span>
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
                  variant="ghost"
                  onClick={() => handleDeleteVehicle(v.id)}
                  disabled={deletingVehicleId === v.id}
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" /> {deletingVehicleId === v.id ? "..." : "Supprimer"}
                </Button>
              </div>
            </div>
          </Card>
        )
      )}

      {showAddVehicle && (
        <Card className="mt-3">
          <form onSubmit={handleAddVehicle} className="space-y-3">
            <h3 className="font-medium text-neutral-900">Nouveau véhicule</h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Marque"
                placeholder="Toyota"
                value={vBrand}
                onChange={(e) => setVBrand(e.target.value)}
                required
              />
              <Input
                label="Modèle"
                placeholder="Corolla"
                value={vModel}
                onChange={(e) => setVModel(e.target.value)}
                required
              />
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">
                  Catégorie confort
                </label>
                <select
                  value={vCategory}
                  onChange={(e) =>
                    setVCategory(
                      e.target.value as VehicleInsert["category"]
                    )
                  }
                  className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="standard">Eco</option>
                  <option value="confort">Confort</option>
                  <option value="premium">Confort+</option>
                  <option value="utilitaire">Utilitaire (colis / bagages)</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-neutral-800">
                  Places
                </label>
                <select
                  value={vSeats}
                  onChange={(e) => setVSeats(Number(e.target.value))}
                  className="w-full min-h-[44px] rounded-xl border-2 border-neutral-300 bg-white px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={vAC}
                onChange={(e) => setVAC(e.target.checked)}
                className="rounded border-neutral-300"
              />
              Climatisation
            </label>
            <div className="flex gap-2">
              <Button type="submit" size="sm" isLoading={addingVehicle}>
                Enregistrer
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAddVehicle(false)}
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
        Téléversez vos documents pour la vérification (images ou PDF, max 5 Mo).
      </p>

      <div className="mt-3 space-y-3">
        {(["permis", "carte_grise", "assurance", "photo_identite"] as const).map(
          (docType) => {
            const existing = docs.find((d) => d.doc_type === docType);
            return (
              <div key={docType} className="flex flex-col gap-2">
                <DocumentUpload
                  driverId={user!.id}
                  docType={docType}
                  currentFileUrl={existing?.file_url}
                  onSuccess={() => getDriverDocuments(user!.id).then(setDocs)}
                  onRemove={async () => {
                    await deleteDocument(user!.id, docType);
                    setDocs(await getDriverDocuments(user!.id));
                  }}
                />
                {existing && (
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs text-neutral-500">
                      Statut
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
    </>
  );
}
