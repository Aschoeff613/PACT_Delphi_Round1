"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
  gravity: number;
};

type Burst = {
  x: number;
  y: number;
  particles: Particle[];
};

const COLORS = [
  "#f87171", "#fb923c", "#facc15", "#4ade80",
  "#60a5fa", "#a78bfa", "#f472b6", "#ffffff",
];

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

function createBurst(x: number, y: number): Burst {
  const count = Math.floor(randomBetween(40, 70));
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + randomBetween(-0.2, 0.2);
    const speed = randomBetween(1.5, 5);
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alpha: 1,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      radius: randomBetween(1.5, 3),
      gravity: randomBetween(0.05, 0.1),
    });
  }
  return { x, y, particles };
}

export function SectionCompleteBanner() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function resize() {
      if (!canvas) return;
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    const launchSchedule = [
      { delay: 200, x: 0.2, y: 0.35 },
      { delay: 500, x: 0.8, y: 0.3 },
      { delay: 900, x: 0.5, y: 0.25 },
      { delay: 1300, x: 0.35, y: 0.4 },
      { delay: 1700, x: 0.65, y: 0.35 },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const { delay, x, y } of launchSchedule) {
      const t = setTimeout(() => {
        const canvas = canvasRef.current;
        if (canvas) {
          burstsRef.current.push(createBurst(canvas.width * x, canvas.height * y));
        }
      }, delay);
      timers.push(t);
    }

    function tick() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      burstsRef.current = burstsRef.current.filter((burst) => burst.particles.some((p) => p.alpha > 0.02));

      for (const burst of burstsRef.current) {
        for (const p of burst.particles) {
          if (p.alpha <= 0.02) continue;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          p.x += p.vx;
          p.y += p.vy;
          p.vy += p.gravity;
          p.vx *= 0.98;
          p.alpha -= 0.018;
          p.radius *= 0.995;
        }
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("resize", resize);
      timers.forEach(clearTimeout);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="completion-celebration">
      <canvas ref={canvasRef} className="fireworks-canvas" />
      <div className="completion-celebration-content">
        <div className="completion-celebration-emoji">🎉</div>
        <h2>Congrats on finishing this section!</h2>
        <p>Thanks for your participation! Stay tuned for upcoming edits and further sections.</p>
      </div>
    </div>
  );
}
