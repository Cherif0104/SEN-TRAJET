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
    supabase.auth
      .getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setUser(s?.user ?? null);
        setProfile(null);
        if (s?.user) void fetchProfile(s.user.id);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
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

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  return { session, user, profile, loading, signOut, refreshProfile: () => user && fetchProfile(user.id) };
}
