"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarClock, CarFront, Clock3, Plane, Route, User } from "lucide-react";
import { SjBadge } from "@/components/sentrajet/PremiumShell";
import { useAuth } from "@/hooks/useAuth";
import {
  BOOKING_STATUS_LABEL,
  bookingStatusTone,
  ensureClientForUser,
  listPlatformBookings,
  type PlatformBooking,
} from "@/lib/platformOps";

export default function ComptePage() {
  const { user, profile } = useAuth();
  const [rows, setRows] = useState<PlatformBooking[]>([]);

  useEffect(() => {
    void (async () => {
      if (!user) return;
      try {
        const clientId = await ensureClientForUser({
          userId: user.id,
          fullName: profile?.full_name,
          phone: profile?.phone,
          email: user.email,
        });
        const all = await listPlatformBookings();
        setRows(all.filter((b) => b.client_id === clientId));
      } catch {
        setRows([]);
      }
    })();
  }, [user, profile]);

  const upcoming = rows.filter((b) => !["terminee", "annulee"].includes(b.status));
  return (
    <div className="mx-auto max-w-lg pb-8">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <p className="sj-eyebrow">Taxi Aéroport Sénégal</p>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white">
            Bonjour{profile?.full_name ? ` ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-[#91a0b5]">Où souhaitez-vous aller ?</p>
        </div>
        <Link href="/compte/profil" className="grid h-12 w-12 place-items-center rounded-2xl bg-[#132238] text-[#f0c86b]">
          <User className="h-5 w-5" />
        </Link>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <Link
          href="/taxi-aeroport"
          className="col-span-2 overflow-hidden rounded-[26px] bg-gradient-to-br from-[#f0c86b] to-[#b77c24] p-5 text-[#07111f] shadow-xl"
        >
          <div className="flex items-start justify-between">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#07111f] text-[#f0c86b]">
              <Plane className="h-6 w-6" />
            </div>
            <span className="rounded-full bg-black/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider">
              AIBD
            </span>
          </div>
          <h2 className="mt-7 font-display text-2xl font-extrabold">Trouver un taxi</h2>
          <p className="mt-1 text-sm font-semibold text-[#07111f]/70">Maintenant ou sur réservation</p>
        </Link>

        <Link href="/taxi-aeroport" className="min-h-40 rounded-[24px] border border-[#22344b] bg-[#0d1a2b] p-4 text-white">
          <Clock3 className="h-6 w-6 text-[#f0c86b]" />
          <h3 className="mt-8 font-display text-lg font-extrabold">Maintenant</h3>
          <p className="mt-1 text-xs text-[#91a0b5]">Recherche immédiate</p>
        </Link>
        <Link href="/taxi-aeroport" className="min-h-40 rounded-[24px] border border-[#22344b] bg-[#132238] p-4 text-white">
          <CalendarClock className="h-6 w-6 text-[#f0c86b]" />
          <h3 className="mt-8 font-display text-lg font-extrabold">Planifier</h3>
          <p className="mt-1 text-xs text-[#91a0b5]">Date et heure choisies</p>
        </Link>
        <Link
          href="/compte/reservations"
          className="col-span-2 flex items-center gap-4 rounded-[24px] border border-[#22344b] bg-[#0d1a2b] p-4 text-white"
        >
          <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#132238] text-[#f0c86b]">
            <Route className="h-6 w-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-display font-extrabold">Mes trajets</h3>
            <p className="mt-1 text-xs text-[#91a0b5]">
              {upcoming.length ? `${upcoming.length} réservation(s) à venir` : "Aucun trajet à venir"}
            </p>
          </div>
          <CarFront className="h-5 w-5 text-[#91a0b5]" />
        </Link>
      </div>

      {upcoming[0] ? (
        <section className="mt-5 rounded-[24px] border border-[#22344b] bg-[#0d1a2b] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-[#91a0b5]">Prochain trajet</p>
              <p className="mt-2 truncate font-bold text-white">
                {upcoming[0].pickup} → {upcoming[0].dropoff}
              </p>
              <p className="mt-1 text-xs text-[#91a0b5]">
                {new Date(upcoming[0].pickup_time).toLocaleString("fr-FR")}
              </p>
            </div>
            <SjBadge tone={bookingStatusTone(upcoming[0].status)}>
              {BOOKING_STATUS_LABEL[upcoming[0].status] ?? upcoming[0].status}
            </SjBadge>
          </div>
        </section>
      ) : null}
    </div>
  );
}
