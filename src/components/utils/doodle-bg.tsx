// ~/components/utils/doodle-bg.tsx

export function DoodleBg({
  stroke = "#1e40af",
  opacity = 0.25,
  tileSize = 200,
}: {
  stroke?: string;
  opacity?: number;
  tileSize?: number;
}) {
  const s = stroke;
  const sw = 1.8;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="pointer-events-none absolute inset-0 h-full w-full z-10"
      style={{ opacity }}
    >
      <defs>
        {/* Each tile is tileSize x tileSize, icons scaled down inside */}
        <pattern
          id="doodle-tile"
          x="0"
          y="0"
          width={tileSize}
          height={tileSize}
          patternUnits="userSpaceOnUse"
        >
          {/* PENCIL — top left */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(10,10) rotate(-20) scale(0.85)"
          >
            <rect x="1" y="2" width="8" height="20" rx="1" />
            <polygon points="1,22 9,22 5,30" />
            <line x1="1" y1="6" x2="9" y2="6" />
          </g>

          {/* COFFEE — top right */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(130,15) rotate(15) scale(0.9)"
          >
            <path d="M4 8 L20 8 L18 28 Q18 30 12 30 Q6 30 6 28Z" />
            <path d="M20 12 Q27 12 27 18 Q27 24 20 24" />
            <path d="M7 2 Q7 0 9 2 Q9 4 11 2 Q11 0 13 2" />
          </g>

          {/* MOUSE — mid left */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(8,110) rotate(10) scale(0.85)"
          >
            <rect x="0" y="0" width="20" height="30" rx="10" />
            <line x1="10" y1="0" x2="10" y2="13" />
            <line x1="0" y1="13" x2="20" y2="13" />
            <circle cx="10" cy="7" r="2.5" />
          </g>

          {/* KEYBOARD — center */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(60,95) rotate(-8) scale(0.75)"
          >
            <rect x="0" y="0" width="44" height="26" rx="3" />
            <rect x="3" y="3" width="6" height="5" rx="1" />
            <rect x="12" y="3" width="6" height="5" rx="1" />
            <rect x="21" y="3" width="6" height="5" rx="1" />
            <rect x="30" y="3" width="6" height="5" rx="1" />
            <rect x="3" y="11" width="6" height="5" rx="1" />
            <rect x="12" y="11" width="6" height="5" rx="1" />
            <rect x="21" y="11" width="6" height="5" rx="1" />
            <rect x="30" y="11" width="6" height="5" rx="1" />
            <rect x="8" y="19" width="28" height="4" rx="2" />
          </g>

          {/* HEADPHONES — right mid */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(148,105) rotate(-12) scale(0.75)"
          >
            <path d="M4 20 Q4 4 16 4 Q28 4 28 20" />
            <rect x="0" y="18" width="8" height="12" rx="4" />
            <rect x="24" y="18" width="8" height="12" rx="4" />
          </g>

          {/* TIMER — bottom left */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(20,195) rotate(18) scale(0.85)"
          >
            <circle cx="14" cy="18" r="12" />
            <line x1="14" y1="6" x2="14" y2="12" />
            <line x1="14" y1="12" x2="19" y2="16" />
            <circle cx="14" cy="18" r="1.5" />
            <line x1="10" y1="2" x2="18" y2="2" />
          </g>

          {/* ERASER — bottom center */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(80,210) rotate(-15) scale(0.75)"
          >
            <rect x="0" y="0" width="34" height="16" rx="3" />
            <rect x="0" y="0" width="15" height="16" rx="3" />
            <line x1="15" y1="0" x2="15" y2="16" />
          </g>

          {/* STUDENT — bottom right */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(148,190) rotate(8) scale(0.8)"
          >
            <circle cx="14" cy="7" r="6" />
            <polygon points="14,0 24,4 14,8 4,4" />
            <line x1="24" y1="4" x2="24" y2="10" />
            <circle cx="24" cy="10" r="1.5" />
            <path d="M6 36 Q6 20 14 20 Q22 20 22 36" />
            <rect x="2" y="22" width="10" height="7" rx="1" />
          </g>

          {/* PC — top center */}
          <g
            fill="none"
            stroke={s}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            transform="translate(65,10) rotate(5) scale(0.72)"
          >
            <rect x="0" y="0" width="44" height="30" rx="3" />
            <rect x="3" y="3" width="38" height="24" rx="1" />
            <line x1="22" y1="30" x2="22" y2="38" />
            <line x1="12" y1="38" x2="32" y2="38" />
          </g>

          {/* dots */}
          <circle cx="55" cy="70" r="2" fill={s} />
          <circle cx="140" cy="75" r="2.5" fill={s} />
          <circle cx="100" cy="170" r="2" fill={s} />
          <circle cx="30" cy="165" r="1.8" fill={s} />
          <circle cx="170" cy="160" r="2" fill={s} />
        </pattern>
      </defs>

      {/* Fill entire SVG canvas with the repeating pattern */}
      <rect width="100%" height="100%" fill="url(#doodle-tile)" />
    </svg>
  );
}