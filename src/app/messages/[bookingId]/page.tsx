"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ChatBox } from "@/components/messages/ChatBox";
import { supabase } from "@/lib/supabase";

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.bookingId as string;
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || !bookingId) {
      setAllowed(false);
      return;
    }
    supabase
      .from("bookings")
      .select("id, client_id, driver_id")
      .eq("id", bookingId)
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          setAllowed(false);
          return;
        }
        const isParticipant =
          data.client_id === user.id || data.driver_id === user.id;
        setAllowed(isParticipant);
      });
  }, [user, bookingId]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/connexion?next=/messages/" + bookingId);
    }
  }, [authLoading, user, router, bookingId]);

  if (authLoading || allowed === null) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-32 rounded bg-neutral-200" />
            <div className="h-64 rounded-xl bg-neutral-200" />
          </div>
        </main>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
          <p className="text-neutral-600">Vous n’avez pas accès à cette conversation.</p>
          <Link href="/messages" className="mt-4 inline-block text-primary hover:underline">
            Retour aux messages
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:px-6">
        <Link
          href="/messages"
          className="mb-4 inline-flex items-center gap-2 text-sm text-neutral-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux messages
        </Link>
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <ChatBox bookingId={bookingId} currentUserId={user!.id} />
        </div>
      </main>
    </div>
  );
}
