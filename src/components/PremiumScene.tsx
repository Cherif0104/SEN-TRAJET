type PremiumSceneProps = {
  scene: "ride" | "airport" | "delivery";
};

export function PremiumScene({ scene }: PremiumSceneProps) {
  if (scene === "airport") {
    return (
      <svg className="premium-scene" viewBox="0 0 390 300" role="img" aria-label="Transfert premium vers l’aéroport">
        <defs>
          <linearGradient id="airport-sky" x1="0" y1="0" x2="0" y2="1">
            <stop stopColor="#DCE7F0" />
            <stop offset="1" stopColor="#F8F4EB" />
          </linearGradient>
          <linearGradient id="airport-car" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#22272B" />
            <stop offset=".55" stopColor="#050607" />
            <stop offset="1" stopColor="#33383C" />
          </linearGradient>
        </defs>
        <rect width="390" height="300" fill="url(#airport-sky)" />
        <circle cx="325" cy="48" r="28" fill="#F3C75E" opacity=".35" />
        <path d="m216 56 103-30 15 7-43 22 31 17-12 4-45-12-31 15-12-5 27-20-33 5Z" fill="#7D8891" />
        <path d="M0 178 89 127h162l139 55v118H0Z" fill="#C8CDD0" />
        <path d="M30 165h298v19H30z" fill="#F7F7F4" />
        <path d="M61 135h43v30H61zm56 0h43v30h-43zm56 0h43v30h-43zm56 0h43v30h-43z" fill="#88A0AE" />
        <path d="M0 227h390v73H0z" fill="#697078" />
        <path d="M15 264h65m34 0h65m34 0h65m34 0h65" stroke="white" strokeWidth="6" strokeDasharray="34 18" />
        <g transform="translate(112 184)">
          <path d="m11 52 20-35C37 7 48 2 60 2h79c13 0 24 6 31 17l18 29c13 3 20 11 20 23v24H0V70c0-9 4-14 11-18Z" fill="url(#airport-car)" />
          <path d="m48 18-17 31h66V17H59c-4 0-8 0-11 1Zm61-1v32h58l-16-24c-4-6-10-8-18-8Z" fill="#9BB5C5" />
          <path d="M21 66h169" stroke="#C58A26" strokeWidth="3" />
          <circle cx="43" cy="91" r="17" fill="#111" stroke="#91989B" strokeWidth="5" />
          <circle cx="166" cy="91" r="17" fill="#111" stroke="#91989B" strokeWidth="5" />
        </g>
      </svg>
    );
  }

  if (scene === "delivery") {
    return (
      <svg className="premium-scene" viewBox="0 0 390 300" role="img" aria-label="Livraison express suivie en direct">
        <defs>
          <linearGradient id="delivery-bg" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#111820" />
            <stop offset="1" stopColor="#263441" />
          </linearGradient>
        </defs>
        <rect width="390" height="300" fill="url(#delivery-bg)" />
        <circle cx="80" cy="74" r="104" fill="#C58A26" opacity=".16" />
        <path d="M0 219 100 149l56 36 90-70 144 91v94H0Z" fill="#34434C" />
        <path d="m-20 293 144-105 69 30 87-64 132 91" stroke="#F5F2EA" strokeWidth="25" opacity=".9" />
        <path d="m-20 293 144-105 69 30 87-64 132 91" stroke="#C58A26" strokeWidth="3" strokeDasharray="15 15" />
        <g transform="translate(117 110)">
          <circle cx="33" cy="105" r="30" fill="#080A0C" stroke="#AEB4B7" strokeWidth="6" />
          <circle cx="137" cy="105" r="30" fill="#080A0C" stroke="#AEB4B7" strokeWidth="6" />
          <path d="M32 105 67 62h45l27 43M67 62l-18-35h31" stroke="#E6B74E" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M72 22h58v51H72z" fill="#C58A26" />
          <path d="M101 22v51" stroke="#F7DD9A" strokeWidth="3" />
          <circle cx="78" cy="26" r="18" fill="#D6A644" />
          <path d="M68 17c3-13 18-18 26-8 3 4 4 8 3 12l-29-4Z" fill="#F0F2F4" />
        </g>
      </svg>
    );
  }

  return (
    <svg className="premium-scene" viewBox="0 0 390 300" role="img" aria-label="Course SentraJet suivie en temps réel">
      <defs>
        <linearGradient id="ride-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#F5E3AF" />
          <stop offset=".45" stopColor="#D3A342" />
          <stop offset="1" stopColor="#8D5D19" />
        </linearGradient>
        <linearGradient id="ride-car" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#30373D" />
          <stop offset=".55" stopColor="#07090A" />
          <stop offset="1" stopColor="#252A2E" />
        </linearGradient>
      </defs>
      <rect width="390" height="300" fill="url(#ride-bg)" />
      <circle cx="52" cy="42" r="82" fill="white" opacity=".12" />
      <path d="M0 202 71 155l71 37 95-76 153 88v96H0Z" fill="#7B684C" opacity=".42" />
      <path d="M-20 301 79 204l77 37 92-74 162 100" stroke="#171A1D" strokeWidth="56" />
      <path d="M-20 301 79 204l77 37 92-74 162 100" stroke="white" strokeWidth="4" strokeDasharray="24 19" />
      <g transform="translate(75 129)">
        <path d="m12 66 25-42C44 11 57 5 73 5h87c17 0 31 7 40 21l22 36c16 4 24 13 24 28v27H0V87c0-11 4-17 12-21Z" fill="url(#ride-car)" />
        <path d="m58 25-21 37h74V24H72c-6 0-10 0-14 1Zm68-1v38h72l-19-29c-5-7-13-9-23-9Z" fill="#AEC6D2" />
        <path d="M25 81h197" stroke="#E8B84D" strokeWidth="3" />
        <circle cx="52" cy="113" r="20" fill="#090B0D" stroke="#989FA3" strokeWidth="6" />
        <circle cx="193" cy="113" r="20" fill="#090B0D" stroke="#989FA3" strokeWidth="6" />
      </g>
      <g transform="translate(27 26)">
        <rect width="142" height="48" rx="17" fill="#070A0D" opacity=".9" />
        <circle cx="25" cy="24" r="8" fill="#38B77A" />
        <text x="44" y="21" fill="white" fontSize="12" fontWeight="700">Chauffeur trouvé</text>
        <text x="44" y="36" fill="#E6B74E" fontSize="11">Arrivée dans 4 min</text>
      </g>
    </svg>
  );
}
