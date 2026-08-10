"use client";

import Link from "next/link";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
}

export function Logo({ className = "", showIcon = true }: LogoProps) {
  return (
    <Link
      href="/"
      className={`inline-flex items-center no-underline ${className}`}
      aria-label="SentraJet Premium - Accueil"
    >
      {showIcon ? (
        <span className="inline-flex items-center gap-2">
          <span
            className="grid h-10 w-10 place-items-center rounded-[13px] text-sm font-black text-neutral-900"
            style={{ background: "linear-gradient(145deg,#f0c86b,#9b681b)" }}
          >
            SJ
          </span>
          <span className="leading-tight">
            <span className="block text-lg font-extrabold tracking-tight text-neutral-900">
              SENTRA<span style={{ color: "#d5a64a" }}>JET</span>
            </span>
            <span className="block text-[10px] font-semibold tracking-[0.28em]" style={{ color: "#b77c24" }}>
              PREMIUM
            </span>
          </span>
        </span>
      ) : (
        <span className="text-lg font-extrabold tracking-tight text-neutral-900">
          SENTRA<span style={{ color: "#d5a64a" }}>JET</span>
        </span>
      )}
    </Link>
  );
}
