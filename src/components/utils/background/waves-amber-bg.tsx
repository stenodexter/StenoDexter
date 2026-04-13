"use client";
import { useEffect, useRef } from "react";

const WAVES = [
  { y: 0.55, amp: 38, speed: 0.0008, phase: 0,   color: "rgba(245,158,11,0.14)", len: 0.7  },
  { y: 0.62, amp: 30, speed: 0.0012, phase: 2.1, color: "rgba(245,158,11,0.09)", len: 0.9  },
  { y: 0.70, amp: 24, speed: 0.0006, phase: 4.2, color: "rgba(245,158,11,0.07)", len: 0.6  },
  { y: 0.80, amp: 40, speed: 0.0010, phase: 1.0, color: "rgba(217,119,6,0.11)",  len: 0.8  },
  { y: 0.88, amp: 28, speed: 0.0014, phase: 3.3, color: "rgba(217,119,6,0.08)",  len: 1.0  },
  { y: 0.30, amp: 20, speed: 0.0007, phase: 0.5, color: "rgba(245,158,11,0.06)", len: 1.1  },
  { y: 0.20, amp: 16, speed: 0.0009, phase: 2.8, color: "rgba(180,83,9,0.07)",   len: 0.75 },
];

export function WavesBgAmber() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const W = canvas.width, H = canvas.height;
      ctx.clearRect(0, 0, W, H);
      const t = performance.now();
      for (const w of WAVES) {
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const freq = (2 * Math.PI * w.len) / W;
          const y = w.y * H + Math.sin(x * freq + t * w.speed + w.phase) * w.amp;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.lineTo(0, H);
        ctx.closePath();
        ctx.fillStyle = w.color;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={ref} className="absolute inset-0 h-full w-full" />;
}