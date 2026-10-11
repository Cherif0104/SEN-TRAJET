"use client";

type BrandLogoProps = {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
};

export function BrandMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 112 96"
      fill="none"
    >
      <defs>
        <linearGradient id="sentrajet-green" x1="16" y1="6" x2="88" y2="88" gradientUnits="userSpaceOnUse">
          <stop stopColor="#0B6B65" />
          <stop offset="1" stopColor="#034B3D" />
        </linearGradient>
        <linearGradient id="sentrajet-amber" x1="49" y1="12" x2="96" y2="64" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFCE32" />
          <stop offset="1" stopColor="#F2A900" />
        </linearGradient>
      </defs>
      <path
        d="M31 8h68L87 27H47c-8 0-12 3-12 8 0 4 3 7 10 9l25 7c16 5 23 13 23 25 0 8-3 14-8 20H13l12-20h45c6 0 9-2 9-6 0-3-3-6-9-8l-27-8C28 50 20 41 20 29c0-8 4-15 11-21Z"
        fill="url(#sentrajet-green)"
      />
      <path
        d="M54 8h45L87 27H67L54 8Zm16 43 25 7-14 17-30-9 19-15Z"
        fill="url(#sentrajet-amber)"
      />
      <path d="M5 53h27l-4 6H2l3-6Zm-3 12h29l-4 6H0l2-6Zm8 12h23l-4 6H7l3-6Z" fill="#F2B544" />
    </svg>
  );
}

export function BrandLogo({ compact = false, inverse = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`brand-logo ${compact ? "compact" : ""} ${inverse ? "inverse" : ""} ${className}`.trim()}>
      <BrandMark size={compact ? 34 : 50} />
      <div className="brand-lockup">
        <div className="brand-word"><span>Sentra</span><b>Jet</b></div>
        <div className="brand-premium">Chaque trajet, la bonne solution.</div>
      </div>
    </div>
  );
}
