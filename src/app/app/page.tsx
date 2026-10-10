"use client";

import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarClock, CarFront, MapPin, Plane, Plus, Sparkles, UsersRound } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";

export default function ClientHomePage() {
  const { profile } = useAuth();

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="client-home">
          <div className="client-home-title">
            <div>
              <p className="eyebrow">Bonjour {profile?.full_name?.split(" ")[0] || ""}</p>
              <h1>Où allons-nous ?</h1>
            </div>
            <span><Sparkles size={15} /> Sénégal</span>
          </div>

          <Link href="/ride?service=ride" className="ride-launcher">
            <span className="ride-launcher-plus"><Plus size={25} /></span>
            <span>
              <small>Course immédiate</small>
              <strong>Commander une course</strong>
              <em><MapPin size={13} /> Départ détecté automatiquement</em>
            </span>
            <ArrowRight size={20} />
          </Link>

          <div className="transport-grid">
            <Link href="/ride?service=ride" className="service-card large">
              <div className="service-card-top">
                <span className="service-icon"><CarFront /></span>
                <span className="live-pill"><i /> En direct</span>
              </div>
              <div>
                <span className="service-kicker">Mobilité urbaine</span>
                <h2>Course</h2>
                <p>Un chauffeur proche, maintenant ou sur réservation.</p>
              </div>
            </Link>

            <Link href="/ride?service=intercity" className="service-card dark tall">
              <div className="service-card-top"><span className="service-icon"><CalendarClock /></span><ArrowUpRight /></div>
              <div>
                <span className="service-kicker">Toutes les régions</span>
                <h2>Allô Dakar</h2>
                <p>Réservez une place sur un départ publié.</p>
              </div>
            </Link>

            <Link href="/ride?service=airport" className="service-card airport">
              <div className="service-card-top"><span className="service-icon"><Plane /></span><ArrowUpRight /></div>
              <div>
                <span className="service-kicker">AIBD</span>
                <h2>Taxi Aéroport</h2>
                <p>Instantané ou réservé, avec suivi du chauffeur.</p>
              </div>
            </Link>

            <Link href="/ride?service=carpool" className="service-card light wide">
              <div className="service-card-top"><span className="service-icon"><UsersRound /></span><ArrowUpRight /></div>
              <div>
                <span className="service-kicker">Trajet partagé</span>
                <h2>Covoiturage</h2>
                <p>Partagez les places et le coût d’un déplacement compatible.</p>
              </div>
            </Link>
          </div>

          <div className="safety-strip">
            <span><CarFront /></span>
            <div><strong>Chauffeurs vérifiés</strong><small>Identité, permis et véhicule contrôlés.</small></div>
          </div>
        </section>
      </AppShell>
    </AuthGate>
  );
}
