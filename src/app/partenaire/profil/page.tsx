"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { getPartnerByUserId, updatePartner, type Partner } from "@/lib/partners";
import { Mail, ArrowLeft } from "lucide-react";

export default function PartenaireProfilPage() {
  const { user } = useAuth();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [wavePayoutEnabled, setWavePayoutEnabled] = useState(false);
  const [waveAggregatedMerchantId, setWaveAggregatedMerchantId] = useState("");
  const [wavePayoutMobile, setWavePayoutMobile] = useState("");
  const [wavePayoutName, setWavePayoutName] = useState("");
  const [waveRedirectUrl, setWaveRedirectUrl] = useState("");

  useEffect(() => {
    if (!user?.id) return;
    getPartnerByUserId(user.id)
      .then((p) => {
        setPartner(p);
        if (p) {
          setCompanyName(p.company_name ?? "");
          setContactName(p.contact_name ?? "");
          setPhone(p.phone ?? "");
          setEmail(p.email ?? "");
          setWavePayoutEnabled(Boolean(p.wave_payout_enabled));
          setWaveAggregatedMerchantId(p.wave_aggregated_merchant_id ?? "");
          setWavePayoutMobile(p.wave_payout_mobile ?? "");
          setWavePayoutName(p.wave_payout_name ?? "");
          setWaveRedirectUrl(p.wave_redirect_url ?? "");
        }
      })
      .catch(() => setPartner(null))
      .finally(() => setLoading(false));
  }, [user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partner?.id) return;
    setMessage(null);
    setSaving(true);
    try {
      await updatePartner(partner.id, {
        company_name: companyName.trim() || partner.company_name,
        contact_name: contactName.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        wave_payout_enabled: wavePayoutEnabled,
        wave_aggregated_merchant_id: waveAggregatedMerchantId.trim() || null,
        wave_payout_mobile: wavePayoutMobile.trim() || null,
        wave_payout_name: wavePayoutName.trim() || null,
        wave_redirect_url: waveRedirectUrl.trim() || null,
      });
      setMessage({ type: "success", text: "Profil mis à jour." });
    } catch {
      setMessage({ type: "error", text: "Impossible de mettre à jour le profil." });
    } finally {
      setSaving(false);
    }
  };

  if (loading || !partner) {
    return (
      <>
        <Link href="/partenaire" className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Mon profil</h1>
        <div className="mt-6 animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-neutral-200" />
          <div className="h-24 rounded-xl bg-neutral-200" />
        </div>
      </>
    );
  }

  return (
    <>
      <Link
        href="/partenaire"
        className="inline-flex items-center gap-1 text-sm text-neutral-600 hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> Tableau de bord
      </Link>
      <h1 className="mt-2 text-xl font-bold text-neutral-900">Mon profil</h1>
      <p className="mt-1 text-neutral-600 text-sm">
        Modifiez les informations de votre structure partenaire.
      </p>
      <Card className="mt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {message && (
            <p
              className={`rounded-lg px-3 py-2 text-sm ${
                message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
              }`}
            >
              {message.text}
            </p>
          )}
          {user?.email && (
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-neutral-800">
                <Mail className="h-4 w-4" /> Compte connecté
              </label>
              <p className="rounded-xl border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
                {user.email}
              </p>
              <p className="mt-1 text-xs text-neutral-500">L’email du compte ne peut pas être modifié ici. L’email ci-dessous est celui de contact de votre structure.</p>
            </div>
          )}
          <Input
            label="Raison sociale"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Nom de l'entreprise"
          />
          <Input
            label="Nom du contact"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Personne à contacter"
          />
          <Input
            label="Téléphone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="77 123 45 67"
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contact@exemple.com"
          />
          <Card className="border border-neutral-200 bg-neutral-50">
            <h2 className="text-sm font-semibold text-neutral-900">Paiements Wave (commissions)</h2>
            <p className="mt-1 text-xs text-neutral-600">
              Renseignez les informations de versement pour recevoir automatiquement vos commissions.
            </p>
            <label className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <span className="text-sm text-neutral-800">Activer les versements Wave</span>
              <input
                type="checkbox"
                className="h-4 w-4 accent-primary"
                checked={wavePayoutEnabled}
                onChange={(e) => setWavePayoutEnabled(e.target.checked)}
              />
            </label>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Input
                label="Numéro Wave (E.164)"
                value={wavePayoutMobile}
                onChange={(e) => setWavePayoutMobile(e.target.value)}
                placeholder="+221771234567"
              />
              <Input
                label="Nom bénéficiaire"
                value={wavePayoutName}
                onChange={(e) => setWavePayoutName(e.target.value)}
                placeholder="Nom du bénéficiaire"
              />
              <Input
                label="Aggregated merchant id"
                value={waveAggregatedMerchantId}
                onChange={(e) => setWaveAggregatedMerchantId(e.target.value)}
                placeholder="am-xxxxxxxxxxxx"
              />
              <Input
                label="URL redirection Wave (optionnel)"
                value={waveRedirectUrl}
                onChange={(e) => setWaveRedirectUrl(e.target.value)}
                placeholder="https://pay.wave.com/..."
              />
            </div>
          </Card>
          <Button type="submit" isLoading={saving}>
            Enregistrer
          </Button>
        </form>
      </Card>
    </>
  );
}
