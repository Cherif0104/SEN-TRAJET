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
          <Button type="submit" isLoading={saving}>
            Enregistrer
          </Button>
        </form>
      </Card>
    </>
  );
}
