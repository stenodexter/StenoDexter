// ~/components/utils/doodle-bg.tsx
import React, { memo } from "react";

type Props = {
  stroke?: string;
  opacity?: number;
  tileSize?: number;
  className?: string;
};

type IconProps = {
  x: number;
  y: number;
  s?: number;
  r?: number;
};

// ---------------- ICONS (15) ----------------

const Book = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M4 5h8a3 3 0 0 1 3 3v11H7a3 3 0 0 0-3 3z" />
    <path d="M20 5h-8a3 3 0 0 0-3 3v11h8a3 3 0 0 1 3 3z" />
  </g>
);

const Pencil = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M3 21l3-1 11-11-2-2L4 18l-1 3z" />
  </g>
);

const Calculator = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
  </g>
);

const Clock = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </g>
);

const Cap = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M2 10l10-5 10 5-10 5z" />
    <path d="M6 12v5c3 2 9 2 12 0v-5" />
  </g>
);

const Clipboard = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x="6" y="4" width="12" height="16" rx="2" />
    <path d="M9 2h6v4H9z" />
  </g>
);

const Target = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="2" />
  </g>
);

const Lightbulb = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M12 2a6 6 0 0 1 6 6c0 2-1 3-2 4s-1 2-1 3H9c0-1 0-2-1-3S6 10 6 8a6 6 0 0 1 6-6z" />
    <path d="M9 18h6M10 22h4" />
  </g>
);

const Pen = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M3 21l3-1 12-12-2-2L4 18l-1 3z" />
  </g>
);

const Ruler = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x="3" y="3" width="18" height="6" rx="1" />
  </g>
);

const Notebook = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M8 6h8M8 10h8M8 14h6" />
  </g>
);

const Graph = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M3 17l5-5 4 4 6-8" />
  </g>
);

const Paperclip = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M12 4l-6 6a4 4 0 1 0 5.7 5.7l7-7" />
  </g>
);

const Timer = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <circle cx="12" cy="14" r="8" />
    <path d="M12 14l3-3" />
  </g>
);

const Bookmark = ({ x, y, s = 1, r = 0 }: IconProps) => (
  <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
    <path d="M6 2h12v20l-6-4-6 4z" />
  </g>
);

// ---------------- COMPONENT ----------------

export const DoodleBg = memo(function DoodleBg({
  stroke = "#334155",
  opacity = 0.06,
  tileSize = 360,
  className = "",
}: Props) {
  const T = tileSize;

  const icons = [
    Book,
    Pencil,
    Calculator,
    Clock,
    Cap,
    Clipboard,
    Target,
    Lightbulb,
    Pen,
    Ruler,
    Notebook,
    Graph,
    Paperclip,
    Timer,
    Bookmark,
  ];

  return (
    <svg
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
      style={{ opacity }}
    >
      <defs>
        <pattern
          id="study-pattern"
          width={T}
          height={T}
          patternUnits="userSpaceOnUse"
        >
          <g
            fill="none"
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {icons.map((Icon, i) => {
              const col = i % 5;
              const row = Math.floor(i / 5);

              const x = col * (T / 5) + 20;
              const y = row * (T / 3) + 30;

              const rotation = i % 2 === 0 ? -8 : 8;

              return <Icon key={i} x={x} y={y} s={0.9} r={rotation} />;
            })}
          </g>
        </pattern>
      </defs>

      <rect width="100%" height="100%" fill="url(#study-pattern)" />
    </svg>
  );
});
