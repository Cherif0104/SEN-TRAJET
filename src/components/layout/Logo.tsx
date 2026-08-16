"use client";

import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
  variant?: "default" | "light";
}

export function Logo({
  className = "",
  showIcon = true,
  variant = "default",
}: LogoProps) {
  const source =
    variant === "light"
      ? "/brand/sentrajet-wordmark-light.svg"
      : "/brand/sentrajet-wordmark.svg";

  return (
    <Link
      href="/"
      className={`inline-flex items-center no-underline ${className}`}
      aria-label="SentraJet Premium - Accueil"
    >
      <Image
        src={source}
        alt="SentraJet Premium"
        width={showIcon ? 186 : 150}
        height={showIcon ? 45 : 36}
        priority
        unoptimized
        className={showIcon ? "h-10 w-auto" : "h-8 w-auto"}
      />
    </Link>
  );
}
