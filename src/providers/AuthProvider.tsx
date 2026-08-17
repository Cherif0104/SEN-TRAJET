"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
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
    | "asset_partner"
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

function normalizedAppRole(user: User): Profile["role"] | null {
  const raw = user.app_metadata?.app_role;
  if (typeof raw !== "string") return null;
  if (["manager", "ops", "finance", "rh", "fleet_manager"].includes(raw)) {
    return "admin";
  }
  if (raw === "provider") return "partner";
  if (raw === "asset_partner") return "asset_partner";
  const supported: Profile["role"][] = [
    "client",
    "driver",
    "admin",
    "partner",
    "super_admin",
    "commercial",
    "trainer",
    "regional_manager",
    "partner_manager",
    "partner_operator",
    "rental_owner",
    "vehicle_owner",
    "owner",
  ];
  return supported.includes(raw as Profile["role"])
    ? (raw as Profile["role"])
    : null;
}

function fallbackProfile(user: User): Profile | null {
  const role = normalizedAppRole(user);
  if (!role) return null;
  return {
    id: user.id,
    role,
    full_name:
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "",
    phone:
      typeof user.user_metadata?.phone === "string"
        ? user.user_metadata.phone
        : null,
    avatar_url: null,
    city: null,
    is_verified: false,
    average_rating: 0,
    total_reviews: 0,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const profileRef = useRef<Profile | null>(null);

  const storeProfile = useCallback((nextProfile: Profile | null) => {
    profileRef.current = nextProfile;
    setProfile(nextProfile);
  }, []);

  const fetchProfile = useCallback(async (authUser: User) => {
    const userId = authUser.id;
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    let role = (data as { role?: string } | null)?.role ?? null;
    if (!role) {
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .limit(5);
      if (rolesError) {
        const fallback = profileRef.current ?? fallbackProfile(authUser);
        if (fallback) storeProfile(fallback);
        return fallback;
      }
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
      const fallback = profileRef.current ?? fallbackProfile(authUser);
      if (fallback) storeProfile(fallback);
      return fallback;
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
    storeProfile(nextProfile);
    return nextProfile;
  }, [storeProfile]);

  const synchronizeSession = useCallback(
    async (
      nextSession: Session | null,
      event: AuthChangeEvent | "BOOTSTRAP",
    ) => {
      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        storeProfile(null);
        return;
      }

      let verifiedSession = nextSession;
      let nextUser = nextSession.user;

      if (event === "BOOTSTRAP") {
        const { data, error } = await supabase.auth.getUser();
        // Une panne réseau/PostgREST ne doit jamais détruire une session locale
        // encore renouvelable. Supabase émettra SIGNED_OUT si le refresh token
        // est réellement invalide.
        if (!error && data.user) {
          nextUser = data.user;
          const current = await supabase.auth.getSession();
          verifiedSession = current.data.session ?? nextSession;
        }
      }

      setSession(verifiedSession);
      setUser(nextUser);
      const existing = profileRef.current;
      const shouldRefreshProfile =
        !existing ||
        existing.id !== nextUser.id ||
        event === "USER_UPDATED";
      if (shouldRefreshProfile) await fetchProfile(nextUser);
    },
    [fetchProfile, storeProfile]
  );

  useEffect(() => {
    let cancelled = false;

    const initialize = async () => {
      try {
        const {
          data: { session: initial },
        } = await supabase.auth.getSession();
        if (cancelled) return;
        await synchronizeSession(initial, "BOOTSTRAP");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "INITIAL_SESSION") return;
      const needsProfile =
        Boolean(nextSession?.user) &&
        (!profileRef.current ||
          profileRef.current.id !== nextSession?.user.id);
      if (needsProfile) setLoading(true);
      void synchronizeSession(nextSession, event).finally(() => {
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
    storeProfile(null);
  }, [storeProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      loading,
      signOut,
      refreshProfile: () => (user ? fetchProfile(user) : null),
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
