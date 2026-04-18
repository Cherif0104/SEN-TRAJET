import Link from "next/link";
import { Logo } from "./Logo";

const footerLinks = [
  { label: "Comment ça marche", href: "/comment-ca-marche" },
  { label: "FAQ", href: "/faq" },
  { label: "CGU", href: "/cgu" },
  { label: "Confidentialité", href: "/confidentialite" },
  { label: "Nous contacter", href: "/contact" },
];

export function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-zinc-950 text-zinc-400">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <Logo className="[&_span]:text-white [&_.text-primary-dark]:text-emerald-400 [&_.text-secondary]:text-emerald-400" />
          <nav className="flex flex-wrap gap-x-6 gap-y-2">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-8 border-t border-zinc-800 pt-6 text-xs leading-relaxed text-zinc-500 sm:text-sm">
          <p>
            © {new Date().getFullYear()} SEN TRAJET —{" "}
            <a
              href="https://impulcia-afrique.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline-offset-2 hover:text-white hover:underline"
            >
              Impulcia Afrique
            </a>
            . Fondateur : Chérif Aidara Naing.
          </p>
        </div>
      </div>
    </footer>
  );
}
