/**
 * Golden-hour highway scene for the homepage hero — an original, layered SVG
 * (no stock photo): dusk sky with a low sun, rolling green hills receding to a
 * hazy horizon, and a road curving into the distance. Sits behind the hero copy
 * and search widget, under a dark gradient scrim for legibility.
 */
export function HeroScene({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 1440 620"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="hs-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1c36" />
          <stop offset="42%" stopColor="#274063" />
          <stop offset="70%" stopColor="#8a6b53" />
          <stop offset="88%" stopColor="#d99b53" />
          <stop offset="100%" stopColor="#f0b968" />
        </linearGradient>
        <radialGradient id="hs-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff2d2" />
          <stop offset="35%" stopColor="#ffd98a" />
          <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hs-hill-far" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3f6a63" />
          <stop offset="100%" stopColor="#355a54" />
        </linearGradient>
        <linearGradient id="hs-hill-mid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2c5248" />
          <stop offset="100%" stopColor="#214038" />
        </linearGradient>
        <linearGradient id="hs-hill-near" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#193a30" />
          <stop offset="100%" stopColor="#102a22" />
        </linearGradient>
        <linearGradient id="hs-road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9ad7a" />
          <stop offset="100%" stopColor="#35312b" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect width="1440" height="620" fill="url(#hs-sky)" />
      {/* Sun + glow */}
      <circle cx="1010" cy="300" r="230" fill="url(#hs-sun)" />
      <circle cx="1010" cy="306" r="52" fill="#fff4da" />

      {/* Haze band at the horizon */}
      <rect x="0" y="300" width="1440" height="90" fill="#f0b968" opacity="0.18" />

      {/* Far hills */}
      <path
        d="M0 352 C 240 316, 430 352, 700 336 C 980 320, 1180 356, 1440 332 L1440 620 L0 620 Z"
        fill="url(#hs-hill-far)"
        opacity="0.9"
      />
      {/* Mid hills */}
      <path
        d="M0 404 C 300 372, 520 410, 820 392 C 1080 378, 1260 414, 1440 396 L1440 620 L0 620 Z"
        fill="url(#hs-hill-mid)"
      />
      {/* Road ribbon curving to the horizon */}
      <path
        d="M690 356 C 700 430, 560 500, 300 620 L 700 620 C 760 500, 742 430, 726 356 Z"
        fill="url(#hs-road)"
      />
      <path
        d="M708 360 C 712 436, 650 512, 520 620"
        fill="none"
        stroke="#f4e3b2"
        strokeWidth="4"
        strokeDasharray="10 20"
        opacity="0.8"
      />
      {/* Near hills (foreground) */}
      <path
        d="M0 470 C 230 442, 360 486, 560 500 L560 620 L0 620 Z"
        fill="url(#hs-hill-near)"
      />
      <path
        d="M1440 452 C 1180 430, 980 484, 720 512 L1440 620 Z"
        fill="url(#hs-hill-near)"
      />
    </svg>
  );
}
