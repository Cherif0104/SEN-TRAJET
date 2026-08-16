"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

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
    | "rental_owner"
    | "vehicle_owner"
    | "owner";
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  is_verified: boolean;
  average_rating: number;
  total_reviews: number;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null> | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    let role = (data as { role?: string } | null)?.role ?? null;
    if (!role) {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(5);
      const raw = roles?.[0]?.role as string | undefined;
      if (
        raw === "manager" ||
        raw === "ops" ||
        raw === "finance" ||
        raw === "rh" ||
        raw === "fleet_manager"
      ) {
        role = "admin";
      } else if (raw === "provider") {
        role = "partner";
      } else if (raw) {
        role = raw;
      }
    }

    if ((error && error.code !== "PGRST116") || (!data && !role)) {
      setProfile(null);
      return null;
    }

    const nextProfile = {
      id: userId,
      role: (role ?? "client") as Profile["role"],
      full_name: (data as { full_name?: string } | null)?.full_name ?? "",
      phone: (data as { phone?: string | null } | null)?.phone ?? null,
      avatar_url: (data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
      city: (data as { city?: string | null } | null)?.city ?? null,
      is_verified: Boolean((data as { is_verified?: boolean } | null)?.is_verified),
      average_rating: Number(
        (data as { average_rating?: number } | null)?.average_rating ?? 0
      ),
      total_reviews: Number(
        (data as { total_reviews?: number } | null)?.total_reviews ?? 0
      ),
    } satisfies Profile;
    setProfile(nextProfile);
    return nextProfile;
  }, []);

  const synchronizeSession = useCallback(
    async (nextSession: Session | null, validateUser: boolean) => {
      let verifiedSession = nextSession;
      let nextUser = nextSession?.user ?? null;

      if (nextUser && validateUser) {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          await supabase.auth.signOut({ scope: "local" });
          verifiedSession = null;
          nextUser = null;
        } else {
          nextUser = data.user;
          const current = await supabase.auth.getSession();
          verifiedSession = current.data.session ?? nextSession;
        }
      }

      setSession(verifiedSession);
      setUser(nextUser);
      setProfile(null);
      if (nextUser) await fetchProfile(nextUser.id);
    },
    [fetchProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const {
          data: { session: initial },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        await synchronizeSession(initial, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      void synchronizeSession(nextSession, false).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [synchronizeSession]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signOut,
      refreshProfile: () => (user ? fetchProfile(user.id) : null),
    }),
    [fetchProfile, loading, profile, session, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
