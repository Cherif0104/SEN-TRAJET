"use client";

import Link from "next/link";
import { Logo } from "./Logo";
import { usePreferences } from "@/providers/PreferencesProvider";

const footerLinks = [
  { label: "nav.book" as const, href: "/reserver" },
  { label: "nav.mobileApp" as const, href: "/application-mobile" },
  { label: "nav.help" as const, href: "/faq" },
  { label: "nav.terms" as const, href: "/cgu" },
  { label: "nav.privacy" as const, href: "/confidentialite" },
  { label: "nav.contact" as const, href: "/contact" },
  { label: "nav.partner" as const, href: "/partenaire" },
];

export function Footer() {
  const { t } = usePreferences();

  return (
    <footer className="border-t border-neutral-800 bg-[#07111f] text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <Logo variant="light" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-400 transition hover:text-[#f0c86b]"
              >
                {t(link.label)}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-zinc-800 pt-6 text-xs leading-relaxed text-zinc-500 sm:text-sm">
          <p>
            © {new Date().getFullYear()} {t("footer.copyright")}{" "}
            <a
              href="https://impulcia-afrique.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline-offset-2 hover:text-white hover:underline"
            >
              Impulcia Afrique
            </a>
            {" "}{t("footer.founder")}
          </p>
        </div>
      </div>
    </footer>
  );
}
