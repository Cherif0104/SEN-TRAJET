"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";

const slides = [
  {
    eyebrow: "Mobilité en direct",
    title: "Votre chauffeur, en temps réel.",
    text: "Indiquez votre destination. SentraJet recherche et vous affecte le meilleur chauffeur disponible.",
    image: "/media/onboarding-course.webp",
    alt: "Berline SentraJet pour les courses urbaines et interurbaines"
  },
  {
    eyebrow: "Transfert aéroport",
    title: "L’AIBD, sans aucun stress.",
    text: "Accueil personnalisé, suivi du vol et chauffeur ponctuel, immédiatement ou sur réservation.",
    image: "/media/onboarding-aeroport.webp",
    alt: "Chauffeur SentraJet accueillant un voyageur à l’aéroport"
  },
  {
    eyebrow: "Dakar et régions",
    title: "Voyagez autrement, partout au Sénégal.",
    text: "Allô Dakar et covoiturage réunissent les départs planifiés, les places disponibles et le porte-à-porte.",
    image: "/media/onboarding-course.webp",
    alt: "Véhicule SentraJet pour un trajet entre les régions du Sénégal"
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
    router.replace(profile.role === "admin" ? "/admin" : profile.role === "driver" ? "/driver" : "/app");
  }, [loading, profile, router, user]);

  if (splash || loading || user) {
    return (
      <main className="mobile-screen premium-splash">
        <div className="splash-glow" />
        <div className="splash-brand">
          <BrandLogo inverse />
          <p>EXECUTIVE CHAUFFEUR &amp; MOBILITY SERVICES</p>
        </div>
      </main>
    );
  }

  const slide = slides[index];
  const last = index === slides.length - 1;

  return (
    <main className="mobile-screen safe-top safe-bottom onboarding">
      <header className="onboarding-header">
        <BrandLogo compact inverse />
        <span className="secure-badge"><ShieldCheck size={15} /> Service vérifié</span>
      </header>

      <section className="onboarding-content">
        <div className="onboarding-visual">
          <Image
            key={slide.image}
            src={slide.image}
            alt={slide.alt}
            fill
            priority={index === 0}
            sizes="(max-width: 520px) calc(100vw - 36px), 484px"
            className="onboarding-photo"
          />
          <div className="onboarding-photo-shade" />
          <div className="coverage-chip">
            <MapPin size={16} color="var(--gold)" />
            Dakar et toutes les régions du Sénégal
          </div>
        </div>
        <p className="onboarding-eyebrow">{slide.eyebrow}</p>
        <h1>{slide.title}</h1>
        <p className="onboarding-copy">{slide.text}</p>
        <div className="slide-dots" aria-label={`Écran ${index + 1} sur ${slides.length}`}>
          {slides.map((item, slideIndex) => (
            <button
              key={item.title}
              className={slideIndex === index ? "active" : ""}
              type="button"
              aria-label={`Aller à l’écran ${slideIndex + 1}`}
              aria-current={slideIndex === index ? "step" : undefined}
              onClick={() => setIndex(slideIndex)}
            />
          ))}
        </div>
      </section>

      {last ? (
        <div className="onboarding-actions">
          <Link className="primary-button gold" href="/signup">Créer un compte</Link>
          <Link className="secondary-button inverse" href="/login">Se connecter</Link>
        </div>
      ) : (
        <button className="primary-button gold" type="button" onClick={() => setIndex((value) => value + 1)}>
          Continuer <ArrowRight size={19} />
        </button>
      )}
    </main>
  );
}
