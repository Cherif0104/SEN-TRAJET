"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User } from "@supabase/supabase-js";

export type Profile = {
  id: string;
  role:
    | "client"
    | "driver"
    | "admin"
    | "partner"
    | "super_admin"
    | "commercial"
    | "trainer"
    | "regional_manager"
    | "partner_manager"
    | "partner_operator"
    | "rental_owner";
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
};

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (error || !data) {
      setProfile(null);
      return null;
    }
    const nextProfile = data as Profile;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function initSession() {
      const {
        data: { session: initial },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      let session = initial;
      let nextUser = initial?.user ?? null;

      // Rafraîchit le JWT ; si le refresh token est révoqué / absent, déconnexion locale propre.
      if (nextUser) {
        const { data: userData, error } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error || !userData.user) {
          await supabase.auth.signOut({ scope: "local" });
          session = null;
          nextUser = null;
        } else {
          nextUser = userData.user;
          const {
            data: { session: afterRefresh },
          } = await supabase.auth.getSession();
          if (!cancelled && afterRefresh) session = afterRefresh;
        }
      }

      if (cancelled) return;
      setSession(session);
      setUser(nextUser);
      setProfile(null);
      if (nextUser) void fetchProfile(nextUser.id);
      setLoading(false);
    }

    void initSession().catch(() => {
      if (!cancelled) setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setProfile(null);
      if (s?.user) void fetchProfile(s.user.id);
      else setProfile(null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  return { session, user, profile, loading, signOut, refreshProfile: () => user && fetchProfile(user.id) };
}
