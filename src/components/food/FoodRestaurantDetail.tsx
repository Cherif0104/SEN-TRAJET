"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bike,
  Check,
  ChevronRight,
  Clock3,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Store,
  WalletCards,
  X
} from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { FoodPaymentMethod, MenuItem, Restaurant } from "@/lib/types";

type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
};

type CartRow = MenuItem & { quantity: number };

const paymentMethods: Array<{ value: FoodPaymentMethod; label: string; hint: string; enabled: boolean }> = [
  { value: "cash", label: "Espèces", hint: "À la livraison", enabled: true },
  { value: "wave", label: "Wave", hint: "Bientôt disponible", enabled: false },
  { value: "orange_money", label: "Orange Money", hint: "Bientôt disponible", enabled: false },
  { value: "card", label: "Carte", hint: "Bientôt disponible", enabled: false }
];

function friendlyError(reason: unknown) {
  const raw = reason instanceof Error ? reason.message : "Commande impossible.";
  if (/minimum_order_not_reached/i.test(raw)) return "Le minimum de commande n’est pas encore atteint.";
  if (/restaurant_unavailable/i.test(raw)) return "Ce restaurant ne prend pas de commandes actuellement.";
  if (/cart_contains_unavailable_items/i.test(raw)) return "Un article du panier n’est plus disponible. Actualisez le menu.";
  if (/invalid_delivery_details/i.test(raw)) return "Vérifiez l’adresse et les coordonnées du destinataire.";
  return raw;
}

export function FoodRestaurantDetail({ restaurantId }: { restaurantId: string }) {
  const router = useRouter();
  const { profile } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [deliveryMode, setDeliveryMode] = useState<"delivery" | "pickup">("delivery");
  const [paymentMethod, setPaymentMethod] = useState<FoodPaymentMethod>("cash");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [recipientName, setRecipientName] = useState(profile?.full_name ?? "");
  const [recipientPhone, setRecipientPhone] = useState(profile?.phone ?? "");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void Promise.all([
      supabase
        .from("restaurants")
        .select("id, name, slug, description, image_url, logo_url, address, cuisine_type, delivery_fee, service_fee, minimum_order, estimated_prep_minutes, rating, review_count, is_open")
        .eq("id", restaurantId)
        .eq("is_active", true)
        .single(),
      supabase
        .from("menu_categories")
        .select("id, name, description, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("menu_items")
        .select("id, restaurant_id, category_id, name, description, price, image_url, is_available, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("sort_order")
    ]).then(([restaurantResult, categoryResult, itemResult]) => {
      setRestaurant((restaurantResult.data as Restaurant | null) ?? null);
      setCategories((categoryResult.data as MenuCategory[] | null) ?? []);
      setItems((itemResult.data as MenuItem[] | null) ?? []);
      setLoading(false);
    });
  }, [restaurantId]);

  useEffect(() => {
    setRecipientName(profile?.full_name ?? "");
    setRecipientPhone(profile?.phone ?? "");
  }, [profile]);

  const cartRows = useMemo<CartRow[]>(
    () => items
      .filter((item) => (cart[item.id] ?? 0) > 0)
      .map((item) => ({ ...item, quantity: cart[item.id] })),
    [cart, items]
  );
  const itemCount = cartRows.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartRows.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = deliveryMode === "delivery" ? restaurant?.delivery_fee ?? 0 : 0;
  const total = subtotal + deliveryFee + (restaurant?.service_fee ?? 0);

  function updateQuantity(itemId: string, delta: number) {
    setCart((current) => {
      const quantity = Math.max(0, Math.min(50, (current[itemId] ?? 0) + delta));
      if (!quantity) {
        const next = { ...current };
        delete next[itemId];
        return next;
      }
      return { ...current, [itemId]: quantity };
    });
  }

  async function locate() {
    setError(null);
    if (!navigator.geolocation) {
      setError("La géolocalisation n’est pas disponible sur cet appareil.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;
        setLat(nextLat);
        setLng(nextLng);
        const response = await fetch(`/api/reverse-geocode?lat=${nextLat}&lng=${nextLng}`);
        const payload = await response.json() as { place?: { address?: string } };
        setAddress(payload.place?.address ?? `${nextLat.toFixed(5)}, ${nextLng.toFixed(5)}`);
      },
      () => setError("Position indisponible. Saisissez votre adresse manuellement."),
      { enableHighAccuracy: true, timeout: 12000 }
    );
  }

  async function order() {
    if (!restaurant || !cartRows.length) return;
    setBusy(true);
    setError(null);
    try {
      const { data, error: orderError } = await supabase.rpc("create_food_order", {
        p_restaurant_id: restaurant.id,
        p_delivery_mode: deliveryMode,
        p_payment_method: paymentMethod,
        p_delivery_address: deliveryMode === "pickup" ? restaurant.address : address,
        p_delivery_lat: deliveryMode === "pickup" ? null : lat,
        p_delivery_lng: deliveryMode === "pickup" ? null : lng,
        p_recipient_name: recipientName,
        p_recipient_phone: recipientPhone,
        p_customer_notes: notes,
        p_items: cartRows.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: null
        }))
      });
      if (orderError) throw orderError;
      router.push(`/food/orders/${data}`);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="food-detail">
          <header
            className="food-restaurant-hero"
            style={restaurant?.image_url ? { backgroundImage: `url("${restaurant.image_url}")` } : undefined}
          >
            <Link href="/restaurants" aria-label="Retour aux restaurants"><ArrowLeft size={20} /></Link>
            {!restaurant?.image_url ? <Store className="hero-placeholder" /> : null}
          </header>

          {loading ? <div className="food-detail-loading">Chargement du menu…</div> : restaurant ? (
            <>
              <div className="food-restaurant-info">
                <div className="food-title-line">
                  <div><p className="eyebrow">{restaurant.cuisine_type || "Cuisine partenaire"}</p><h1>{restaurant.name}</h1></div>
                  <span><Star size={14} fill="currentColor" /> {Number(restaurant.rating).toFixed(1)}</span>
                </div>
                <p>{restaurant.description || "Des plats préparés à la commande et livrés avec le suivi SentraJet."}</p>
                <div className="food-meta">
                  <span><Clock3 /> {restaurant.estimated_prep_minutes + 15}–{restaurant.estimated_prep_minutes + 25} min</span>
                  <span><Bike /> {restaurant.delivery_fee ? formatFare(restaurant.delivery_fee) : "Offerte"}</span>
                  <span><MapPin /> {restaurant.address}</span>
                </div>
              </div>

              {categories.length ? (
                <nav className="food-category-nav">
                  {categories.map((category) => <a key={category.id} href={`#category-${category.id}`}>{category.name}</a>)}
                </nav>
              ) : null}

              <div className="food-menu">
                {(categories.length ? categories : [{ id: "other", name: "Le menu", description: null, sort_order: 0 }]).map((category) => {
                  const categoryItems = items.filter((item) =>
                    category.id === "other" ? !item.category_id || !categories.length : item.category_id === category.id
                  );
                  if (!categoryItems.length) return null;
                  return (
                    <section id={`category-${category.id}`} key={category.id}>
                      <h2>{category.name}</h2>
                      {category.description ? <p>{category.description}</p> : null}
                      <div className="food-item-list">
                        {categoryItems.map((item) => {
                          const quantity = cart[item.id] ?? 0;
                          return (
                            <article className="food-item" key={item.id}>
                              <div>
                                <h3>{item.name}</h3>
                                <p>{item.description || "Préparé à la commande."}</p>
                                <strong>{formatFare(item.price)}</strong>
                              </div>
                              <div className={`food-item-visual ${item.image_url ? "has-image" : ""}`} style={item.image_url ? { backgroundImage: `url("${item.image_url}")` } : undefined}>
                                {!item.image_url ? <ShoppingBag /> : null}
                                {quantity ? (
                                  <div className="quantity-control">
                                    <button type="button" onClick={() => updateQuantity(item.id, -1)}><Minus size={15} /></button>
                                    <strong>{quantity}</strong>
                                    <button type="button" onClick={() => updateQuantity(item.id, 1)}><Plus size={15} /></button>
                                  </div>
                                ) : (
                                  <button className="add-food-item" type="button" onClick={() => updateQuantity(item.id, 1)} aria-label={`Ajouter ${item.name}`}><Plus /></button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>

              {itemCount ? (
                <button className="food-cart-bar" type="button" onClick={() => setCheckout(true)}>
                  <span>{itemCount}</span><strong>Voir mon panier</strong><b>{formatFare(subtotal)}</b>
                </button>
              ) : null}
            </>
          ) : (
            <div className="food-empty"><h2>Restaurant indisponible</h2><Link className="secondary-button" href="/restaurants">Voir les autres restaurants</Link></div>
          )}
        </section>

        {checkout && restaurant ? (
          <div className="food-checkout" role="dialog" aria-modal="true" aria-label="Finaliser la commande">
            <div className="checkout-handle" />
            <header><div><p className="eyebrow">Votre commande</p><h2>Finaliser</h2></div><button type="button" onClick={() => setCheckout(false)}><X /></button></header>

            <div className="delivery-mode">
              <button type="button" className={deliveryMode === "delivery" ? "active" : ""} onClick={() => setDeliveryMode("delivery")}><Bike /> Livraison</button>
              <button type="button" className={deliveryMode === "pickup" ? "active" : ""} onClick={() => setDeliveryMode("pickup")}><Store /> Retrait</button>
            </div>

            <div className="checkout-items">
              {cartRows.map((item) => (
                <div key={item.id}><span>{item.quantity} × {item.name}</span><strong>{formatFare(item.price * item.quantity)}</strong></div>
              ))}
            </div>

            {deliveryMode === "delivery" ? (
              <div className="field">
                <label>Adresse de livraison</label>
                <div className="input-action"><input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Quartier, rue et repère" /><button type="button" onClick={() => void locate()}><LocateFixed /></button></div>
              </div>
            ) : (
              <div className="pickup-note"><Store /><span><strong>Retrait au restaurant</strong><small>{restaurant.address}</small></span></div>
            )}

            <div className="checkout-contact">
              <div className="field"><label>Destinataire</label><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></div>
              <div className="field"><label>Téléphone</label><input type="tel" value={recipientPhone} onChange={(event) => setRecipientPhone(event.target.value)} /></div>
            </div>
            <div className="field"><label>Instructions</label><textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Étage, repère, allergie à signaler…" /></div>

            <div className="field">
              <label>Mode de paiement</label>
              <div className="payment-list">
                {paymentMethods.map((method) => (
                  <button type="button" key={method.value} disabled={!method.enabled} className={paymentMethod === method.value ? "active" : ""} onClick={() => setPaymentMethod(method.value)}>
                    <WalletCards /><span><strong>{method.label}</strong><small>{method.hint}</small></span>{paymentMethod === method.value ? <Check /> : <ChevronRight />}
                  </button>
                ))}
              </div>
            </div>

            <div className="checkout-totals">
              <div><span>Sous-total</span><strong>{formatFare(subtotal)}</strong></div>
              <div><span>{deliveryMode === "delivery" ? "Livraison" : "Retrait"}</span><strong>{deliveryFee ? formatFare(deliveryFee) : "Offert"}</strong></div>
              {restaurant.service_fee ? <div><span>Frais de service</span><strong>{formatFare(restaurant.service_fee)}</strong></div> : null}
              <div className="total"><span>Total</span><strong>{formatFare(total)}</strong></div>
            </div>
            {subtotal < restaurant.minimum_order ? <div className="error">Minimum : {formatFare(restaurant.minimum_order)}.</div> : null}
            {error ? <div className="error">{error}</div> : null}
            <button className="primary-button gold" type="button" disabled={busy || subtotal < restaurant.minimum_order} onClick={() => void order()}>
              {busy ? "Transmission…" : `Commander · ${formatFare(total)}`}
            </button>
          </div>
        ) : null}
      </AppShell>
    </AuthGate>
  );
}
