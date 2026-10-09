"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CarFront } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import type { UserRole } from "@/lib/types";

export function AuthGate({
  children,
  role
}: {
  children: React.ReactNode;
  role?: UserRole;
}) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role && profile && profile.role !== role && profile.role !== "admin") {
      router.replace(profile.role === "driver" ? "/driver" : "/app");
    }
  }, [loading, profile, role, router, user]);

  if (loading || !user || !profile || (role && profile.role !== role && profile.role !== "admin")) {
    return (
      <main className="mobile-screen" style={{ background: "var(--ink)", color: "white", display: "grid", placeItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <CarFront color="var(--gold)" size={42} />
          <p style={{ color: "#aeb9c8" }}>Chargement de votre espace…</p>
        </div>
      </main>
    );
  }

  return children;
}
