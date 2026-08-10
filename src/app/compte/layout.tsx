"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, CalendarCheck, User, PlusCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PremiumShell } from "@/components/sentrajet/PremiumShell";

const nav = [
  { href: "/compte", label: "Accueil", icon: LayoutDashboard },
  { href: "/compte/reserver", label: "Réserver", icon: PlusCircle },
  { href: "/compte/reservations", label: "Mes réservations", icon: CalendarCheck },
  { href: "/compte/profil", label: "Mon profil", icon: User },
];

export default function CompteLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/connexion?next=" + encodeURIComponent(pathname));
        return;
      }
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
      let role = profile?.role as string | undefined;
      if (!role) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id).limit(1);
        role = roles?.[0]?.role as string | undefined;
      }
      if (role && role !== "client") {
        router.replace("/");
      }
    })();
  }, [pathname, router]);

  return (
    <PremiumShell title="Client" subtitle="Espace voyageur" nav={nav}>
      {children}
    </PremiumShell>
  );
}
