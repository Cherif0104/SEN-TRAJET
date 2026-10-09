"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Bike, CarFront, MapPin, Plane, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const slides = [
  {
    title: "Votre chauffeur, en temps réel.",
    text: "Indiquez votre destination. SentraJet recherche le chauffeur disponible le plus proche.",
    icon: CarFront
  },
  {
    title: "De Dakar à l’AIBD.",
    text: "Course urbaine ou taxi aéroport, immédiatement ou à l’heure que vous choisissez.",
    icon: Plane
  },
  {
    title: "Vos colis aussi.",
    text: "Moto, voiture ou utilitaire : choisissez le véhicule adapté à chaque livraison.",
    icon: Bike
  }
];

export function Onboarding() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  const [splash, setSplash] = useState(true);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (loading || !user || !profile) return;
    router.replace(profile.role === "driver" ? "/driver" : "/app");
  }, [loading, profile, router, user]);

  if (splash || loading || user) {
    return (
      <main className="mobile-screen" style={{ background: "var(--ink)", color: "white", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 96, height: 96, margin: "0 auto", borderRadius: 30, background: "var(--gold)", color: "var(--ink)", display: "grid", placeItems: "center" }}>
            <CarFront size={46} />
          </div>
          <h1 className="brand" style={{ margin: "24px 0 0", fontSize: 27 }}>SENTRAJET</h1>
          <p style={{ color: "var(--gold)", fontSize: 10, letterSpacing: ".27em", fontWeight: 850 }}>MOVE SENEGAL</p>
        </div>
      </main>
    );
  }

  const slide = slides[index];
  const Icon = slide.icon;
  const last = index === slides.length - 1;

  return (
    <main className="mobile-screen safe-top safe-bottom" style={{ background: "var(--ink)", color: "white", paddingInline: 20, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div className="brand">SENTRAJET</div>
          <small style={{ color: "var(--gold)", letterSpacing: ".16em", fontWeight: 800 }}>MOVE SENEGAL</small>
        </div>
        <ShieldCheck color="var(--gold)" size={22} />
      </header>

      <section style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", paddingBlock: 28 }}>
        <div style={{ minHeight: 330, borderRadius: 38, background: "linear-gradient(145deg,#142b48,#091522)", border: "1px solid rgba(255,255,255,.1)", display: "grid", placeItems: "center", position: "relative", overflow: "hidden" }}>
          <div style={{ width: 130, height: 130, borderRadius: 40, background: "rgba(244,199,93,.12)", border: "1px solid rgba(244,199,93,.25)", display: "grid", placeItems: "center", color: "var(--gold)" }}>
            <Icon size={64} />
          </div>
          <div style={{ position: "absolute", left: 18, right: 18, bottom: 17, borderRadius: 17, background: "rgba(7,17,31,.82)", padding: "13px 15px", display: "flex", alignItems: "center", gap: 9, fontSize: 12, color: "#cbd5df" }}>
            <MapPin size={16} color="var(--gold)" />
            Dakar et toutes les régions du Sénégal
          </div>
        </div>
        <h2 style={{ fontSize: 32, lineHeight: 1.08, letterSpacing: "-.04em", margin: "28px 0 0" }}>{slide.title}</h2>
        <p style={{ color: "#aeb9c8", lineHeight: 1.6, margin: "13px 0 0" }}>{slide.text}</p>
        <div style={{ display: "flex", gap: 7, marginTop: 22 }}>
          {slides.map((item, slideIndex) => (
            <button key={item.title} type="button" aria-label={`Écran ${slideIndex + 1}`} onClick={() => setIndex(slideIndex)} style={{ width: slideIndex === index ? 28 : 7, height: 7, border: 0, borderRadius: 10, background: slideIndex === index ? "var(--gold)" : "rgba(255,255,255,.18)", padding: 0 }} />
          ))}
        </div>
      </section>

      {last ? (
        <div style={{ display: "grid", gap: 10 }}>
          <Link className="primary-button gold" href="/signup">Créer un compte</Link>
          <Link className="secondary-button" href="/login" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(255,255,255,.18)", color: "white" }}>Se connecter</Link>
        </div>
      ) : (
        <button className="primary-button gold" type="button" onClick={() => setIndex((value) => value + 1)}>
          Continuer <ArrowRight size={19} />
        </button>
      )}
    </main>
  );
}
