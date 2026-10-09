"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CarFront, Check, Clock3, LogOut, MapPin, Navigation, Power, ShieldAlert, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";

type DriverProfile = {
  id: string;
  status: "pending" | "approved" | "rejected" | "suspended";
  is_online: boolean;
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

export function DriverDashboard() {
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function loadDriver() {
    const { data } = await supabase
      .from("driver_profiles")
      .select("id, status, is_online")
      .maybeSingle();
    setDriver(data as DriverProfile | null);
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

  useEffect(() => {
    void loadDriver();
    void loadOffer();
    const channel = supabase
      .channel("driver-offers")
      .on("postgres_changes", { event: "*", schema: "public", table: "dispatch_offers" }, () => void loadOffer())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

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
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Réponse impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await signOut();
    router.replace("/");
  }

  if (!driver || driver.status !== "approved") {
    return (
      <section style={{ padding: "20px 18px" }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div className="brand">SENTRAJET</div><small style={{ color: "var(--gold-deep)", fontWeight: 800 }}>ESPACE CHAUFFEUR</small></div>
          <button type="button" onClick={() => void logout()} style={{ width: 43, height: 43, border: 0, borderRadius: 15, background: "white" }}><LogOut size={18} /></button>
        </header>
        <div className="card" style={{ marginTop: 38, padding: 22, textAlign: "center" }}>
          <div style={{ width: 70, height: 70, margin: "0 auto", borderRadius: 25, background: "#fff2d6", color: "var(--gold-deep)", display: "grid", placeItems: "center" }}><ShieldAlert size={34} /></div>
          <h1 style={{ margin: "20px 0 0" }}>Validation en cours</h1>
          <p className="muted" style={{ lineHeight: 1.55 }}>Votre profil chauffeur doit être validé avant de recevoir des courses.</p>
          <button className="primary-button" type="button" style={{ marginTop: 14 }}>Compléter mes documents</button>
        </div>
      </section>
    );
  }

  return (
    <section style={{ padding: "18px 18px 30px" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><p className="eyebrow">Espace chauffeur</p><h1 style={{ margin: "4px 0 0", fontSize: 24 }}>Bonjour {profile?.full_name?.split(" ")[0]}</h1></div>
        <button type="button" onClick={() => void logout()} style={{ width: 43, height: 43, border: 0, borderRadius: 15, background: "white" }}><LogOut size={18} /></button>
      </header>

      <div className="card" style={{ marginTop: 24, padding: 18, background: driver.is_online ? "#e9f9f2" : "white", borderColor: driver.is_online ? "#90d9b9" : "var(--line)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
          <div style={{ width: 52, height: 52, borderRadius: 18, background: driver.is_online ? "var(--green)" : "#e8ebee", color: driver.is_online ? "white" : "var(--muted)", display: "grid", placeItems: "center" }}><Power /></div>
          <div style={{ flex: 1 }}><strong>{driver.is_online ? "Vous êtes en ligne" : "Vous êtes hors ligne"}</strong><small className="muted" style={{ display: "block", marginTop: 4 }}>{driver.is_online ? "Vous pouvez recevoir des courses." : "Activez-vous pour travailler."}</small></div>
        </div>
        <button className={driver.is_online ? "secondary-button" : "primary-button"} type="button" disabled={busy} style={{ marginTop: 16 }} onClick={() => void setOnline(!driver.is_online)}>
          {driver.is_online ? "Passer hors ligne" : "Se mettre en ligne"}
        </button>
      </div>

      {offer?.ride_request ? (
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

function OfferLine({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return <div style={{ display: "flex", gap: 10 }}><Icon size={18} color="var(--gold-deep)" style={{ marginTop: 2 }} /><div><small className="muted">{label}</small><p style={{ margin: "4px 0 0", fontSize: 14 }}>{value}</p></div></div>;
}
