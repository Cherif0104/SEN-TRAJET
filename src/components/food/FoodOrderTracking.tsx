"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bike, Check, ChefHat, Clock3, MapPin, PackageCheck, ReceiptText, Store } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { FoodOrder, FoodOrderStatus } from "@/lib/types";

type OrderItem = {
  id: string;
  name_snapshot: string;
  quantity: number;
  line_total: number;
};

type OrderEvent = {
  id: number;
  status: FoodOrderStatus;
  message: string | null;
  created_at: string;
};

const steps: Array<{ status: FoodOrderStatus; label: string; icon: typeof Clock3 }> = [
  { status: "pending", label: "Confirmation du restaurant", icon: Clock3 },
  { status: "preparing", label: "Préparation de la commande", icon: ChefHat },
  { status: "ready", label: "Prête pour le livreur", icon: Store },
  { status: "picked_up", label: "En route vers vous", icon: Bike },
  { status: "delivered", label: "Commande livrée", icon: PackageCheck }
];

const statusRank: Record<FoodOrderStatus, number> = {
  pending: 0,
  accepted: 1,
  preparing: 1,
  ready: 2,
  picked_up: 3,
  delivered: 4,
  rejected: -1,
  cancelled: -1
};

export function FoodOrderTracking({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<FoodOrder | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [{ data: orderData }, { data: itemData }, { data: eventData }] = await Promise.all([
      supabase
        .from("food_orders")
        .select("id, reference, client_id, restaurant_id, courier_driver_id, status, restaurant_status, delivery_status, delivery_mode, payment_method, payment_status, subtotal, delivery_fee, service_fee, total, delivery_address, recipient_name, recipient_phone, customer_notes, estimated_ready_at, created_at, restaurant:restaurants(name, address)")
        .eq("id", orderId)
        .single(),
      supabase
        .from("food_order_items")
        .select("id, name_snapshot, quantity, line_total")
        .eq("order_id", orderId),
      supabase
        .from("food_order_events")
        .select("id, status, message, created_at")
        .eq("order_id", orderId)
        .order("created_at")
    ]);
    setOrder(orderData as unknown as FoodOrder | null);
    setItems((itemData as OrderItem[] | null) ?? []);
    setEvents((eventData as OrderEvent[] | null) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    const channel = supabase
      .channel(`food-order-${orderId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `id=eq.${orderId}` }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "food_order_events", filter: `order_id=eq.${orderId}` }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [orderId]);

  const rank = order ? statusRank[order.status] : 0;
  const stopped = order?.status === "rejected" || order?.status === "cancelled";

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="food-tracking">
          <header>
            <Link href="/restaurants" aria-label="Retour"><ArrowLeft size={20} /></Link>
            <div><p className="eyebrow">Commande en direct</p><h1>{order?.reference || "SentraJet Food"}</h1></div>
          </header>

          {loading ? <div className="food-detail-loading">Synchronisation de la commande…</div> : order ? (
            <>
              <div className={`tracking-hero ${stopped ? "stopped" : ""}`}>
                <div className="tracking-orbit"><Bike /><span /></div>
                <p className="onboarding-eyebrow">{stopped ? "Commande interrompue" : "Suivi temps réel"}</p>
                <h2>{statusTitle(order.status)}</h2>
                <p>{statusCopy(order)}</p>
                {order.estimated_ready_at && !stopped ? <span className="eta-chip"><Clock3 /> Prête vers {new Date(order.estimated_ready_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span> : null}
              </div>

              <div className="food-status-timeline">
                {steps.map((step, index) => {
                  const done = rank > index || order.status === "delivered";
                  const active = rank === index && !stopped;
                  const Icon = step.icon;
                  return (
                    <div key={step.status} className={done ? "done" : active ? "active" : ""}>
                      <span>{done ? <Check /> : <Icon />}</span>
                      <div><strong>{step.label}</strong><small>{eventFor(step.status, events)}</small></div>
                    </div>
                  );
                })}
              </div>

              <div className="tracking-card">
                <h3><Store /> {order.restaurant?.name}</h3>
                <p>{order.restaurant?.address}</p>
                <div className="tracking-items">
                  {items.map((item) => <div key={item.id}><span>{item.quantity} × {item.name_snapshot}</span><strong>{formatFare(item.line_total)}</strong></div>)}
                </div>
                <div className="tracking-total"><span>Total</span><strong>{formatFare(order.total)}</strong></div>
              </div>

              <div className="tracking-card delivery">
                <h3><MapPin /> {order.delivery_mode === "delivery" ? "Livraison" : "Retrait"}</h3>
                <p>{order.delivery_address}</p>
                <small>{order.recipient_name} · {order.recipient_phone}</small>
              </div>

              <div className="tracking-card receipt">
                <ReceiptText />
                <div><strong>Paiement : {paymentLabel(order.payment_method)}</strong><small>Statut : {order.payment_status.replace("_", " ")}</small></div>
              </div>
            </>
          ) : (
            <div className="food-empty"><h2>Commande introuvable</h2><p>Elle n’existe pas ou vous n’êtes pas autorisé à la consulter.</p></div>
          )}
        </section>
      </AppShell>
    </AuthGate>
  );
}

function statusTitle(status: FoodOrderStatus) {
  return {
    pending: "En attente du restaurant",
    accepted: "Commande confirmée",
    preparing: "Les cuisines s’activent",
    ready: "Votre commande est prête",
    picked_up: "Le livreur arrive",
    delivered: "Bon appétit !",
    rejected: "Commande refusée",
    cancelled: "Commande annulée"
  }[status];
}

function statusCopy(order: FoodOrder) {
  if (order.status === "pending") return "Le restaurant dispose de quelques instants pour confirmer.";
  if (order.status === "preparing" || order.status === "accepted") return "Vos plats sont préparés pendant que nous coordonnons la livraison.";
  if (order.status === "ready") return order.delivery_mode === "pickup" ? "Vous pouvez vous présenter au restaurant." : "Le retrait par le livreur est imminent.";
  if (order.status === "picked_up") return "Suivez l’avancement de votre livraison sans quitter l’application.";
  if (order.status === "delivered") return "La livraison est terminée. Votre reçu reste disponible.";
  return "Consultez vos notifications pour connaître le motif ou contactez l’assistance.";
}

function eventFor(status: FoodOrderStatus, events: OrderEvent[]) {
  const event = [...events].reverse().find((item) => item.status === status);
  return event ? `${event.message || "Mis à jour"} · ${new Date(event.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}` : "À venir";
}

function paymentLabel(method: string) {
  return { cash: "Espèces", wave: "Wave", orange_money: "Orange Money", card: "Carte" }[method] ?? method;
}
