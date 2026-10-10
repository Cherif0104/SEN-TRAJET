"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, CarFront, Check, Clock3, FileCheck2, LogOut, MapPin, Navigation, Power, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { DriverOnboardingStatus } from "@/lib/types";

type DashboardDriver = {
  id: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  onboarding_status: DriverOnboardingStatus;
  is_online: boolean;
  submitted_at: string | null;
  rejection_reason: string | null;
};

type Offer = {
  id: string;
  ride_request_id: string;
  expires_at: string;
  ride_request: {
    pickup_address: string;
    destination_address: string;
    distance_km: number;
    estimated_fare: number;
    service_type: string;
  } | null;
};

type ActiveRide = {
  id: string;
  reference: string;
  status: "assigned" | "driver_en_route" | "driver_arrived" | "passenger_on_board";
  pickup_address: string;
  destination_address: string;
  distance_km: number;
  estimated_fare: number;
  service_type: string;
};

export function DriverDashboard() {
  const router = useRouter();
  const { user, profile, signOut } = useAuth();
  const [driver, setDriver] = useState<DashboardDriver | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [activeRide, setActiveRide] = useState<ActiveRide | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDriver() {
    if (!user) return;
    const { data } = await supabase
      .from("driver_profiles")
      .select("id, status, onboarding_status, is_online, submitted_at, rejection_reason")
      .eq("user_id", user.id)
      .maybeSingle();
    setDriver(data as DashboardDriver | null);
  }

  async function loadOffer() {
    const { data } = await supabase
      .from("dispatch_offers")
      .select("id, ride_request_id, expires_at, ride_request:ride_requests(pickup_address, destination_address, distance_km, estimated_fare, service_type)")
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setOffer(data as unknown as Offer | null);
  }

  async function loadActiveRide() {
    const { data } = await supabase
      .from("ride_requests")
      .select("id, reference, status, pickup_address, destination_address, distance_km, estimated_fare, service_type")
      .in("status", ["assigned", "driver_en_route", "driver_arrived", "passenger_on_board"])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setActiveRide(data as ActiveRide | null);
  }

  useEffect(() => {
    void loadDriver();
    void loadOffer();
    void loadActiveRide();
    const channel = supabase
      .channel("driver-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers" }, () => void loadOffer())
      .on("postgres_changes", { event: "*", schema: "public", table: "ride_requests" }, () => void loadActiveRide())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    if ((!driver?.is_online && !activeRide) || !navigator.geolocation) return;
    let lastSentAt = 0;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (Date.now() - lastSentAt < 8000) return;
        lastSentAt = Date.now();
        void supabase.rpc("update_driver_location", {
          p_lat: position.coords.latitude,
          p_lng: position.coords.longitude,
          p_heading: position.coords.heading,
          p_accuracy_m: position.coords.accuracy
        });
      },
      () => setMessage("Activez la localisation précise pour assurer le suivi en direct."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [activeRide, driver?.is_online]);

  async function setOnline(next: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (next && navigator.geolocation) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000 })
        );
        lat = position.coords.latitude;
        lng = position.coords.longitude;
      }
      const { error } = await supabase.rpc("set_driver_availability", {
        p_online: next,
        p_lat: lat,
        p_lng: lng
      });
      if (error) throw error;
      setDriver((current) => (current ? { ...current, is_online: next } : current));
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(accept: boolean) {
    if (!offer) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("respond_dispatch_offer", {
        p_offer_id: offer.id,
        p_accept: accept
      });
      if (error) throw error;
      setOffer(null);
      setMessage(accept ? "Course acceptée. Navigation prête." : "Proposition refusée.");
      if (accept) await loadActiveRide();
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Réponse impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function advanceRide() {
    if (!activeRide) return;
    const nextStatus = activeRide.status === "assigned"
      ? "driver_en_route"
      : activeRide.status === "driver_en_route"
        ? "driver_arrived"
        : activeRide.status === "driver_arrived"
          ? "passenger_on_board"
          : "completed";
    setBusy(true);
    setMessage(null);
    try {
      const { error } = await supabase.rpc("update_ride_status", {
        p_ride_id: activeRide.id,
        p_status: nextStatus
      });
      if (error) throw error;
      if (nextStatus === "completed") {
        setActiveRide(null);
        setDriver((current) => current ? { ...current, is_online: true } : current);
        setMessage("Course terminée. Vous êtes à nouveau disponible.");
      } else {
        setActiveRide({ ...activeRide, status: nextStatus });
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Mise à jour impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  if (!driver || driver.status !== "approved") {
    const state = driver?.status === "suspended"
      ? {
          eyebrow: "Compte suspendu",
          title: "Votre activité est temporairement suspendue.",
          text: driver.rejection_reason || "Contactez l’équipe SentraJet pour connaître les prochaines étapes.",
          action: "Consulter mon dossier"
        }
      : driver?.onboarding_status === "rejected"
        ? {
            eyebrow: "Correction requise",
            title: "Votre dossier doit être ajusté.",
            text: driver.rejection_reason || "Un justificatif ou une information doit être corrigé avant validation.",
            action: "Corriger mon dossier"
          }
        : driver?.onboarding_status === "submitted"
          ? {
              eyebrow: "Vérification en cours",
              title: "Votre dossier est entre de bonnes mains.",
              text: "Notre équipe vérifie vos justificatifs. Vous serez notifié dès que votre espace sera activé.",
              action: "Voir mon dossier"
            }
          : {
              eyebrow: "Activation requise",
              title: "Finalisez votre profil professionnel.",
              text: "Renseignez votre véhicule et transmettez vos justificatifs pour commencer à recevoir des courses.",
              action: "Commencer maintenant"
            };
    return (
      <section className="driver-pending safe-bottom">
        <header className="driver-pending-header safe-top">
          <BrandLogo compact inverse />
          <button type="button" onClick={() => void logout()} aria-label="Se déconnecter"><LogOut size={18} /></button>
        </header>
        <div className="driver-pending-intro">
          <span className="status-orb">{driver?.onboarding_status === "submitted" ? <FileCheck2 /> : <ShieldAlert />}</span>
          <p className="onboarding-eyebrow">{state.eyebrow}</p>
          <h1>{state.title}</h1>
          <p>{state.text}</p>
          <Link className="primary-button gold" href="/driver/onboarding">{state.action} <ArrowRight size={18} /></Link>
        </div>
        <div className="status-timeline">
          <TimelineItem done title="Compte créé" text="Votre identité de connexion est sécurisée." />
          <TimelineItem done={driver?.onboarding_status !== "incomplete"} active={driver?.onboarding_status === "incomplete" || driver?.onboarding_status === "rejected"} title="Dossier professionnel" text="Identité, véhicule et justificatifs." />
          <TimelineItem done={driver?.onboarding_status === "approved"} active={driver?.onboarding_status === "submitted"} title="Contrôle SentraJet" text="Revue humaine avant toute mise en ligne." />
          <TimelineItem done={driver?.status === "approved"} title="Activation" text="Accès aux missions et au suivi live." />
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "18px 18px 30px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><p className="eyebrow">Espace chauffeur</p><h1 style={{ margin: "4px 0 0", fontSize: 24 }}>Bonjour {profile?.full_name?.split(" ")[0]}</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <NotificationBell />
          <button type="button" onClick={() => void logout()} style={{ width: 43, height: 43, border: 0, borderRadius: 15, background: "white" }}><LogOut size={18} /></button>
        </div>
      </header>

      {!activeRide ? <div className="card" style={{ marginTop: 24, padding: 18, background: driver.is_online ? "#e9f9f2" : "white", borderColor: driver.is_online ? "#90d9b9" : "var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: driver.is_online ? "var(--green)" : "#e8ebee", color: driver.is_online ? "white" : "var(--muted)", display: "grid", placeItems: "center" }}><Power /></div>
          <div style={{ flex: 1 }}><strong>{driver.is_online ? "Vous êtes en ligne" : "Vous êtes hors ligne"}</strong><small className="muted" style={{ display: "block", marginTop: 4 }}>{driver.is_online ? "Vous pouvez recevoir des courses." : "Activez-vous pour travailler."}</small></div>
        </div>
        <button className={driver.is_online ? "secondary-button" : "primary-button"} type="button" disabled={busy} style={{ marginTop: 16 }} onClick={() => void setOnline(!driver.is_online)}>
          {driver.is_online ? "Passer hors ligne" : "Se mettre en ligne"}
        </button>
      </div> : null}

      {activeRide ? (
        <div className="card active-ride-card">
          <div className="active-ride-head">
            <span><Navigation /> Course en cours</span>
            <strong>{activeRide.reference}</strong>
          </div>
          <h2>
            {activeRide.status === "assigned"
              ? "Confirmez votre départ"
              : activeRide.status === "driver_en_route"
                ? "Direction le client"
                : activeRide.status === "driver_arrived"
                  ? "Vous êtes arrivé"
                  : "Client à bord"}
          </h2>
          <div className="active-ride-route">
            <OfferLine icon={MapPin} label="Prise en charge" value={activeRide.pickup_address} />
            <OfferLine icon={Navigation} label="Destination" value={activeRide.destination_address} />
          </div>
          <div className="active-ride-meta">
            <span>{activeRide.distance_km} km</span>
            <strong>{formatFare(activeRide.estimated_fare)}</strong>
          </div>
          <button className="primary-button gold" type="button" disabled={busy} onClick={() => void advanceRide()}>
            {activeRide.status === "assigned"
              ? "Démarrer vers le client"
              : activeRide.status === "driver_en_route"
                ? "Je suis arrivé"
                : activeRide.status === "driver_arrived"
                  ? "Client à bord"
                  : "Terminer la course"}
            <ArrowRight />
          </button>
        </div>
      ) : offer?.ride_request ? (
        <div className="card" style={{ marginTop: 16, padding: 18, borderWidth: 2, borderColor: "var(--gold-deep)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 7, color: "var(--gold-deep)", fontWeight: 850 }}><Clock3 size={17} /> Nouvelle proposition</span>
            <strong>{formatFare(offer.ride_request.estimated_fare)}</strong>
          </div>
          <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
            <OfferLine icon={MapPin} label="Prise en charge" value={offer.ride_request.pickup_address} />
            <OfferLine icon={Navigation} label="Destination" value={offer.ride_request.destination_address} />
            <OfferLine icon={CarFront} label="Distance" value={`${offer.ride_request.distance_km} km`} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 9, marginTop: 18 }}>
            <button className="secondary-button" type="button" disabled={busy} onClick={() => void respond(false)}><X size={18} /> Refuser</button>
            <button className="primary-button" type="button" disabled={busy} onClick={() => void respond(true)}><Check size={18} /> Accepter</button>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginTop: 16, padding: 25, textAlign: "center" }}>
          <div className="radar" style={{ width: 150, height: 150, margin: "0 auto" }}><CarFront style={{ position: "relative", zIndex: 2 }} color="var(--gold)" /></div>
          <h2 style={{ margin: "20px 0 0", fontSize: 20 }}>{driver.is_online ? "En attente d’une course" : "Aucune proposition"}</h2>
          <p className="muted" style={{ fontSize: 13 }}>Les nouvelles demandes apparaîtront ici en temps réel.</p>
        </div>
      )}
      {message ? <div className="success" style={{ marginTop: 14 }}>{message}</div> : null}
    </section>
  );
}

function TimelineItem({ title, text, done = false, active = false }: { title: string; text: string; done?: boolean; active?: boolean }) {
  return (
    <div className={done ? "done" : active ? "active" : ""}>
      <span>{done ? <Check size={14} /> : null}</span>
      <div><strong>{title}</strong><small>{text}</small></div>
    </div>
  );
}

function OfferLine({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div style={{ display: "flex", gap: 10 }}><Icon size={18} color="var(--gold-deep)" style={{ marginTop: 2 }} /><div><small className="muted">{label}</small><p style={{ margin: "4px 0 0", fontSize: 14 }}>{value}</p></div></div>;
}
