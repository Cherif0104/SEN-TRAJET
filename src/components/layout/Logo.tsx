"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { MapPin } from "lucide-react";

interface LogoProps {
  className?: string;
  showIcon?: boolean;
}

export function Logo({ className = "", showIcon = true }: LogoProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      href="/"
      className={`inline-flex items-center no-underline ${className}`}
      aria-label="SEN TRAJET - Accueil"
    >
      {showIcon &&
        (imgError ? (
          <>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
              <MapPin className="h-5 w-5" strokeWidth={2.5} />
            </span>
            <span className="ml-2 font-bold tracking-tight text-neutral-900 text-lg">
              <span className="text-primary-dark">SEN</span>{" "}
              <span className="text-secondary">TRAJET</span>
            </span>
          </>
        ) : (
          <span className="relative flex h-10 w-auto min-w-[140px] max-w-[200px] items-center sm:min-w-[160px] sm:max-w-[220px]">
            <Image
              src="/logo-sen-trajet.png"
              alt="SEN TRAJET"
              width={200}
              height={40}
              className="h-10 w-auto object-contain object-left"
              style={{ width: "auto", height: "2.5rem" }}
              sizes="(max-width: 640px) 140px, 200px"
              priority
              onError={() => setImgError(true)}
            />
          </span>
        ))}
      {!showIcon && (
        <span className="font-bold text-neutral-900 text-lg tracking-tight">
          <span className="text-primary-dark">SEN</span>{" "}
          <span className="text-secondary">TRAJET</span>
        </span>
      )}
    </Link>
  );
}
