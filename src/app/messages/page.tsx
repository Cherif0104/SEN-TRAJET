"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/hooks/useAuth";
import { getBookingsWithLastMessage } from "@/lib/messages";
import type { BookingWithLastMessage } from "@/lib/messages";
import { MessageCircle } from "lucide-react";

export default function MessagesPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithLastMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    getBookingsWithLastMessage(user.id)
      .then(setBookings)
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading || !user) {
    if (!authLoading && !user) {
      window.location.href = "/connexion?next=/messages";
      return null;
    }
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
          <div className="animate-pulse space-y-3">
            <div className="h-8 w-48 rounded bg-neutral-200" />
            <div className="h-20 rounded-xl bg-neutral-200" />
            <div className="h-20 rounded-xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6">
        <h1 className="text-xl font-bold text-neutral-900">Messages</h1>
        <p className="mt-1 text-neutral-600">
          Conversations liées à vos réservations.
        </p>

        {loading ? (
          <div className="mt-6 animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-neutral-200" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="mt-6 py-12 text-center">
            <MessageCircle className="mx-auto h-12 w-12 text-neutral-400" />
            <p className="mt-3 text-neutral-600">Aucune conversation</p>
            <p className="mt-1 text-sm text-neutral-500">
              Les échanges avec les chauffeurs apparaîtront ici après une réservation.
            </p>
            <Link href="/recherche" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Trouver un trajet
            </Link>
          </Card>
        ) : (
          <ul className="mt-6 space-y-2">
            {bookings.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/messages/${b.id}`}
                  className="block rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-900 truncate">
                        {b.other_party_name}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-neutral-500">
                        {b.last_message_body || "Aucun message"}
                      </p>
                    </div>
                    {b.last_message_at && (
                      <span className="ml-2 shrink-0 text-xs text-neutral-400">
                        {new Date(b.last_message_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
