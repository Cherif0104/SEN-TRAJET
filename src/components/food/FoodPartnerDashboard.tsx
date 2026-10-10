"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BellRing,
  Bike,
  Check,
  ChefHat,
  Clock3,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Store,
  ToggleLeft,
  ToggleRight,
  X
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { FoodOrder, MenuItem, Restaurant } from "@/lib/types";

type PartnerOrder = FoodOrder & {
  food_order_items: Array<{ id: string; name_snapshot: string; quantity: number; line_total: number }>;
};

export function FoodPartnerDashboard() {
  const { user, profile } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [orders, setOrders] = useState<PartnerOrder[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [tab, setTab] = useState<"orders" | "menu">("orders");
  const [prepMinutes, setPrepMinutes] = useState(25);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadRestaurants() {
    if (!user) return;
    if (profile?.role === "admin") {
      const { data } = await supabase
        .from("restaurants")
        .select("id, name, slug, description, image_url, logo_url, address, cuisine_type, delivery_fee, service_fee, minimum_order, estimated_prep_minutes, rating, review_count, is_open")
        .order("name");
      const rows = (data as Restaurant[] | null) ?? [];
      setRestaurants(rows);
      setRestaurantId((current) => current ?? rows[0]?.id ?? null);
      setLoading(false);
      return;
    }
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id);
    const organizationIds = (memberships ?? []).map((item) => item.organization_id);
    let query = supabase
      .from("restaurants")
      .select("id, name, slug, description, image_url, logo_url, address, cuisine_type, delivery_fee, service_fee, minimum_order, estimated_prep_minutes, rating, review_count, is_open")
      .eq("owner_id", user.id);
    if (organizationIds.length) {
      query = supabase
        .from("restaurants")
        .select("id, name, slug, description, image_url, logo_url, address, cuisine_type, delivery_fee, service_fee, minimum_order, estimated_prep_minutes, rating, review_count, is_open")
        .or(`owner_id.eq.${user.id},organization_id.in.(${organizationIds.join(",")})`);
    }
    const { data } = await query;
    const rows = (data as Restaurant[] | null) ?? [];
    setRestaurants(rows);
    setRestaurantId((current) => current ?? rows[0]?.id ?? null);
    setLoading(false);
  }

  async function loadOperations(id = restaurantId) {
    if (!id) return;
    const [{ data: orderData }, { data: menuData }] = await Promise.all([
      supabase
        .from("food_orders")
        .select("id, reference, client_id, restaurant_id, courier_driver_id, status, restaurant_status, delivery_status, delivery_mode, payment_method, payment_status, subtotal, delivery_fee, service_fee, total, delivery_address, recipient_name, recipient_phone, customer_notes, estimated_ready_at, created_at, food_order_items(id, name_snapshot, quantity, line_total)")
        .eq("restaurant_id", id)
        .in("status", ["pending", "accepted", "preparing", "ready", "picked_up"])
        .order("created_at"),
      supabase
        .from("menu_items")
        .select("id, restaurant_id, category_id, name, description, price, image_url, is_available, sort_order")
        .eq("restaurant_id", id)
        .order("sort_order")
    ]);
    setOrders((orderData as unknown as PartnerOrder[] | null) ?? []);
    setMenu((menuData as MenuItem[] | null) ?? []);
  }

  useEffect(() => {
    void loadRestaurants();
  }, [profile?.role, user]);

  useEffect(() => {
    if (!restaurantId) return;
    void loadOperations(restaurantId);
    const channel = supabase
      .channel(`partner-food-${restaurantId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "food_orders", filter: `restaurant_id=eq.${restaurantId}` }, () => void loadOperations(restaurantId))
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId]);

  async function transition(orderId: string, action: "accept" | "prepare" | "ready" | "reject") {
    setBusy(orderId);
    setError(null);
    const { error: transitionError } = await supabase.rpc("partner_update_food_order", {
      p_order_id: orderId,
      p_action: action,
      p_prep_minutes: action === "accept" ? prepMinutes : null,
      p_reason: action === "reject" ? reason : null
    });
    if (transitionError) setError(transitionError.message);
    else {
      setRejecting(null);
      setReason("");
      await loadOperations();
    }
    setBusy(null);
  }

  async function toggleItem(item: MenuItem) {
    setBusy(item.id);
    const { error: updateError } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available, updated_at: new Date().toISOString() })
      .eq("id", item.id);
    if (updateError) setError(updateError.message);
    else setMenu((current) => current.map((row) => row.id === item.id ? { ...row, is_available: !row.is_available } : row));
    setBusy(null);
  }

  const selectedRestaurant = restaurants.find((restaurant) => restaurant.id === restaurantId);
  const pendingCount = orders.filter((order) => order.status === "pending").length;

  return (
    <AuthGate>
      <main className="mobile-screen partner-food-shell">
        <header className="partner-food-header safe-top">
          <div><Link href="/app"><ArrowLeft /></Link><BrandLogo compact inverse /></div>
          <button type="button" onClick={() => void loadOperations()} aria-label="Actualiser"><RefreshCw size={18} /></button>
        </header>

        <section className="partner-food-content">
          <p className="eyebrow">Portail partenaire</p>
          <h1>Commandes en direct</h1>
          <p className="muted">Préparez au bon moment. SentraJet coordonne le livreur.</p>

          {loading ? <div className="admin-empty"><LoaderCircle className="spin" /></div> : restaurants.length ? (
            <>
              <label className="partner-restaurant-select">
                <Store />
                <select value={restaurantId ?? ""} onChange={(event) => setRestaurantId(event.target.value)}>
                  {restaurants.map((restaurant) => <option key={restaurant.id} value={restaurant.id}>{restaurant.name}</option>)}
                </select>
              </label>

              <div className="partner-live-metric">
                <span><BellRing /></span>
                <div><strong>{pendingCount}</strong><small>nouvelle{pendingCount === 1 ? "" : "s"} commande{pendingCount === 1 ? "" : "s"}</small></div>
                <em>{selectedRestaurant?.is_open ? "Ouvert" : "Fermé"}</em>
              </div>

              <div className="partner-tabs">
                <button type="button" className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>Commandes</button>
                <button type="button" className={tab === "menu" ? "active" : ""} onClick={() => setTab("menu")}>Disponibilités</button>
              </div>

              {error ? <div className="error">{error}</div> : null}

              {tab === "orders" ? (
                <div className="partner-order-list">
                  {orders.length ? orders.map((order) => (
                    <article className={`partner-order ${order.status === "pending" ? "urgent" : ""}`} key={order.id}>
                      <header><div><span>{order.reference}</span><strong>{formatFare(order.total)}</strong></div><small>{new Date(order.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</small></header>
                      <div className="partner-order-items">
                        {order.food_order_items.map((item) => <p key={item.id}><b>{item.quantity}×</b> {item.name_snapshot}</p>)}
                      </div>
                      <div className="partner-order-destination">
                        <span>{order.delivery_mode === "delivery" ? <Bike /> : <Store />}</span>
                        <div><strong>{order.delivery_mode === "delivery" ? "Livraison" : "Retrait client"}</strong><small>{order.delivery_address}</small></div>
                      </div>
                      {order.customer_notes ? <blockquote>{order.customer_notes}</blockquote> : null}

                      {order.status === "pending" ? (
                        <>
                          <label className="prep-time"><Clock3 /><span>Prête dans</span><select value={prepMinutes} onChange={(event) => setPrepMinutes(Number(event.target.value))}><option value={15}>15 min</option><option value={25}>25 min</option><option value={35}>35 min</option><option value={45}>45 min</option><option value={60}>60 min</option></select></label>
                          <div className="partner-order-actions"><button type="button" className="secondary-button reject" onClick={() => setRejecting(order.id)}><X /> Refuser</button><button type="button" className="primary-button gold" disabled={busy === order.id} onClick={() => void transition(order.id, "accept")}><Check /> Accepter</button></div>
                        </>
                      ) : null}
                      {order.status === "accepted" ? <button className="primary-button" type="button" disabled={busy === order.id} onClick={() => void transition(order.id, "prepare")}><ChefHat /> Lancer la préparation</button> : null}
                      {order.status === "preparing" ? <button className="primary-button gold" type="button" disabled={busy === order.id} onClick={() => void transition(order.id, "ready")}><PackageCheck /> Marquer prête</button> : null}
                      {order.status === "ready" || order.status === "picked_up" ? <div className="success">{order.status === "ready" ? "Commande prête. Coordination du retrait en cours." : "Commande récupérée par le livreur."}</div> : null}
                    </article>
                  )) : <div className="food-empty"><ChefHat /><h2>Tout est prêt</h2><p>Les nouvelles commandes apparaîtront ici avec une alerte.</p></div>}
                </div>
              ) : (
                <div className="partner-menu-list">
                  {menu.map((item) => (
                    <button type="button" key={item.id} onClick={() => void toggleItem(item)} disabled={busy === item.id}>
                      <span><strong>{item.name}</strong><small>{formatFare(item.price)}</small></span>
                      {item.is_available ? <ToggleRight color="var(--green)" /> : <ToggleLeft />}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="food-empty">
              <Store />
              <h2>Aucun établissement rattaché</h2>
              <p>L’administrateur doit valider votre organisation et vous attribuer un restaurant.</p>
            </div>
          )}
        </section>

        {rejecting ? (
          <div className="partner-reject-dialog">
            <div><p className="eyebrow">Refuser la commande</p><h2>Indiquez un motif clair</h2><textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Article indisponible, fermeture exceptionnelle…" /><div><button className="secondary-button" type="button" onClick={() => setRejecting(null)}>Annuler</button><button className="primary-button" type="button" disabled={reason.trim().length < 5 || busy === rejecting} onClick={() => void transition(rejecting, "reject")}>Confirmer</button></div></div>
          </div>
        ) : null}
      </main>
    </AuthGate>
  );
}
