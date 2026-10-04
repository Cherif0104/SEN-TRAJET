import { NextRequest, NextResponse } from "next/server";
import type {
  ClientTrip,
  ClientTripLifecycle,
} from "@/lib/clientTrips";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getUserFromBearer } from "@/lib/server/authUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

const CANCELLED_PLATFORM = new Set([
  "annulee_client",
  "annulee_sentrajet",
  "remboursee",
  "remboursement_en_cours",
  "no_show",
]);

const STATUS_LABELS: Record<string, string> = {
  recherche_chauffeur: "Recherche d’un chauffeur",
  aucun_chauffeur: "Aucun chauffeur trouvé",
  chauffeur_a_assigner: "Affectation en cours",
  chauffeur_assigne: "Chauffeur affecté",
  chauffeur_en_route: "Chauffeur en route",
  chauffeur_arrive: "Chauffeur arrivé",
  client_pris_en_charge: "Prise en charge",
  en_attente_de_paiement: "Paiement attendu",
  confirmee: "Confirmée",
  active: "En cours",
  en_cours: "En cours",
  terminee: "Terminée",
  completed: "Terminée",
  confirmed: "Confirmée",
  pending_payment: "Paiement attendu",
  reservee: "Paiement attendu",
  cancelled: "Annulée",
  annulee: "Annulée",
  annulee_client: "Annulée",
  annulee_sentrajet: "Annulée",
  expired: "Expirée",
  expiree: "Expirée",
  no_show: "Absence",
  ouverte: "Recherche ouverte",
  recherche: "Recherche d’un chauffeur",
  chauffeur_propose: "Chauffeur proposé",
  chauffeur_accepte: "Chauffeur accepté",
};

const PLATFORM_SERVICE_LABELS: Record<string, string> = {
  transfert_aibd: "Taxi AIBD",
  aibd_retour: "Taxi AIBD",
  interurbain: "Voyager",
  mise_a_disposition: "Course privée",
  ceremonie: "Course privée",
  groupe_evenement: "Course privée",
  longue_distance: "Course privée",
  autre: "Course privée",
};

function relation(value: unknown): Row | null {
  if (!value) return null;
  if (Array.isArray(value)) return (value[0] as Row | undefined) ?? null;
  return value as Row;
}

function text(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function amount(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.replaceAll("_", " ");
}

function platformLifecycle(status: string): ClientTripLifecycle {
  if (CANCELLED_PLATFORM.has(status)) return "cancelled";
  return status === "terminee" ? "past" : "upcoming";
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  }

  try {
    const admin = getSupabaseAdmin();
    const {
      data: { user },
      error: authError,
    } = await Promise.resolve({ data: { user: await getUserFromBearer(request.headers.get("authorization")) }, error: null });
    if (authError || !user) {
      return NextResponse.json({ error: "Votre session a expiré." }, { status: 401 });
    }

    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    const platformPromise = client?.id
      ? admin
          .from("bookings")
          .select(
            `id, reference, status, pickup, dropoff, pickup_time, service_type,
             estimated_price, created_at`
          )
          .eq("client_id", client.id)
          .order("pickup_time", { ascending: false })
          .limit(100)
      : Promise.resolve({ data: [], error: null });

    const [platform, alloBookings, alloRequests, voyager, rentals, myDriver] =
      await Promise.all([
        platformPromise,
        admin
          .from("allo_dakar_bookings")
          .select(
            `id, status, amount_fcfa, created_at, pickup_mode, pickup_detail,
             departure:allo_dakar_departures(
               departure_at,
               corridor:allo_dakar_corridors(origin_city, destination_city)
             )`
          )
          .eq("client_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        admin
          .from("allo_dakar_ride_requests")
          .select(
            `id, status, desired_date, desired_time_hint, created_at, max_price_fcfa,
             matched_booking_id,
             corridor:allo_dakar_corridors(origin_city, destination_city)`
          )
          .eq("client_user_id", user.id)
          .is("matched_booking_id", null)
          .order("created_at", { ascending: false })
          .limit(100),
        admin
          .from("voyager_bookings")
          .select(
            `id, reference, status, payment_status, seats_booked, amount_fcfa, created_at,
             departure:voyager_departures(
               departure_at, vehicle_type,
               line:voyager_lines(origin_city, destination_city, boarding_point)
             )`
          )
          .eq("client_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        admin
          .from("rental_bookings")
          .select(
            `id, reference, status, start_date, end_date, total_fcfa,
             pickup_location_label, created_at,
             listing:rental_listings(vehicle:vehicles(brand, model))`
          )
          .eq("client_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
        admin
          .from("my_driver_requests")
          .select(
            `id, reference, status, starts_at, duration_hours, amount_fcfa,
             pickup_address, created_at`
          )
          .eq("client_user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    const firstError = [
      platform.error,
      alloBookings.error,
      alloRequests.error,
      voyager.error,
      rentals.error,
      myDriver.error,
    ].find(Boolean);
    if (firstError) throw firstError;

    const trips: ClientTrip[] = [];

    for (const raw of platform.data ?? []) {
      const row = raw as Row;
      const status = text(row.status);
      const serviceType = text(row.service_type);
      trips.push({
        kind: "platform",
        id: text(row.id),
        reference: text(row.reference, text(row.id).slice(0, 8).toUpperCase()),
        serviceLabel: PLATFORM_SERVICE_LABELS[serviceType] ?? "Course privée",
        title: `${text(row.pickup)} → ${text(row.dropoff)}`,
        subtitle: null,
        startsAt: text(row.pickup_time, text(row.created_at)),
        status,
        statusLabel: statusLabel(status),
        lifecycle: platformLifecycle(status),
        amountFcfa: amount(row.estimated_price),
        detailHref: `/compte/reservations/${text(row.id)}`,
      });
    }

    for (const raw of alloBookings.data ?? []) {
      const row = raw as Row;
      const departure = relation(row.departure);
      const corridor = relation(departure?.corridor);
      const status = text(row.status);
      trips.push({
        kind: "allo_dakar",
        id: text(row.id),
        reference: `AD-${text(row.id).slice(0, 8).toUpperCase()}`,
        serviceLabel: "Allo Dakar",
        title: `${text(corridor?.origin_city, "Départ")} → ${text(corridor?.destination_city, "Destination")}`,
        subtitle:
          text(row.pickup_mode) === "domicile"
            ? `Collecte à domicile${row.pickup_detail ? ` · ${text(row.pickup_detail)}` : ""}`
            : "Départ au point relais",
        startsAt: text(departure?.departure_at, text(row.created_at)),
        status,
        statusLabel: statusLabel(status),
        lifecycle:
          status === "terminee" ? "past" : ["annulee", "no_show"].includes(status) ? "cancelled" : "upcoming",
        amountFcfa: amount(row.amount_fcfa),
        detailHref: `/allo-dakar/confirmation/${text(row.id)}`,
      });
    }

    for (const raw of alloRequests.data ?? []) {
      const row = raw as Row;
      const corridor = relation(row.corridor);
      const status = text(row.status);
      const desiredTime = text(row.desired_time_hint);
      trips.push({
        kind: "allo_dakar_request",
        id: text(row.id),
        reference: `AD-BESOIN-${text(row.id).slice(0, 6).toUpperCase()}`,
        serviceLabel: "Allo Dakar · Besoin publié",
        title: `${text(corridor?.origin_city, "Départ")} → ${text(corridor?.destination_city, "Destination")}`,
        subtitle: desiredTime ? `Horaire souhaité : ${desiredTime}` : "Horaire flexible",
        startsAt: `${text(row.desired_date)}T12:00:00`,
        status,
        statusLabel: statusLabel(status),
        lifecycle: ["annulee", "expiree"].includes(status) ? "cancelled" : "upcoming",
        amountFcfa: amount(row.max_price_fcfa),
        detailHref: "/allo-dakar",
      });
    }

    for (const raw of voyager.data ?? []) {
      const row = raw as Row;
      const departure = relation(row.departure);
      const line = relation(departure?.line);
      const status = text(row.status);
      trips.push({
        kind: "voyager",
        id: text(row.id),
        reference: text(row.reference),
        serviceLabel: "Voyager",
        title: `${text(line?.origin_city, "Départ")} → ${text(line?.destination_city, "Destination")}`,
        subtitle: `${text(row.seats_booked)} place${Number(row.seats_booked) > 1 ? "s" : ""} · ${text(line?.boarding_point)}`,
        startsAt: text(departure?.departure_at, text(row.created_at)),
        status,
        statusLabel: statusLabel(status),
        lifecycle:
          status === "terminee"
            ? "past"
            : ["annulee", "expiree"].includes(status)
              ? "cancelled"
              : "upcoming",
        amountFcfa: amount(row.amount_fcfa),
        detailHref: `/voyager/confirmation/${text(row.id)}`,
      });
    }

    for (const raw of rentals.data ?? []) {
      const row = raw as Row;
      const listing = relation(row.listing);
      const vehicle = relation(listing?.vehicle);
      const status = text(row.status);
      trips.push({
        kind: "rental",
        id: text(row.id),
        reference: text(row.reference),
        serviceLabel: "Louer une voiture",
        title: `${text(vehicle?.brand, "Véhicule")} ${text(vehicle?.model)}`.trim(),
        subtitle: `${text(row.pickup_location_label)} · retour le ${new Date(`${text(row.end_date)}T12:00:00`).toLocaleDateString("fr-FR")}`,
        startsAt: `${text(row.start_date)}T12:00:00`,
        status,
        statusLabel: statusLabel(status),
        lifecycle: status === "completed" ? "past" : ["cancelled", "expired"].includes(status) ? "cancelled" : "upcoming",
        amountFcfa: amount(row.total_fcfa),
        detailHref: `/flotte/reservation/${text(row.id)}`,
      });
    }

    for (const raw of myDriver.data ?? []) {
      const row = raw as Row;
      const status = text(row.status);
      trips.push({
        kind: "my_driver",
        id: text(row.id),
        reference: text(row.reference),
        serviceLabel: "Mon Chauffeur",
        title: text(row.pickup_address),
        subtitle: `${text(row.duration_hours)} h avec votre véhicule`,
        startsAt: text(row.starts_at, text(row.created_at)),
        status,
        statusLabel: statusLabel(status),
        lifecycle: status === "terminee" ? "past" : ["annulee", "aucun_chauffeur"].includes(status) ? "cancelled" : "upcoming",
        amountFcfa: amount(row.amount_fcfa),
        detailHref: `/mon-chauffeur?mission=${encodeURIComponent(text(row.id))}`,
      });
    }

    trips.sort(
      (a, b) =>
        new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
    );
    return NextResponse.json({ trips });
  } catch (error) {
    console.error("[client-trips]", error);
    return NextResponse.json(
      { error: "Impossible de charger toutes vos prestations." },
      { status: 503 },
    );
  }
}
