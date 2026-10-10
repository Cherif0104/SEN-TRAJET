"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Bike, Clock3, MapPin, Search, Star, Store, Utensils } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { formatFare } from "@/lib/fare";
import type { Restaurant } from "@/lib/types";

const cuisineFilters = ["Tous", "Sénégalais", "Grillades", "Fast-food", "International"];

export function FoodMarketplace() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [query, setQuery] = useState("");
  const [cuisine, setCuisine] = useState("Tous");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void supabase
      .from("restaurants")
      .select("id, name, slug, description, image_url, logo_url, address, cuisine_type, delivery_fee, service_fee, minimum_order, estimated_prep_minutes, rating, review_count, is_open")
      .eq("is_active", true)
      .order("rating", { ascending: false })
      .then(({ data }) => {
        setRestaurants((data as Restaurant[] | null) ?? []);
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("fr");
    return restaurants.filter((restaurant) => {
      const matchesText = !needle
        || restaurant.name.toLocaleLowerCase("fr").includes(needle)
        || restaurant.cuisine_type?.toLocaleLowerCase("fr").includes(needle)
        || restaurant.description?.toLocaleLowerCase("fr").includes(needle);
      const matchesCuisine = cuisine === "Tous"
        || restaurant.cuisine_type?.toLocaleLowerCase("fr").includes(cuisine.toLocaleLowerCase("fr"));
      return matchesText && matchesCuisine;
    });
  }, [cuisine, query, restaurants]);

  return (
    <AuthGate role="client">
      <AppShell>
        <section className="food-marketplace">
          <div className="food-topbar">
            <Link href="/app" aria-label="Retour"><ArrowLeft size={20} /></Link>
            <div><p className="eyebrow">SentraJet Food</p><h1>À table, sans attendre.</h1></div>
          </div>

          <div className="food-location">
            <span><MapPin size={18} /></span>
            <div><small>Livrer à</small><strong>Ma position actuelle</strong></div>
            <ArrowRight size={18} />
          </div>

          <label className="food-search">
            <Search size={19} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Restaurant, plat ou cuisine…" />
          </label>

          <div className="food-cuisines" aria-label="Filtrer par cuisine">
            {cuisineFilters.map((item) => (
              <button key={item} className={cuisine === item ? "active" : ""} type="button" onClick={() => setCuisine(item)}>
                {item}
              </button>
            ))}
          </div>

          <div className="food-promise">
            <div><Bike /></div>
            <span><strong>Livraison suivie en direct</strong><small>Le délai et le coût sont connus avant validation.</small></span>
          </div>

          <div className="food-section-heading">
            <div><p className="eyebrow">Près de vous</p><h2>Restaurants disponibles</h2></div>
            <span>{filtered.length}</span>
          </div>

          {loading ? (
            <div className="food-skeleton-grid">
              <div /><div />
            </div>
          ) : filtered.length ? (
            <div className="restaurant-grid">
              {filtered.map((restaurant, index) => (
                <Link href={`/restaurants/${restaurant.id}`} className="restaurant-card" key={restaurant.id}>
                  <div
                    className="restaurant-cover"
                    style={restaurant.image_url ? { backgroundImage: `url("${restaurant.image_url}")` } : undefined}
                  >
                    {!restaurant.image_url ? <Utensils /> : null}
                    <span className={restaurant.is_open ? "open" : "closed"}>{restaurant.is_open ? "Ouvert" : "Fermé"}</span>
                    {index === 0 ? <em>Populaire</em> : null}
                  </div>
                  <div className="restaurant-card-body">
                    <div><h3>{restaurant.name}</h3><span><Star size={13} fill="currentColor" /> {Number(restaurant.rating).toFixed(1)}</span></div>
                    <p>{restaurant.cuisine_type || "Cuisine variée"} · {restaurant.address}</p>
                    <footer>
                      <span><Clock3 size={14} /> {restaurant.estimated_prep_minutes + 15}–{restaurant.estimated_prep_minutes + 25} min</span>
                      <strong>{restaurant.delivery_fee ? formatFare(restaurant.delivery_fee) : "Livraison offerte"}</strong>
                    </footer>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="food-empty">
              <span><Store /></span>
              <h2>{restaurants.length ? "Aucun résultat" : "Les premières cuisines arrivent"}</h2>
              <p>{restaurants.length ? "Essayez un autre plat ou retirez un filtre." : "Les partenaires validés apparaîtront ici avec leurs menus et délais réels."}</p>
              {restaurants.length ? <button className="secondary-button" type="button" onClick={() => { setQuery(""); setCuisine("Tous"); }}>Effacer les filtres</button> : null}
            </div>
          )}
        </section>
      </AppShell>
    </AuthGate>
  );
}
