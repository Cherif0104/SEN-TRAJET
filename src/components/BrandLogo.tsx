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
      viewBox="0 0 96 112"
      fill="none"
    >
      <defs>
        <linearGradient id="sentrajet-gold" x1="12" y1="7" x2="82" y2="101" gradientUnits="userSpaceOnUse">
          <stop stopColor="#9A6418" />
          <stop offset=".28" stopColor="#F5D376" />
          <stop offset=".58" stopColor="#C58A26" />
          <stop offset="1" stopColor="#F3C75E" />
        </linearGradient>
      </defs>
      <path
        d="M48 4C24.8 4 6 22.8 6 46c0 12.7 5.6 24.1 14.6 31.8l14.3-10.4A23.4 23.4 0 0 1 24.5 48c0-13 10.5-23.5 23.5-23.5S71.5 35 71.5 48c0 3.9-1 7.6-2.6 10.8L42.8 78.1 48 108c3.9-4.6 42-49.9 42-62C90 22.8 71.2 4 48 4Z"
        fill="url(#sentrajet-gold)"
      />
      <path
        d="M12 79.2c22.6-17.7 47-28.3 79-32.2-26.5 12.5-45.7 28-65.3 51.6L12 79.2Z"
        fill="#050505"
      />
      <path d="m27 80.6 9.5-5.8 5.1 2.7-10.2 6.7-4.4-3.6Zm17.9-10.4 10.5-4.9 4.2 2-10.7 5.5-4-2.6Zm18.9-8.3 9.2-3.1 3.1 1.2-9.4 3.6-2.9-1.7Z" fill="white" />
    </svg>
  );
}

export function BrandLogo({ compact = false, inverse = false, className = "" }: BrandLogoProps) {
  return (
    <div className={`brand-logo ${compact ? "compact" : ""} ${inverse ? "inverse" : ""} ${className}`.trim()}>
      <BrandMark size={compact ? 34 : 50} />
      <div className="brand-lockup">
        <div className="brand-word">
          <span>SENTRA</span><b>JET</b>
        </div>
        <div className="brand-premium">PREMIUM</div>
      </div>
    </div>
  );
}
